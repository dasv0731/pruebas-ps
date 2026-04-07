import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';

interface Question {
  index: number;
  text: string;
  options: number;
  textOptions?: string[];
}

interface Section {
  title: string;
  instructions: string;
  legend: string[];
  questions: Question[];
}

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
  sections: Section[] = [];
  answers: Record<number, number> = {};
  totalQuestions = 0;
  loading = true;
  submitting = false;
  questionType = 'NUMERIC';
  error = '';
  isTestMode = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService
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

      console.log('Loading session:', this.sessionId);
      this.session = await this.assessmentService.getSession(this.sessionId);
      console.log('Session:', this.session);
      if (!this.session) {
        this.error = 'Sesión no encontrada';
        return;
      }

      console.log('Loading assessment:', this.session.assessmentId);
      this.assessment = await this.assessmentService.getAssessment(this.session.assessmentId);
      console.log('Assessment:', this.assessment);
      if (!this.assessment) {
        this.error = 'Prueba no encontrada';
        return;
      }

      this.parseQuestions();
      this.totalQuestions = this.sections.reduce((sum, s) => sum + s.questions.length, 0);
      console.log('Total questions:', this.totalQuestions, 'Sections:', this.sections.length);

    } catch (err: any) {
      console.error('LoadData error:', err);
      this.error = err.message || 'Error al cargar la sesión';
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
      let parsed = this.assessment.questions;
      // Deshacer doble stringify si es necesario
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      console.log('Final parsed:', parsed);
      console.log('Type:', parsed.type);

      this.questionType = parsed.type || 'NUMERIC';

      if (parsed.sections) {
        this.sections = parsed.sections.map((s: any) => ({
          ...s,
          legend: s.legend || [],
          questions: s.questions || [],
        }));
      } else if (Array.isArray(parsed)) {
        this.sections = [{
          title: this.assessment.name,
          instructions: '',
          legend: [],
          questions: parsed,
        }];
      }
    } catch (e) {
      console.error('Parse error:', e);
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

      const answersArray = [];
      for (let i = 1; i <= this.totalQuestions; i++) {
        answersArray.push(this.answers[i] || 0);
      }

      await this.assessmentService.updateSession(this.sessionId, {
        answers: JSON.stringify(answersArray),
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      await this.assessmentService.scoreSession(this.sessionId, answersArray);

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