import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { PaiInterpretService, PAIFindings, PAILevel } from '../../../../core/services/pai-interpret.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { SEX_LABELS } from '../../../../core/models/types';
import type { PAIManualScoring } from '../pai-entry/pai-entry.types';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PAI_INTERPRETATION, buildPaiAIInputFromFindings } from '../../tests/pai/pai.interpretation';

@Component({
  selector: 'app-pai-results',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, ErrorStateComponent],
  templateUrl: './pai-results.component.html',
  styleUrl: './pai-results.component.scss',
})
export class PaiResultsComponent implements OnInit {
  caseId = ''; subjectId = ''; sessionId = '';
  session: any = null; subject: any = null;
  scoring: any = null;
  findings: PAIFindings | null = null;
  manualOnly: PAIManualScoring | null = null;
  loading = true; error = '';

  interpretation = '';
  interpretationVersion = 0;
  interpretationDate = '';
  generating = false;
  hadPreviousInterpretation = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private interpretService: PaiInterpretService,
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
      this.loading = true; this.error = '';
      this.findings = null; this.manualOnly = null;

      this.session = await this.assessmentService.getSession(this.sessionId);
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);
      this.scoring = await this.assessmentService.getScoring(this.sessionId);

      if (!this.scoring?.scores) { this.error = 'No hay puntuaciones guardadas. Transcriba los valores primero.'; return; }

      const raw = typeof this.scoring.scores === 'string' ? JSON.parse(this.scoring.scores) : this.scoring.scores;

      if (raw.source === 'TEA_MANUAL_PAI') {
        const manual = raw as PAIManualScoring;
        this.manualOnly = manual;
        this.findings = this.interpretService.interpret(manual);
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
        this.hadPreviousInterpretation = !saved && (this.scoring.version || 1) > 1;
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
      const input = buildPaiAIInputFromFindings(this.findings, {
        edad: this.session?.subjectAgeYears,
        sexo: this.session?.subjectSex,
      });
      const r: AIResponse = await this.aiService.generateAssessmentInterpretation(
        JSON.stringify(input), PAI_INTERPRETATION.systemPrompt, PAI_INTERPRETATION.maxTokens);
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

  getLevelClass(level: PAILevel): string {
    if (level === 'CRITICAL') return 'lvl-critical';
    if (level === 'ELEVATED') return 'lvl-elevated';
    if (level === 'MODERATE') return 'lvl-moderate';
    return 'lvl-normal';
  }

  getLevelLabel(level: PAILevel): string {
    const map: Record<PAILevel, string> = { CRITICAL: 'Muy elevado', ELEVATED: 'Elevado', MODERATE: 'Moderado', NORMAL: 'Normal' };
    return map[level];
  }

  getRiskClass(r: string): string {
    if (r === 'HIGH') return 'risk-high';
    if (r === 'MODERATE') return 'risk-moderate';
    if (r === 'LOW') return 'risk-low';
    return 'risk-none';
  }

  getRiskLabel(r: string): string {
    const m: Record<string, string> = { HIGH: 'ALTO', MODERATE: 'Moderado', LOW: 'Bajo', NONE: 'Sin indicadores' };
    return m[r] ?? r;
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
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'pai-entry']);
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments']);
  }

  getScaleT(list: any[], key: string): number {
    return list.find((r) => r.key === key)?.t ?? 0;
  }

  goToCase() { this.router.navigate(['/cases', this.caseId]); }
}
