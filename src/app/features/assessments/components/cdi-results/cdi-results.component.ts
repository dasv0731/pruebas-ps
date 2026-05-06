import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { SEX_LABELS } from '../../../../core/models/types';

type TotalClassification = 'SIN_SINTOMATOLOGIA' | 'LEVE' | 'SEVERA' | null;
type ReportMode =
  | 'COMPLETE'
  | 'PARTIAL_NO_NORM'
  | 'PARTIAL_INSUFFICIENT'
  | 'NOT_INTERPRETABLE';

interface CdiScoringData {
  success: boolean;
  scoringVersion: number;
  reportMode: ReportMode;
  rawScores: {
    total: number;
    disforia: number;
    autoestima: number;
  };
  normativeGroup: {
    sex: 'MALE' | 'FEMALE';
    ageYears: number;
    ageGroup: '7-8' | '9-10' | '11-15' | null;
    tableColumn: string;
  } | null;
  normedScores: {
    total: { pc: number; t: number };
    disforia: { pc: number; t: number };
    autoestima: { pc: number; t: number };
  } | null;
  totalClassification: TotalClassification;
  itemAnalysis: {
    item9Value: number;
    item9Alert: boolean;
    itemsValue2: number[];
    itemsValue1: number[];
    cutoffExceeded: boolean;
  };
  generatedAt: string;
  warnings: string[];
  error?: string;
}

@Component({
  selector: 'app-cdi-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cdi-results.component.html',
  styleUrl: './cdi-results.component.scss',
})
export class CdiResultsComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';

  session: any = null;
  subject: any = null;
  assessment: any = null;
  scoring: any = null;
  cdiData: CdiScoringData | null = null;

  interpretation = '';
  interpretationVersion = 0;
  interpretationDate = '';

  loading = true;
  error = '';

  // Para el botón de IA (queda deshabilitado por ahora)
  readonly aiEnabled = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    this.sessionId = this.route.snapshot.params['sessionId'];
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';

      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) {
        this.error = 'Sesión no encontrada';
        return;
      }
      this.subject = await this.subjectService.getById(this.session.subjectId);
      this.assessment = await this.assessmentService.getAssessment(
        this.session.assessmentId,
      );

      // Verificar que realmente es CDI
      if (this.assessment?.shortName !== 'CDI') {
        this.error = `Esta vista es solo para CDI. Prueba recibida: ${this.assessment?.shortName}`;
        return;
      }

      this.scoring = await this.assessmentService.getScoring(this.sessionId);

      // Parsear el JSON estructurado de la Lambda
      if (this.scoring?.scores) {
        try {
          this.cdiData =
            typeof this.scoring.scores === 'string'
              ? JSON.parse(this.scoring.scores)
              : this.scoring.scores;
        } catch {
          this.error = 'No se pudo parsear el scoring del CDI';
          return;
        }
      }

      // Verificar que el scoring es de la versión nueva
      if (this.cdiData && this.cdiData.scoringVersion !== 2) {
        this.error =
          'Este scoring fue generado con una versión anterior. Vuelva a calificar la prueba.';
        return;
      }

      // Cargar interpretación guardada si existe
      if (this.scoring) {
        const saved = await this.assessmentService.getInterpretation(
          this.scoring.id,
        );
        if (saved) {
          this.interpretation = saved.content;
          this.interpretationVersion = saved.version;
          this.interpretationDate = saved.generatedAt || '';
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
    }
  }

  // ── Helpers de presentación ──

  getSubjectFullName(): string {
    const first = this.subject?.firstName || '';
    const last = this.subject?.lastName || '';
    return `${first} ${last}`.trim() || 'Evaluado';
  }

  getSexLabel(sex: 'MALE' | 'FEMALE' | null | undefined): string {
    if (!sex) return 'No registrado';
    return SEX_LABELS[sex] || sex;
  }

  getClassificationLabel(c: TotalClassification): string {
    switch (c) {
      case 'SIN_SINTOMATOLOGIA':
        return 'Sin sintomatología';
      case 'LEVE':
        return 'Sintomatología leve';
      case 'SEVERA':
        return 'Sintomatología severa';
      default:
        return 'Sin clasificación';
    }
  }

  getClassificationClass(c: TotalClassification): string {
    switch (c) {
      case 'SIN_SINTOMATOLOGIA':
        return 'badge-ok';
      case 'LEVE':
        return 'badge-warn';
      case 'SEVERA':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  getReportModeLabel(mode: ReportMode): string {
    switch (mode) {
      case 'COMPLETE':
        return 'Informe completo con baremación';
      case 'PARTIAL_NO_NORM':
        return 'Informe parcial (sin baremo por edad)';
      case 'PARTIAL_INSUFFICIENT':
        return 'Informe parcial (faltan datos del evaluado)';
      case 'NOT_INTERPRETABLE':
        return 'No interpretable';
      default:
        return mode;
    }
  }

  getTLevelLabel(t: number): string {
    // Clasificación cualitativa informativa basada en puntuaciones T (M=50, DE=10)
    if (t < 40) return 'Muy baja';
    if (t < 45) return 'Baja';
    if (t < 56) return 'Media';
    if (t < 66) return 'Alta';
    if (t < 71) return 'Muy alta';
    return 'Extrema';
  }

  getAgeGroupLabel(group: string | null): string {
    if (!group) return 'Fuera de rango';
    return `${group} años`;
  }

  // ── Acciones ──

  generateInterpretation() {
    // Placeholder: la generación IA se implementará en siguiente iteración
    // con una Lambda dedicada al CDI.
    this.error =
      'La generación con IA para CDI estará disponible próximamente.';
  }

  goBack() {
    this.router.navigate([
      '/cases',
      this.caseId,
      'subjects',
      this.subjectId,
      'assessments',
    ]);
  }

  goToCase() {
    this.router.navigate(['/cases', this.caseId]);
  }
}