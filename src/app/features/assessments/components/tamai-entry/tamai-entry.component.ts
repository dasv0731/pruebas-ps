import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { SEX_LABELS } from '../../../../core/models/types';

import {
  TamaiLevel,
  TamaiSex,
  BaremoOption,
  TamaiLevelConfig,
  baremosForSex,
  deriveLevelFromAge,
} from './tamai-level-config';
import { TAMAI_LEVEL_REGISTRY, SUPPORTED_LEVELS } from './tamai-level-registry';
import { TAMAIManualScoring, TamaiScore } from './tamai-entry.types';

import { TamaiSectionBlockComponent } from './sections/tamai-section-block.component';
import { TamaiBaremoSelectComponent } from './sections/tamai-baremo-select.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

export type { TAMAIManualScoring, TamaiScore } from './tamai-entry.types';

@Component({
  selector: 'app-tamai-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TamaiSectionBlockComponent,
    TamaiBaremoSelectComponent,
    SkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './tamai-entry.component.html',
  styleUrl: './tamai-entry.component.scss',
})
export class TamaiEntryComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';
  session: any = null;
  subject: any = null;

  form!: FormGroup;
  config: TamaiLevelConfig | null = null;
  baremoOptions: BaremoOption[] = [];

  isEditMode = false;
  loading = true;
  saving = false;
  showConfirm = false;
  error = '';
  unsupportedLevel = '';

  readonly supportedLevels = SUPPORTED_LEVELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    this.sessionId = this.route.snapshot.params['sessionId'];
    await this.loadData();
  }

  private buildForm(level: TamaiLevel) {
    const cfg = TAMAI_LEVEL_REGISTRY[level];
    if (!cfg) {
      this.unsupportedLevel = level;
      return;
    }
    this.config = cfg;

    const escalas: Record<string, FormGroup> = {};
    for (const code of cfg.allCodes) {
      escalas[code] = this.fb.group({
        pd: [null, Validators.required],
        pc: [null, Validators.required],
      });
    }

    this.form = this.fb.group({
      level: [level, Validators.required],
      baremo: [null, Validators.required],
      escalas: this.fb.group(escalas),
    });

    this.refreshBaremoOptions();
    this.form.get('level')!.valueChanges.subscribe((newLevel: TamaiLevel) => {
      const newCfg = TAMAI_LEVEL_REGISTRY[newLevel];
      if (!newCfg) {
        this.unsupportedLevel = newLevel;
        return;
      }
      if (newLevel === this.config?.level) {
        this.refreshBaremoOptions();
        return;
      }
      this.buildForm(newLevel);
    });
  }

  private refreshBaremoOptions() {
    if (!this.config) return;
    const sex = this.session?.subjectSex as TamaiSex | undefined;
    this.baremoOptions = baremosForSex(this.config.baremos, sex);

    const ctrl = this.form.get('baremo')!;
    const current = ctrl.value;
    const stillValid = this.baremoOptions.some((o) => o.code === current);
    if (!stillValid) {
      const auto = this.baremoOptions.length === 1 ? this.baremoOptions[0].code : null;
      ctrl.setValue(auto, { emitEvent: false });
    }
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';
      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);

      const defaultLevel = deriveLevelFromAge(this.session.subjectAgeYears);
      const startingLevel: TamaiLevel = TAMAI_LEVEL_REGISTRY[defaultLevel] ? defaultLevel : 'I';

      this.buildForm(startingLevel);

      const existing = await this.assessmentService.getScoring(this.sessionId);
      if (existing?.scores) {
        try {
          const raw = typeof existing.scores === 'string' ? JSON.parse(existing.scores) : existing.scores;
          if (raw?.source === 'TEA_MANUAL_TAMAI') {
            const savedLevel: TamaiLevel = raw.level ?? 'I';
            if (!TAMAI_LEVEL_REGISTRY[savedLevel]) {
              this.error = `Esta evaluación se guardó con Nivel ${savedLevel}, todavía no soportado.`;
              return;
            }
            if (savedLevel !== this.config?.level) {
              this.buildForm(savedLevel);
            }
            this.isEditMode = true;
            this.prefillForm(raw as TAMAIManualScoring);
          }
        } catch { /* shape antiguo o corrupto: form vacío */ }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  private prefillForm(s: TAMAIManualScoring) {
    if (!this.config) return;
    this.form.get('level')!.setValue(s.level, { emitEvent: false });
    this.refreshBaremoOptions();
    this.form.get('baremo')!.setValue(s.baremo, { emitEvent: false });

    const escalasGroup = this.form.get('escalas') as FormGroup;
    for (const code of this.config.allCodes) {
      const score = s.escalas?.[code];
      if (score) {
        const g = escalasGroup.get(code) as FormGroup;
        g.patchValue({ pd: score.pd, pc: score.pc }, { emitEvent: false });
      }
    }
  }

  get baremoControl(): FormControl {
    return this.form.get('baremo') as FormControl;
  }

  get escalasGroup(): FormGroup {
    return this.form.get('escalas') as FormGroup;
  }

  requestConfirm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Complete todos los campos requeridos antes de continuar.';
      return;
    }
    this.error = '';
    this.showConfirm = true;
  }

  cancelConfirm() { this.showConfirm = false; }

  async save() {
    if (this.form.invalid || !this.config) return;
    try {
      this.saving = true;
      this.error = '';

      const v = this.form.value;
      const escalasGroup = this.form.get('escalas') as FormGroup;
      const escalas: Record<string, TamaiScore> = {};
      for (const code of this.config.allCodes) {
        const g = escalasGroup.get(code)!.value;
        escalas[code] = { pd: Number(g.pd), pc: Number(g.pc) };
      }

      const scoring: TAMAIManualScoring = {
        source: 'TEA_MANUAL_TAMAI',
        level: v.level,
        baremo: v.baremo,
        enteredAt: new Date().toISOString(),
        escalas,
      };

      await this.assessmentService.saveTAMAIScoring(this.sessionId, scoring);
      this.router.navigate([
        '/cases', this.caseId,
        'subjects', this.subjectId,
        'assessments', this.sessionId, 'results-tamai',
      ]);
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
      this.showConfirm = false;
    } finally {
      this.saving = false;
    }
  }

  getSubjectFullName(): string {
    return `${this.subject?.firstName || ''} ${this.subject?.lastName || ''}`.trim() || 'Evaluado';
  }

  getSexLabel(): string {
    const sex = this.session?.subjectSex;
    if (!sex) return 'No registrado';
    return SEX_LABELS[sex as 'MALE' | 'FEMALE'] || sex;
  }

  goBack() {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'assessments', this.sessionId, 'tamai-pending',
    ]);
  }
}
