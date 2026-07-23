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
  initialLoading = true;
  error = '';
  codeValidated = false;
  allCompleted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationService
  ) {}
  
  async ngOnInit() {
    const codeParam = this.route.snapshot.queryParams['code'];
    if (codeParam) {
      this.code = codeParam;
      await this.validateCode();
    }
    this.initialLoading = false;
  }     


  async validateCode() {
    if (!this.code || this.code.length !== 6) {
      this.error = 'Ingrese un código de 6 dígitos';
      return;
    }

    try {
      this.loading = true;
      this.error = '';

      const result = await this.evaluationService.validateCode(this.code);

      if (!result) {
        this.error = 'Código inválido, expirado o sesión no activa';
        return;
      }

      // La Lambda ya devuelve las pruebas validadas (no se accede a los modelos).
      this.session = { id: result.evalSessionId, subjectName: result.subjectName };
      this.assessmentSessions = (result.tests || []).map((t: any) => ({
        ...t,
        assessmentData: {
          name: t.name,
          description: t.description,
          totalQuestions: t.totalQuestions,
        },
      }));
      this.codeValidated = true;
      this.checkAllCompleted();
    } catch (err: any) {
      this.error = err.message || 'Error al validar código';
    } finally {
      this.loading = false;
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
      await this.evaluationService.completeEval(this.code);
      this.router.navigate(['/evaluate/thanks']);
    } catch (err: any) {
      this.error = err.message || 'Error al finalizar sesión';
    } finally {
      this.loading = false;
    }
  }
}