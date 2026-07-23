import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { CuidaInterpretService } from '../../../../core/services/cuida-interpret.service';
import { SEX_LABELS } from '../../../../core/models/types';

type EnCategory = 'BAJO' | 'NORMAL' | 'ALTO';

export interface CuidaManualScoring {
  source: 'TEA_MANUAL';
  escalas: {
    altruismo: number; apertura: number; asertividad: number;
    autoestima: number; resolverProblemas: number; empatia: number;
    equilibrioEmocional: number; independencia: number; flexibilidad: number;
    reflexividad: number; sociabilidad: number; toleranciaFrustracion: number;
    vinculosAfectivos: number; resolucionDuelo: number;
  };
  cuidado: {
    cuidadoResponsable: number; cuidadoAfectivo: number;
    sensibilidad: number; agresividad: number;
  };
  deseabilidadSocial: number;
  indices: {
    invalidez: { pd: number; en: EnCategory };
    inconsistencia: { pd: number; en: EnCategory };
  };
  itemsCriticosTea: Array<{ itemNumber: number; response: number }>;
  baremo: string;
  enteredAt: string;
  warnings: string[];
}

@Component({
  selector: 'app-cuida-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cuida-entry.component.html',
  styleUrl: './cuida-entry.component.scss',
})
export class CuidaScoringEntryComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';

  session: any = null;
  subject: any = null;

  form!: FormGroup;
  showConfirm = false;
  loading = true;
  saving = false;
  savingPhase = '';
  error = '';
  isEditMode = false;

  // Abreviaturas alineadas con el perfil de resultados de TEACorrige (CUIDA v4)
  // para facilitar la transcripción sin errores.
  readonly ESCALAS_PERSONALIDAD = [
    { key: 'altruismo', label: 'Altruismo', abbr: 'Al' },
    { key: 'apertura', label: 'Apertura', abbr: 'Ap' },
    { key: 'asertividad', label: 'Asertividad', abbr: 'As' },
    { key: 'autoestima', label: 'Autoestima', abbr: 'At' },
    { key: 'resolverProblemas', label: 'Capacidad de resolver problemas', abbr: 'Rp' },
    { key: 'empatia', label: 'Empatía', abbr: 'Em' },
    { key: 'equilibrioEmocional', label: 'Equilibrio emocional', abbr: 'Ee' },
    { key: 'independencia', label: 'Independencia', abbr: 'In' },
    { key: 'flexibilidad', label: 'Flexibilidad', abbr: 'Fl' },
    { key: 'reflexividad', label: 'Reflexividad', abbr: 'Rf' },
    { key: 'sociabilidad', label: 'Sociabilidad', abbr: 'Sc' },
    { key: 'toleranciaFrustracion', label: 'Tolerancia a la frustración', abbr: 'Tf' },
    { key: 'vinculosAfectivos', label: 'Cap. de establecer vínculos afectivos o de apego', abbr: 'Ag' },
    { key: 'resolucionDuelo', label: 'Capacidad de resolución del duelo', abbr: 'Dl' },
  ] as const;

  readonly ESCALAS_CUIDADO = [
    { key: 'cuidadoResponsable', label: 'Cuidado responsable', abbr: 'Cre' },
    { key: 'cuidadoAfectivo', label: 'Cuidado afectivo', abbr: 'Caf' },
    { key: 'sensibilidad', label: 'Sensibilidad hacia los demás', abbr: 'Sen' },
    { key: 'agresividad', label: 'Agresividad', abbr: 'Agr' },
  ] as const;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private cuidaInterpretService: CuidaInterpretService,
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    this.sessionId = this.route.snapshot.params['sessionId'];
    this.buildForm();
    await this.loadData();
  }

  private buildForm() {
    const en19 = () => [null, [Validators.required, Validators.min(1), Validators.max(9)]];
    const pd = () => [null, [Validators.required, Validators.min(0)]];

    this.form = this.fb.group({
      baremo: ['Ecuador, población general, mujeres y varones', Validators.required],
      escalas: this.fb.group({
        altruismo: en19(), apertura: en19(), asertividad: en19(),
        autoestima: en19(), resolverProblemas: en19(), empatia: en19(),
        equilibrioEmocional: en19(), independencia: en19(), flexibilidad: en19(),
        reflexividad: en19(), sociabilidad: en19(), toleranciaFrustracion: en19(),
        vinculosAfectivos: en19(), resolucionDuelo: en19(),
      }),
      cuidado: this.fb.group({
        cuidadoResponsable: en19(), cuidadoAfectivo: en19(),
        sensibilidad: en19(), agresividad: en19(),
      }),
      deseabilidadSocial: en19(),
      indices: this.fb.group({
        invalidez: this.fb.group({
          pd: pd(),
          en: [null, Validators.required],
        }),
        inconsistencia: this.fb.group({
          pd: pd(),
          en: [null, Validators.required],
        }),
      }),
      itemsCriticosTea: this.fb.array([]),
    });
  }

  get itemsCriticosTea(): FormArray {
    return this.form.get('itemsCriticosTea') as FormArray;
  }

  addItemCritico() {
    this.itemsCriticosTea.push(
      this.fb.group({
        itemNumber: [null, [Validators.required, Validators.min(1), Validators.max(189)]],
        response: [null, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeItemCritico(i: number) {
    this.itemsCriticosTea.removeAt(i);
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';
      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }

      this.subject = await this.subjectService.getById(this.session.subjectId);

      const existingScoring = await this.assessmentService.getScoring(this.sessionId);
      if (existingScoring?.source === 'TEA' && existingScoring?.scores) {
        this.isEditMode = true;
        try {
          const raw =
            typeof existingScoring.scores === 'string'
              ? JSON.parse(existingScoring.scores)
              : existingScoring.scores;
          // Si ya es CuidaFindings, extraer manualScoring
          const manual: CuidaManualScoring =
            raw.source === 'TEA_MANUAL' ? raw : raw.manualScoring;
          if (manual) this.prefillForm(manual);
        } catch { /* scoring corrompido — iniciar vacío */ }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  private prefillForm(scoring: CuidaManualScoring) {
    this.form.patchValue({
      baremo: scoring.baremo,
      escalas: scoring.escalas,
      cuidado: scoring.cuidado,
      deseabilidadSocial: scoring.deseabilidadSocial,
      indices: scoring.indices,
    });

    const arr = this.itemsCriticosTea;
    arr.clear();
    for (const item of scoring.itemsCriticosTea ?? []) {
      arr.push(this.fb.group({
        itemNumber: [item.itemNumber, [Validators.required, Validators.min(1), Validators.max(189)]],
        response: [item.response, [Validators.required, Validators.min(0)]],
      }));
    }
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

  cancelConfirm() {
    this.showConfirm = false;
  }

  async save() {
    if (this.form.invalid) return;
    try {
      this.saving = true;
      this.error = '';

      const v = this.form.value;
      const scoring: CuidaManualScoring = {
        source: 'TEA_MANUAL',
        escalas: v.escalas,
        cuidado: v.cuidado,
        deseabilidadSocial: Number(v.deseabilidadSocial),
        indices: {
          invalidez: { pd: Number(v.indices.invalidez.pd), en: v.indices.invalidez.en },
          inconsistencia: { pd: Number(v.indices.inconsistencia.pd), en: v.indices.inconsistencia.en },
        },
        itemsCriticosTea: (v.itemsCriticosTea as any[]).map((ic) => ({
          itemNumber: Number(ic.itemNumber),
          response: Number(ic.response),
        })),
        baremo: v.baremo,
        enteredAt: new Date().toISOString(),
        warnings: [],
      };

      // Paso 1: guardar transcripción manual
      this.savingPhase = 'Guardando transcripción...';
      await this.assessmentService.saveCuidaScoring(this.sessionId, scoring);

      // Paso 2: invocar Lambda de interpretación (no bloqueante para la navegación)
      this.savingPhase = 'Calculando interpretación...';
      try {
        await this.cuidaInterpretService.interpret(this.sessionId);
      } catch (interpretErr: any) {
        console.warn('[cuida-entry] Lambda interpret error (non-fatal):', interpretErr);
      }

      this.router.navigate([
        '/cases', this.caseId,
        'subjects', this.subjectId,
        'assessments', this.sessionId, 'results-cuida',
      ]);
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
      this.showConfirm = false;
    } finally {
      this.saving = false;
      this.savingPhase = '';
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

  isFieldInvalid(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  goBack() {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'assessments', this.sessionId, 'cuida-pending',
    ]);
  }
}
