import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { PaiInterpretService, PAIFindings, PAILevel } from '../../../../core/services/pai-interpret.service';
import { SEX_LABELS } from '../../../../core/models/types';
import type { PAIManualScoring } from '../pai-entry/pai-entry.types';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

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
  findings: PAIFindings | null = null;
  manualOnly: PAIManualScoring | null = null;
  loading = true; error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private interpretService: PaiInterpretService,
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
      const scoring = await this.assessmentService.getScoring(this.sessionId);

      if (!scoring?.scores) { this.error = 'No hay puntuaciones guardadas. Transcriba los valores primero.'; return; }

      const raw = typeof scoring.scores === 'string' ? JSON.parse(scoring.scores) : scoring.scores;

      if (raw.source === 'TEA_MANUAL_PAI') {
        const manual = raw as PAIManualScoring;
        this.manualOnly = manual;
        this.findings = this.interpretService.interpret(manual);
      } else {
        this.error = 'Formato de scoring no reconocido';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
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
