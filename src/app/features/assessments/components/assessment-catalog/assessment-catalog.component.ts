import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';

@Component({
  selector: 'app-assessment-catalog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-catalog.component.html',
  styleUrl: './assessment-catalog.component.scss',
})
export class AssessmentCatalogComponent implements OnInit {
  caseId = '';
  subjectId = '';
  subject: any = null;
  assessments: any[] = [];
  sessions: any[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';
      this.subject = await this.subjectService.getById(this.subjectId);
      this.assessments = await this.assessmentService.listAssessments();
      this.sessions = await this.assessmentService.listSessionsBySubject(this.subjectId);
    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  async seedData() {
    try {
      await this.assessmentService.seedCatalog();
      await this.loadData();
    } catch (err: any) {
      this.error = err.message || 'Error al cargar catálogo';
    }
    }

  getSessionForAssessment(assessmentId: string) {
    return this.sessions.filter((s) => s.assessmentId === assessmentId);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      CREATED: 'Creada',
      IN_PROGRESS: 'En progreso',
      COMPLETED: 'Completada',
      SCORED: 'Calificada',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      CREATED: 'badge-pending',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-completed',
      SCORED: 'badge-active',
    };
    return map[status] || '';
  }

  async startAssessment(assessment: any) {
    try {
      const session = await this.assessmentService.createSession({
        subjectId: this.subjectId,
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        status: 'CREATED',
        currentQuestion: 0,
        startedAt: new Date().toISOString(),
      });
      if (session) {
        this.router.navigate([
          '/cases', this.caseId,
          'subjects', this.subjectId,
          'assessments', session.id, 'apply',
        ]);
      }
    } catch (err: any) {
      this.error = err.message || 'Error al iniciar la prueba';
    }
  }

  goToApply(sessionId: string) {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'assessments', sessionId, 'apply',
    ]);
  }

  goToResults(sessionId: string) {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'assessments', sessionId, 'results',
    ]);
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }
}

