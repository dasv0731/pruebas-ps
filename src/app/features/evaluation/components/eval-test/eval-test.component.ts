import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluationService } from '../../services/evaluation.service';

interface Question {
  index: number;
  text: string;
  options: number;
}

interface Section {
  title: string;
  instructions: string;
  legend: string[];
  questions: Question[];
}

@Component({
  selector: 'app-eval-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eval-test.component.html',
  styleUrl: './eval-test.component.scss',
})
export class EvalTestComponent implements OnInit {
  sessionId = '';
  evalId = '';
  code = '';
  session: any = null;
  assessment: any = null;
  sections: Section[] = [];
  answers: Record<number, number> = {};
  totalQuestions = 0;
  loading = true;
  submitting = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationService
  ) {}

  async ngOnInit() {
    this.sessionId = this.route.snapshot.params['sessionId'];
    this.evalId = this.route.snapshot.queryParams['evalId'];
    this.code = this.route.snapshot.queryParams['code'];

    if (!this.sessionId || !this.evalId || !this.code) {
      this.error = 'Acceso inválido';
      this.loading = false;
      return;
    }

    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';

      // Validar que la sesión sigue activa
      const evalSession = await this.evaluationService.validateCode(this.code);
      if (!evalSession) {
        this.error = 'La sesión ha expirado o no es válida';
        return;
      }

      this.session = await this.evaluationService.getAssessmentSessionPublic(this.sessionId);
      if (!this.session) {
        this.error = 'Prueba no encontrada';
        return;
      }

      if (this.session.status === 'SCORED' || this.session.status === 'COMPLETED') {
        this.error = 'Esta prueba ya fue completada';
        return;
      }

      this.assessment = await this.evaluationService.getAssessmentPublic(this.session.assessmentId);
      if (!this.assessment) {
        this.error = 'Datos de la prueba no encontrados';
        return;
      }

      this.parseQuestions();
      this.totalQuestions = this.sections.reduce((sum, s) => sum + s.questions.length, 0);

    } catch (err: any) {
      this.error = err.message || 'Error al cargar la prueba';
    } finally {
      this.loading = false;
    }
  }

  parseQuestions() {
    if (!this.assessment.questions) {
      this.sections = [];
      return;
    }
    try {
      const parsed = JSON.parse(this.assessment.questions);
      if (parsed.sections) {
        this.sections = parsed.sections;
      } else if (Array.isArray(parsed)) {
        this.sections = [{
          title: this.assessment.name,
          instructions: '',
          legend: [],
          questions: parsed,
        }];
      }
    } catch {
      this.sections = [];
    }
  }

  selectOption(questionIndex: number, value: number) {
    this.answers[questionIndex] = value;
  }

  isSelected(questionIndex: number, value: number): boolean {
    return this.answers[questionIndex] === value;
  }

  getAnsweredCount(): number {
    return Object.keys(this.answers).length;
  }

  isComplete(): boolean {
    return this.getAnsweredCount() === this.totalQuestions;
  }

  getUnanswered(): number[] {
    const unanswered: number[] = [];
    for (const section of this.sections) {
      for (const q of section.questions) {
        if (this.answers[q.index] === undefined) {
          unanswered.push(q.index);
        }
      }
    }
    return unanswered;
  }

  async onSubmit() {
    if (!this.isComplete()) {
      const unanswered = this.getUnanswered();
      this.error = `Faltan ${unanswered.length} preguntas por responder: ${unanswered.slice(0, 5).join(', ')}${unanswered.length > 5 ? '...' : ''}`;
      return;
    }

    try {
      this.submitting = true;
      this.error = '';

      const answersArray: number[] = [];
      for (let i = 1; i <= this.totalQuestions; i++) {
        answersArray.push(this.answers[i] || 0);
      }

      await this.evaluationService.saveAnswersPublic(
        this.sessionId,
        JSON.stringify(answersArray),
        'COMPLETED'
      );

      await this.evaluationService.scorePublic(this.sessionId, answersArray);

      this.router.navigate(['/evaluate'], {
        queryParams: { code: this.code },
      });
    } catch (err: any) {
      this.error = err.message || 'Error al enviar respuestas';
    } finally {
      this.submitting = false;
    }
  }
}