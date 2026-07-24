import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { CuidaInterpretService } from '../../../../core/services/cuida-interpret.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { SEX_LABELS } from '../../../../core/models/types';
import type { CuidaManualScoring } from '../cuida-entry/cuida-entry.component';
import { CUIDA_INTERPRETATION, buildCuidaAIInputFromFindings } from '../../tests/cuida/cuida.interpretation';

export type EnCategory = 'BAJO' | 'NORMAL' | 'ALTO';
export type QualLevel = 'MUY_BAJO' | 'BAJO' | 'MEDIO' | 'ALTO' | 'MUY_ALTO';

export interface QualitativeLevel { en: number; level: QualLevel; }
export interface JointReadingFlag { pattern: string; description: string; scalesInvolved: string[]; }
export interface CriticalItemFlag { itemNumber: number; escala: string; content: string; reason: string; rawResponse: number | null; }
export interface DeseabilidadInterpretation { en: number; level: QualLevel; contaminationRisk: boolean; scalesToInterpretWithCaution: string[]; }

export interface CuidaFindings {
  manualScoring: CuidaManualScoring;
  interpretationVersion: 1;
  profileValidity: { isValid: boolean; reason: string | null };
  reportMode: 'COMPLETE' | 'NOT_INTERPRETABLE';
  qualitativeLevels: Record<string, QualitativeLevel>;
  deseabilidadInterpretation: DeseabilidadInterpretation;
  jointReadingFlags: JointReadingFlag[];
  criticalItemsToClarify: CriticalItemFlag[];
  generatedAt: string;
  warnings: string[];
}

