import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { SEX_LABELS } from '../../../../core/models/types';
import { CDI_INTERPRETATION, buildCdiAIInputFromScoring } from '../../tests/cdi/cdi.interpretation';

type TotalClassification = 'SIN_SINTOMATOLOGIA' | 'LEVE' | 'SEVERA' | null;
type ReportMode =
  | 'COMPLETE'
  | 'PARTIAL_NO_NORM'
  | 'PARTIAL_INSUFFICIENT'
  | 'NOT_INTERPRETABLE';

export interface CdiScoringData {
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
  generating = false;
  error = '';

  readonly aiEnabled = true;

  // Aviso: si la prueba fue re-corregida, el scoring vigente cambia y la
  // interpretación anterior (ligada al scoring viejo) queda huérfana.
  hadPreviousInterpretation = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private aiService: AIService,
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
      this.interpretation = '';
      if (this.scoring) {
        const saved = await this.assessmentService.getInterpretation(
          this.scoring.id,
        );
        if (saved) {
          this.interpretation = saved.content;
          this.interpretationVersion = saved.version;
          this.interpretationDate = saved.generatedAt || '';
        }
        // Re-corrección: el scoring vigente es una versión nueva (>1) y aún
        // no tiene interpretación propia; la narrativa anterior quedó ligada
        // al scoring anterior y ya no describe la corrección actual.
        this.hadPreviousInterpretation = !saved && (this.scoring.version || 1) > 1;
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

  async generateInterpretation() {
    if (!this.cdiData || !this.scoring) return;
    this.generating = true;
    this.error = '';
    try {
      const input = buildCdiAIInputFromScoring(this.cdiData);
      const r: AIResponse = await this.aiService.generateAssessmentInterpretation(
        JSON.stringify(input), CDI_INTERPRETATION.systemPrompt, CDI_INTERPRETATION.maxTokens);
      if (r.success && r.content) {
        await this.assessmentService.saveInterpretation(this.scoring.id, r.content, r.model || 'deepseek-chat');
        this.interpretation = r.content;
        this.interpretationVersion++;
        this.interpretationDate = new Date().toISOString();
        this.hadPreviousInterpretation = false;
      } else {
        this.error = r.error || 'Error al generar interpretación';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar interpretación';
    } finally {
      this.generating = false;
    }
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