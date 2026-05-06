import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { SEX_LABELS } from '../../../../core/models/types';
import { TAMAIManualScoring } from '../tamai-entry/tamai-entry.types';
import { TAMAI_LEVEL_REGISTRY } from '../tamai-entry/tamai-level-registry';
import { ScaleNode, ScaleType, flattenScaleNodesFull } from '../tamai-entry/tamai-level-config';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

interface ScaleRow {
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
  manual: TAMAIManualScoring | null = null;
  rows: ScaleRow[] = [];
  baremoLabel = '';
  loading = true;
  error = '';

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
      if (!this.session) { this.error = 'Sesión no encontrada'; return; }
      this.subject = await this.subjectService.getById(this.session.subjectId);

      const scoring = await this.assessmentService.getScoring(this.sessionId);
      if (!scoring?.scores) { this.error = 'No hay corrección registrada.'; return; }

      const parsed = typeof scoring.scores === 'string' ? JSON.parse(scoring.scores) : scoring.scores;
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
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
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