@Component({
  selector: 'app-cuida-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuida-results.component.html',
  styleUrl: './cuida-results.component.scss',
})
export class CuidaResultsComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';

  session: any = null;
  subject: any = null;
  scoring: any = null;

  findings: CuidaFindings | null = null;
  manualOnly: CuidaManualScoring | null = null;
  get hasFindings(): boolean { return this.findings !== null; }

  loading = true;
  recalculating = false;
  error = '';
  readonly aiEnabled = true;

  interpretation = '';
  interpretationVersion = 0;
  interpretationDate = '';
  generating = false;
  hadPreviousInterpretation = false;

  readonly ESCALAS_PERSONALIDAD = [
    { key: 'altruismo', label: 'Altruismo', abbr: 'Al' },
    { key: 'apertura', label: 'Apertura', abbr: 'Ap' },
    { key: 'asertividad', label: 'Asertividad', abbr: 'As' },
    { key: 'autoestima', label: 'Autoestima', abbr: 'Au' },
    { key: 'resolverProblemas', label: 'Resolver problemas', abbr: 'RP' },
    { key: 'empatia', label: 'Empatía', abbr: 'Em' },
    { key: 'equilibrioEmocional', label: 'Equilibrio emocional', abbr: 'EE' },
    { key: 'independencia', label: 'Independencia', abbr: 'In' },
    { key: 'flexibilidad', label: 'Flexibilidad', abbr: 'Fl' },
    { key: 'reflexividad', label: 'Reflexividad', abbr: 'Re' },
    { key: 'sociabilidad', label: 'Sociabilidad', abbr: 'So' },
    { key: 'toleranciaFrustracion', label: 'Tolerancia a la frustración', abbr: 'TF' },
    { key: 'vinculosAfectivos', label: 'Vínculos afectivos', abbr: 'VA' },
    { key: 'resolucionDuelo', label: 'Resolución del duelo', abbr: 'RD' },
  ] as const;

  readonly ESCALAS_CUIDADO = [
    { key: 'cuidadoResponsable', label: 'Cuidado responsable', abbr: 'CR' },
    { key: 'cuidadoAfectivo', label: 'Cuidado afectivo', abbr: 'CA' },
    { key: 'sensibilidad', label: 'Sensibilidad', abbr: 'Se' },
    { key: 'agresividad', label: 'Agresividad', abbr: 'Ag' },
  ] as const;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private cuidaInterpretService: CuidaInterpretService,
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
      this.findings = null;
      this.manualOnly = null;

      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);
      this.scoring = await this.assessmentService.getScoring(this.sessionId);

      if (!this.scoring?.scores) {
        this.error = 'No hay scoring guardado. Transcriba los valores primero.';
        return;
      }

      const raw =
        typeof this.scoring.scores === 'string'
          ? JSON.parse(this.scoring.scores)
          : this.scoring.scores;

      if (raw.interpretationVersion === 1) {
        this.findings = raw as CuidaFindings;
      } else if (raw.source === 'TEA_MANUAL') {
        this.manualOnly = raw as CuidaManualScoring;
      } else {
        this.error = 'Formato de scoring no reconocido';
      }

      // Cargar interpretación vigente
      this.interpretation = '';
      if (this.scoring) {
        const saved = await this.assessmentService.getInterpretation(this.scoring.id);
        if (saved) {
          this.interpretation = saved.content;
          this.interpretationVersion = saved.version;
          this.interpretationDate = saved.generatedAt || '';
        }
        // recalculate() crea un scoring nuevo (isCurrent) al recorregir: si el
        // vigente aún no tiene interpretación pero un scoring anterior de la sesión
        // sí la tenía, la narrativa anterior quedó huérfana. (Basarse en version>1
        // daría falso positivo en CUIDA, cuyo primer scoring nace en versión 2.)
        this.hadPreviousInterpretation = !saved &&
          await this.assessmentService.sessionHasPriorInterpretation(this.sessionId, this.scoring.id);
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
    }
  }

  async generateInterpretation() {
    if (!this.findings || !this.scoring) return;
    this.generating = true;
    this.error = '';
    try {
      const input = buildCuidaAIInputFromFindings(this.findings, {
        edad: this.session?.subjectAgeYears,
        sexo: this.session?.subjectSex,
      });
      const r: AIResponse = await this.aiService.generateAssessmentInterpretation(
        JSON.stringify(input), CUIDA_INTERPRETATION.systemPrompt, CUIDA_INTERPRETATION.maxTokens);
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

  async recalculate() {
    try {
      this.recalculating = true;
      this.error = '';
      await this.cuidaInterpretService.interpret(this.sessionId);
      await this.loadData();
    } catch (err: any) {
      this.error = err.message || 'Error al recalcular';
    } finally {
      this.recalculating = false;
    }
  }

  // ── Helpers de presentación ──

  getManual(): CuidaManualScoring | null {
    return this.findings?.manualScoring ?? this.manualOnly;
  }

  getEscalaLevel(key: string): QualitativeLevel | null {
    return this.findings?.qualitativeLevels?.[key] ?? null;
  }

  getLevelLabel(level: QualLevel | string): string {
    const map: Record<string, string> = {
      MUY_BAJO: 'Muy bajo', BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto', MUY_ALTO: 'Muy alto',
    };
    return map[level] ?? level;
  }

  getLevelClass(level: QualLevel | string): string {
    if (level === 'MUY_ALTO' || level === 'ALTO') return 'level-high';
    if (level === 'MUY_BAJO' || level === 'BAJO') return 'level-low';
    return 'level-mid';
  }

  getEnBadgeClass(en: number): string {
    if (en >= 7) return 'badge-high';
    if (en <= 3) return 'badge-low';
    return 'badge-mid';
  }

  getEnLabel(en: EnCategory): string {
    const map: Record<EnCategory, string> = { BAJO: 'Bajo', NORMAL: 'Normal', ALTO: 'Alto' };
    return map[en] ?? en;
  }

  getEnCatClass(en: EnCategory): string {
    if (en === 'ALTO') return 'badge-danger';
    if (en === 'BAJO') return 'badge-warn';
    return 'badge-ok';
  }

  getScaleLabel(key: string): string {
    const all = [...this.ESCALAS_PERSONALIDAD, ...this.ESCALAS_CUIDADO];
    return all.find((e) => e.key === key)?.label ?? key;
  }

  formatScaleList(keys: string[], separator = ', '): string {
    return (keys ?? []).map((k) => this.getScaleLabel(k)).join(separator);
  }

  getManualEscalaEn(key: string): number {
    const m = this.getManual();
    if (!m) return 5;
    return (m.escalas as Record<string, number>)[key] ?? 5;
  }

  getManualCuidadoEn(key: string): number {
    const m = this.getManual();
    if (!m) return 5;
    return (m.cuidado as Record<string, number>)[key] ?? 5;
  }

  getSubjectFullName(): string {
    return `${this.subject?.firstName || ''} ${this.subject?.lastName || ''}`.trim() || 'Evaluado';
  }

  getSexLabel(): string {
    const sex = this.session?.subjectSex;
    if (!sex) return 'No registrado';
    return SEX_LABELS[sex as 'MALE' | 'FEMALE'] || sex;
  }

  goToEntry() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'cuida-entry']);
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments']);
  }

  goToCase() {
    this.router.navigate(['/cases', this.caseId]);
  }
}
