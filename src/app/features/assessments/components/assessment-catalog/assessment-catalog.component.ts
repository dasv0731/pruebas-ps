import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { EvaluationService } from '../../../evaluation/services/evaluation.service';

@Component({
  selector: 'app-assessment-catalog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-catalog.component.html',
  styleUrl: './assessment-catalog.component.scss',
})
export class AssessmentCatalogComponent implements OnInit, OnDestroy {
  caseId = '';
  subjectId = '';
  subject: any = null;
  assessments: any[] = [];
  sessions: any[] = [];
  evaluationSession: any = null;
  evaluationUrl = '';
  loading = true;
  generatingSession = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
    private evaluationService: EvaluationService
  ) {}

  private pollingInterval: any = null;

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    await this.loadData();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      if (this.evaluationSession && this.evaluationSession.status === 'ACTIVE') {
        const previousSessions = JSON.stringify(this.sessions.map((s: any) => s.status));
        this.sessions = await this.assessmentService.listSessionsBySubject(this.subjectId);
        const currentSessions = JSON.stringify(this.sessions.map((s: any) => s.status));
        
        if (previousSessions !== currentSessions) {
          // Algo cambió, recargar sesión de evaluación también
          this.evaluationSession = await this.evaluationService.getEvaluationSessionBySubject(this.subjectId);
        }
      }
    }, 5000); // Cada 5 segundos
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';
      this.subject = await this.subjectService.getById(this.subjectId);
      this.assessments = await this.assessmentService.listAssessments();
      this.sessions = await this.assessmentService.listSessionsBySubject(this.subjectId);
      this.evaluationSession = await this.evaluationService.getEvaluationSessionBySubject(this.subjectId);
      if (this.evaluationSession) {
        this.evaluationUrl = `${window.location.origin}/evaluate?code=${this.evaluationSession.accessCode}`;
      }
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

  getPendingSessions(): any[] {
    return this.sessions.filter((s) => s.status === 'CREATED' || s.status === 'IN_PROGRESS');
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

  async generateSession(assessment: any) {
    try {
      await this.assessmentService.createSession({
        subjectId: this.subjectId,
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        status: 'CREATED',
        currentQuestion: 0,
        startedAt: new Date().toISOString(),
      });
      await this.loadData();
    } catch (err: any) {
      this.error = err.message || 'Error al generar la sesión';
    }
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

  async generateEvaluationSession() {
    const pendingSessions = this.sessions.filter(
      (s) => s.status === 'CREATED' || s.status === 'IN_PROGRESS'
    );

    if (pendingSessions.length === 0) {
      this.error = 'No hay pruebas pendientes. Agregue pruebas primero usando "Aplicar prueba".';
      return;
    }

    try {
      this.generatingSession = true;
      this.error = '';

      const subjectName = `${this.subject.firstName} ${this.subject.lastName}`;
      const sessionIds = pendingSessions.map((s) => s.id);

      this.evaluationSession = await this.evaluationService.createEvaluationSession(
        this.subjectId,
        this.caseId,
        subjectName,
        sessionIds
      );

      this.evaluationUrl = `${window.location.origin}/evaluate?code=${this.evaluationSession.accessCode}`;
    } catch (err: any) {
      this.error = err.message || 'Error al generar sesión de evaluación';
    } finally {
      this.generatingSession = false;
    }
  }

  async pauseEvaluationSession() {
    if (!this.evaluationSession) return;
    try {
      await this.evaluationService.pauseSession(this.evaluationSession.id);
      this.evaluationSession.status = 'PAUSED';
      this.evaluationUrl = '';
    } catch (err: any) {
      this.error = err.message || 'Error al pausar sesión';
    }
  }

  async resumeEvaluationSession() {
    if (!this.evaluationSession) return;
    try {
      this.evaluationSession = await this.evaluationService.resumeSession(this.evaluationSession.id);
      this.evaluationUrl = `${window.location.origin}/evaluate?code=${this.evaluationSession.accessCode}`;
    } catch (err: any) {
      this.error = err.message || 'Error al reanudar sesión';
    }
  }

  copyUrl() {
    navigator.clipboard.writeText(this.evaluationUrl);
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

  isAssessmentSelected(assessmentId: string): boolean {
    return this.sessions.some((s) => s.assessmentId === assessmentId);
  }

  isAssessmentPending(assessmentId: string): boolean {
    return this.sessions.some(
      (s) => s.assessmentId === assessmentId && (s.status === 'CREATED' || s.status === 'IN_PROGRESS')
    );
  }

  isAssessmentCompleted(assessmentId: string): boolean {
    return this.sessions.some(
      (s) => s.assessmentId === assessmentId && s.status === 'SCORED'
    );
  }

  async toggleAssessment(assessment: any, event: any) {
    if (event.target.checked) {
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
          this.sessions = [...this.sessions, session];
        }
      } catch (err: any) {
        this.error = err.message || 'Error al agregar prueba';
      }
    }
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }

  hasActiveEvaluationSession(): boolean {
    return this.evaluationSession && 
      (this.evaluationSession.status === 'ACTIVE' || this.evaluationSession.status === 'PAUSED');
  }
}