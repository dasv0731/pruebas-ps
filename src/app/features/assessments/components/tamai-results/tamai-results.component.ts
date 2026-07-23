import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { SEX_LABELS } from '../../../../core/models/types';
import { TAMAIManualScoring } from '../tamai-entry/tamai-entry.types';
import { TAMAI_LEVEL_REGISTRY } from '../tamai-entry/tamai-level-registry';
import { ScaleNode, ScaleType, flattenScaleNodesFull } from '../tamai-entry/tamai-level-config';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { TAMAI_INTERPRETATION, buildTamaiAIInputFromRows } from '../../tests/tamai/tamai.interpretation';

export interface ScaleRow {
  code: string;
  label: string;
  depth: number;
  type: ScaleType;
  pd: number;
  pc: number;
  category: string;
  badgeClass: string;
}

function categorize(pc: number, type: ScaleType): { category: string; badgeClass: string } {
  if (type === 'inadaptacion') {
    if (pc >= 85) return { category: 'Muy alta', badgeClass: 'badge-critical' };
    if (pc >= 75) return { category: 'Alta', badgeClass: 'badge-high' };
    if (pc >= 50) return { category: 'Media-alta', badgeClass: 'badge-moderate' };
    if (pc >= 25) return { category: 'Media', badgeClass: 'badge-normal' };
    return { category: 'Baja', badgeClass: 'badge-good' };
  }
  if (type === 'satisfaccion') {
    if (pc >= 75) return { category: 'Alta', badgeClass: 'badge-good' };
    if (pc >= 50) return { category: 'Media-alta', badgeClass: 'badge-normal' };
    if (pc >= 25) return { category: 'Media', badgeClass: 'badge-moderate' };
    return { category: 'Baja', badgeClass: 'badge-critical' };
  }
  return { category: '—', badgeClass: 'badge-neutral' };
}

@Component({
  selector: 'app-tamai-results',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, ErrorStateComponent],
  templateUrl: './tamai-results.component.html',
  styleUrl: './tamai-results.component.scss',
})
export class TamaiResultsComponent implements OnInit {
  caseId = ''; subjectId = ''; sessionId = '';
  session: any = null;
  subject: any = null;
  scoring: any = null;
  manual: TAMAIManualScoring | null = null;
  rows: ScaleRow[] = [];
  baremoLabel = '';
  loading = true;
  error = '';

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
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);

      this.scoring = await this.assessmentService.getScoring(this.sessionId);
      if (!this.scoring?.scores) { this.error = 'No hay corrección registrada.'; return; }

      const parsed = typeof this.scoring.scores === 'string' ? JSON.parse(this.scoring.scores) : this.scoring.scores;
      if (parsed.source !== 'TEA_MANUAL_TAMAI') {
        this.error = 'Formato de scoring no soportado. Vuelva a transcribir.';
        return;
      }

      this.manual = parsed as TAMAIManualScoring;
      const cfg = TAMAI_LEVEL_REGISTRY[this.manual.level];
      if (!cfg) {
        this.error = `Nivel ${this.manual.level} todavía no soportado.`;
        return;
      }

      const baremoOpt = cfg.baremos.find((b) => b.code === this.manual!.baremo);
      this.baremoLabel = baremoOpt?.label ?? this.manual.baremo;

      const allNodes = flattenScaleNodesFull(cfg.blocks);
      this.rows = allNodes.map((n: ScaleNode): ScaleRow => {
        const score = this.manual!.escalas[n.code] ?? { pd: 0, pc: 0 };
        const { category, badgeClass } = categorize(score.pc, n.type);
        return {
          code: n.code,
          label: n.label,
          depth: n.depth,
          type: n.type,
          pd: score.pd,
          pc: score.pc,
          category,
          badgeClass,
        };
      });

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
    if (!this.rows.length || !this.scoring || !this.manual) return;
    this.generating = true;
    this.error = '';
    try {
      const input = buildTamaiAIInputFromRows(this.rows, {
        level: this.manual.level,
        baremo: this.baremoLabel,
        edad: this.session?.subjectAgeYears,
        sexo: this.session?.subjectSex,
      });
      const r: AIResponse = await this.aiService.generateAssessmentInterpretation(
        JSON.stringify(input), TAMAI_INTERPRETATION.systemPrompt, TAMAI_INTERPRETATION.maxTokens);
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

  getSubjectFullName(): string {
    return `${this.subject?.firstName || ''} ${this.subject?.lastName || ''}`.trim() || 'Evaluado';
  }

  getSexLabel(): string {
    const sex = this.session?.subjectSex;
    if (!sex) return 'No registrado';
    return SEX_LABELS[sex as 'MALE' | 'FEMALE'] || sex;
  }

  indentStyle(depth: number): { [k: string]: string } {
    return { 'padding-left.px': String(depth * 16) };
  }

  goToEntry() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'tamai-entry']);
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments']);
  }
}
