import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluationService } from '../../services/evaluation.service';
import { TestLoaderService } from '../../../assessments/services/test-loader.service';
import { TestSection } from '../../../assessments/models/test.interfaces';

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
  sections: TestSection[] = [];
  answers: Record<number, number> = {};
  totalQuestions = 0;
  highlightUnanswered = false;
  questionType = 'NUMERIC';
  optionLabels: string[] = [];
  shortName = '';
  loading = true;
  submitting = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationService,
    private testLoader: TestLoaderService
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

      // Intentar cargar desde el registro local por shortName
      this.shortName = this.extractShortName(this.session.assessmentName);
      const config = this.testLoader.getConfig(this.shortName);

      if (config) {
        this.sections = config.sections;
        this.questionType = config.questionType;
        this.totalQuestions = this.testLoader.getTotalQuestions(this.shortName);
        this.optionLabels = config.optionLabels || [];
      } else {
        // Fallback: cargar desde DB
        this.assessment = await this.evaluationService.getAssessmentPublic(this.session.assessmentId);
        if (!this.assessment) {
          this.error = 'Datos de la prueba no encontrados';
          return;
        }
        this.parseQuestionsFromDB();
      }

    } catch (err: any) {
      this.error = err.message || 'Error al cargar la prueba';
    } finally {
      this.loading = false;
    }
  }

  extractShortName(assessmentName: string): string {
    // Extraer shortName del nombre: "STAI - Inventario..." → "STAI"
    const match = assessmentName.match(/^(\w+)\s*-/);
    return match ? match[1] : assessmentName;
  }

  parseQuestionsFromDB() {
    if (!this.assessment?.questions) return;
    try {
      let parsed = this.assessment.questions;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);

      this.questionType = parsed.type || 'NUMERIC';
      if (parsed.sections) {
        this.sections = parsed.sections.map((s: any) => ({
          ...s,
          legend: s.legend || [],
          questions: s.questions || [],
        }));
      }
      this.totalQuestions = this.sections.reduce((sum, s) => sum + s.questions.length, 0);
    } catch {
      this.sections = [];
    }
  }

  selectOption(questionIndex: number, value: number) {
    this.answers[questionIndex] = value;
    if (this.highlightUnanswered && this.isComplete()) {
      this.highlightUnanswered = false;
      this.error = '';
    }
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
      this.error = `Faltan ${unanswered.length} preguntas por responder.`;
      this.highlightUnanswered = true;
      // Scroll al primer sin responder
      setTimeout(() => {
        const el = document.querySelector('.unanswered');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    try {
      this.submitting = true;
      this.error = '';
      this.highlightUnanswered = false;

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