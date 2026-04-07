import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-eval-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './eval-portal.component.html',
  styleUrl: './eval-portal.component.scss',
})
export class EvalPortalComponent implements OnInit {
  code = '';
  session: any = null;
  assessmentSessions: any[] = [];
  loading = false;
  loadingTests = false;
  error = '';
  codeValidated = false;
  allCompleted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationService
  ) {}

  ngOnInit() {
    const codeParam = this.route.snapshot.queryParams['code'];
    if (codeParam) {
      this.code = codeParam;
      this.validateCode();
    }
  }

  async validateCode() {
    if (!this.code || this.code.length !== 6) {
      this.error = 'Ingrese un código de 6 dígitos';
      return;
    }

    try {
      this.loading = true;
      this.error = '';

      this.session = await this.evaluationService.validateCode(this.code);

      if (!this.session) {
        this.error = 'Código inválido, expirado o sesión no activa';
        return;
      }

      this.codeValidated = true;
      await this.loadAssessmentSessions();
    } catch (err: any) {
      this.error = err.message || 'Error al validar código';
    } finally {
      this.loading = false;
    }
  }

  async loadAssessmentSessions() {
    try {
      this.loadingTests = true;
      const ids = JSON.parse(this.session.assessmentSessionIds);
      this.assessmentSessions = [];

      for (const id of ids) {
        const session = await this.evaluationService.getAssessmentSessionPublic(id);
        if (session) {
          const assessment = await this.evaluationService.getAssessmentPublic(session.assessmentId);
          this.assessmentSessions.push({
            ...session,
            assessmentData: assessment,
          });
        }
      }

      this.checkAllCompleted();
    } catch (err: any) {
      this.error = err.message || 'Error al cargar pruebas';
    } finally {
      this.loadingTests = false;
    }
  }

  checkAllCompleted() {
    this.allCompleted = this.assessmentSessions.length > 0 &&
      this.assessmentSessions.every((s) => s.status === 'SCORED' || s.status === 'COMPLETED');
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      CREATED: 'Pendiente',
      IN_PROGRESS: 'En progreso',
      COMPLETED: 'Completada',
      SCORED: 'Finalizada',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      CREATED: 'status-pending',
      IN_PROGRESS: 'status-progress',
      COMPLETED: 'status-done',
      SCORED: 'status-done',
    };
    return map[status] || '';
  }

  isTestAvailable(session: any): boolean {
    return session.status === 'CREATED' || session.status === 'IN_PROGRESS';
  }

  startTest(session: any) {
    this.router.navigate(['/evaluate/test', session.id], {
      queryParams: { evalId: this.session.id, code: this.code },
    });
  }

  async finishAllTests() {
    if (!this.allCompleted) return;

    try {
      this.loading = true;
      await this.evaluationService.completeEvaluationSession(this.session.id);
      this.router.navigate(['/evaluate/thanks']);
    } catch (err: any) {
      this.error = err.message || 'Error al finalizar sesión';
    } finally {
      this.loading = false;
    }
  }
}