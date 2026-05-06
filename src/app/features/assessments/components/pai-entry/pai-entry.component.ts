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
import { SEX_LABELS } from '../../../../core/models/types';

import { PAIManualScoring, PAIItem, PAIItemResponse } from './pai-entry.types';
import { PaiSectionValidezComponent } from './sections/pai-section-validez.component';
import { PaiSectionClinicasComponent } from './sections/pai-section-clinicas.component';
import { PaiSectionTratamientoComponent } from './sections/pai-section-tratamiento.component';
import { PaiSectionInterpersonalesComponent } from './sections/pai-section-interpersonales.component';
import { PaiSectionIndicesComponent } from './sections/pai-section-indices.component';
import { PaiItemsListComponent } from './sections/pai-items-list.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

export type { PAIManualScoring, PAIScore, PAITOnly, PAIItem, PAIItemResponse } from './pai-entry.types';

const reqd = () => [null, [Validators.required]];
const reqdT = () => [null, [Validators.required]];

@Component({
  selector: 'app-pai-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaiSectionValidezComponent,
    PaiSectionClinicasComponent,
    PaiSectionTratamientoComponent,
    PaiSectionInterpersonalesComponent,
    PaiSectionIndicesComponent,
    PaiItemsListComponent,
    SkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './pai-entry.component.html',
  styleUrl: './pai-entry.component.scss',
})
export class PaiEntryComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';
  session: any = null;
  subject: any = null;

  form!: FormGroup;
  isEditMode = false;
  loading = true;
  saving = false;
  showConfirm = false;
  error = '';

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
    this.buildForm();
    await this.loadData();
  }

  private pdt(): FormGroup {
    return this.fb.group({ pd: reqd(), t: reqd() });
  }

  private tOnly(): FormGroup {
    return this.fb.group({ t: reqdT() });
  }

  private buildForm() {
    this.form = this.fb.group({
      baremo: ['Población general adulta española', Validators.required],

      validez: this.fb.group({
        INC: this.pdt(), INF: this.pdt(), IMN: this.pdt(), IMP: this.pdt(),
      }),

      clinicas: this.fb.group({
        SOM: this.pdt(), SOM_C: this.pdt(), SOM_S: this.pdt(), SOM_H: this.pdt(),
        ANS: this.pdt(), ANS_C: this.pdt(), ANS_E: this.pdt(), ANS_F: this.pdt(),
        TRA: this.pdt(), TRA_O: this.pdt(), TRA_F: this.pdt(), TRA_E: this.pdt(),
        DEP: this.pdt(), DEP_C: this.pdt(), DEP_E: this.pdt(), DEP_F: this.pdt(),
        MAN: this.pdt(), MAN_A: this.pdt(), MAN_G: this.pdt(), MAN_I: this.pdt(),
        PAR: this.pdt(), PAR_H: this.pdt(), PAR_P: this.pdt(), PAR_R: this.pdt(),
        ESQ: this.pdt(), ESQ_P: this.pdt(), ESQ_S: this.pdt(), ESQ_A: this.pdt(),
        LIM: this.pdt(), LIM_E: this.pdt(), LIM_I: this.pdt(), LIM_P: this.pdt(), LIM_A: this.pdt(),
        ANT: this.pdt(), ANT_A: this.pdt(), ANT_E: this.pdt(), ANT_B: this.pdt(),
        ALC: this.pdt(),
        DRG: this.pdt(),
      }),

      tratamiento: this.fb.group({
        AGR: this.pdt(), AGR_A: this.pdt(), AGR_V: this.pdt(), AGR_F: this.pdt(),
        SUI: this.pdt(),
        EST: this.pdt(),
        FAS: this.pdt(),
        RTR: this.pdt(),
      }),

      interpersonales: this.fb.group({
        DOM: this.pdt(),
        AFA: this.pdt(),
      }),

      indices: this.fb.group({
        INC_F: this.pdt(),
        SIM: this.pdt(),
        FDR: this.pdt(),
        DEF: this.pdt(),
        FDC: this.pdt(),
        IPS: this.pdt(),
        IPV: this.pdt(),
        IDT: this.pdt(),
        ALC_Est: this.tOnly(),
        DRO_Est: this.tOnly(),
      }),

      itemsCriticos: this.fb.array([]),
      idiosincrasicos: this.fb.array([]),
    });
  }

  get validezGroup(): FormGroup { return this.form.get('validez') as FormGroup; }
  get clinicasGroup(): FormGroup { return this.form.get('clinicas') as FormGroup; }
  get tratamientoGroup(): FormGroup { return this.form.get('tratamiento') as FormGroup; }
  get interpersonalesGroup(): FormGroup { return this.form.get('interpersonales') as FormGroup; }
  get indicesGroup(): FormGroup { return this.form.get('indices') as FormGroup; }
  get itemsCriticosArr(): FormArray { return this.form.get('itemsCriticos') as FormArray; }
  get idiosincrasicosArr(): FormArray { return this.form.get('idiosincrasicos') as FormArray; }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';
      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);

      const existing = await this.assessmentService.getScoring(this.sessionId);
      if (existing?.scores) {
        try {
          const raw = typeof existing.scores === 'string' ? JSON.parse(existing.scores) : existing.scores;
          if (raw?.source === 'TEA_MANUAL_PAI') {
            this.isEditMode = true;
            this.prefillForm(raw as PAIManualScoring);
          }
        } catch { /* shape antiguo o corrupto: dejar form vacío */ }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  private prefillForm(s: PAIManualScoring) {
    this.form.patchValue({
      baremo: s.baremo,
      validez: s.validez,
      clinicas: s.clinicas,
      tratamiento: s.tratamiento,
      interpersonales: s.interpersonales,
      indices: s.indices,
    });

    this.itemsCriticosArr.clear();
    for (const it of s.itemsCriticos ?? []) {
      this.itemsCriticosArr.push(this.fb.group({
        itemNumber: [it.itemNumber, [Validators.required, Validators.min(1), Validators.max(344)]],
        response: [it.response, [Validators.required, Validators.min(0), Validators.max(3)]],
      }));
    }
    this.idiosincrasicosArr.clear();
    for (const it of s.idiosincrasicos ?? []) {
      this.idiosincrasicosArr.push(this.fb.group({
        itemNumber: [it.itemNumber, [Validators.required, Validators.min(1), Validators.max(344)]],
        response: [it.response, [Validators.required, Validators.min(0), Validators.max(3)]],
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

  cancelConfirm() { this.showConfirm = false; }

  async save() {
    if (this.form.invalid) return;
    try {
      this.saving = true;
      this.error = '';

      const v = this.form.value;
      const num = (x: any) => Number(x);
      const pdt = (g: any) => ({ pd: num(g.pd), t: num(g.t) });
      const tOnly = (g: any) => ({ t: num(g.t) });
      const items = (arr: any[]): PAIItem[] => arr.map((it) => ({
        itemNumber: num(it.itemNumber),
        response: num(it.response) as PAIItemResponse,
      }));

      const scoring: PAIManualScoring = {
        source: 'TEA_MANUAL_PAI',
        baremo: v.baremo,
        enteredAt: new Date().toISOString(),

        validez: {
          INC: pdt(v.validez.INC), INF: pdt(v.validez.INF),
          IMN: pdt(v.validez.IMN), IMP: pdt(v.validez.IMP),
        },

        clinicas: {
          SOM: pdt(v.clinicas.SOM), SOM_C: pdt(v.clinicas.SOM_C), SOM_S: pdt(v.clinicas.SOM_S), SOM_H: pdt(v.clinicas.SOM_H),
          ANS: pdt(v.clinicas.ANS), ANS_C: pdt(v.clinicas.ANS_C), ANS_E: pdt(v.clinicas.ANS_E), ANS_F: pdt(v.clinicas.ANS_F),
          TRA: pdt(v.clinicas.TRA), TRA_O: pdt(v.clinicas.TRA_O), TRA_F: pdt(v.clinicas.TRA_F), TRA_E: pdt(v.clinicas.TRA_E),
          DEP: pdt(v.clinicas.DEP), DEP_C: pdt(v.clinicas.DEP_C), DEP_E: pdt(v.clinicas.DEP_E), DEP_F: pdt(v.clinicas.DEP_F),
          MAN: pdt(v.clinicas.MAN), MAN_A: pdt(v.clinicas.MAN_A), MAN_G: pdt(v.clinicas.MAN_G), MAN_I: pdt(v.clinicas.MAN_I),
          PAR: pdt(v.clinicas.PAR), PAR_H: pdt(v.clinicas.PAR_H), PAR_P: pdt(v.clinicas.PAR_P), PAR_R: pdt(v.clinicas.PAR_R),
          ESQ: pdt(v.clinicas.ESQ), ESQ_P: pdt(v.clinicas.ESQ_P), ESQ_S: pdt(v.clinicas.ESQ_S), ESQ_A: pdt(v.clinicas.ESQ_A),
          LIM: pdt(v.clinicas.LIM), LIM_E: pdt(v.clinicas.LIM_E), LIM_I: pdt(v.clinicas.LIM_I), LIM_P: pdt(v.clinicas.LIM_P), LIM_A: pdt(v.clinicas.LIM_A),
          ANT: pdt(v.clinicas.ANT), ANT_A: pdt(v.clinicas.ANT_A), ANT_E: pdt(v.clinicas.ANT_E), ANT_B: pdt(v.clinicas.ANT_B),
          ALC: pdt(v.clinicas.ALC),
          DRG: pdt(v.clinicas.DRG),
        },

        tratamiento: {
          AGR: pdt(v.tratamiento.AGR), AGR_A: pdt(v.tratamiento.AGR_A),
          AGR_V: pdt(v.tratamiento.AGR_V), AGR_F: pdt(v.tratamiento.AGR_F),
          SUI: pdt(v.tratamiento.SUI),
          EST: pdt(v.tratamiento.EST),
          FAS: pdt(v.tratamiento.FAS),
          RTR: pdt(v.tratamiento.RTR),
        },

        interpersonales: {
          DOM: pdt(v.interpersonales.DOM),
          AFA: pdt(v.interpersonales.AFA),
        },

        indices: {
          INC_F: pdt(v.indices.INC_F),
          SIM: pdt(v.indices.SIM),
          FDR: pdt(v.indices.FDR),
          DEF: pdt(v.indices.DEF),
          FDC: pdt(v.indices.FDC),
          IPS: pdt(v.indices.IPS),
          IPV: pdt(v.indices.IPV),
          IDT: pdt(v.indices.IDT),
          ALC_Est: tOnly(v.indices.ALC_Est),
          DRO_Est: tOnly(v.indices.DRO_Est),
        },

        itemsCriticos: items(v.itemsCriticos as any[]),
        idiosincrasicos: items(v.idiosincrasicos as any[]),
      };

      await this.assessmentService.savePAIScoring(this.sessionId, scoring);
      this.router.navigate([
        '/cases', this.caseId,
        'subjects', this.subjectId,
        'assessments', this.sessionId, 'results-pai',
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
      'assessments', this.sessionId, 'pai-pending',
    ]);
  }
}
