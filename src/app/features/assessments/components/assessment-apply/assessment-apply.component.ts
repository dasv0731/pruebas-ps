import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { TestLoaderService } from '../../services/test-loader.service';
import { TestSection } from '../../models/test.interfaces';

@Component({
  selector: 'app-assessment-apply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assessment-apply.component.html',
  styleUrl: './assessment-apply.component.scss',
})
export class AssessmentApplyComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';
  session: any = null;
  assessment: any = null;
  sections: TestSection[] = [];
  answers: Record<number, number> = {};
  totalQuestions = 0;
  highlightUnanswered = false;
  questionType = 'NUMERIC';
  optionLabels: string[] = [];
  loading = true;
  submitting = false;
  error = '';
  shortName = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private testLoader: TestLoaderService
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
      if (!this.session) {
        this.error = 'Sesión no encontrada';
        return;
      }

      this.assessment = await this.assessmentService.getAssessment(this.session.assessmentId);
      if (!this.assessment) {
        this.error = 'Prueba no encontrada';
        return;
      }

      // Cargar desde el registro local
      this.shortName = this.assessment.shortName;
      const config = this.testLoader.getConfig(this.shortName);

      if (config) {
        this.sections = config.sections;
        this.questionType = config.questionType;
        this.totalQuestions = this.testLoader.getTotalQuestions(this.shortName);
        this.optionLabels = config.optionLabels || [];
      } else {
        // Fallback: parsear del JSON de la DB
        this.parseQuestionsFromDB();
      }

    } catch (err: any) {
      this.error = err.message || 'Error al cargar la sesión';
    } finally {
      this.loading = false;
    }
  }

  parseQuestionsFromDB() {
    if (!this.assessment.questions) return;
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

      await this.assessmentService.completeSession(
        this.sessionId,
        JSON.stringify(answersArray)
      );

      await this.assessmentService.scoreSession(this.sessionId, answersArray, this.shortName);

      this.router.navigate([
        '/cases', this.caseId,
        'subjects', this.subjectId,
        'assessments',
      ]);
    } catch (err: any) {
      this.error = err.message || 'Error al enviar respuestas';
    } finally {
      this.submitting = false;
    }
  }
}