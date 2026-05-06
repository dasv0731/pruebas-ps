import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluationService } from '../../services/evaluation.service';
import { CdiScoringService } from '../../../../core/services/cdi-scoring.service';
import { TestLoaderService } from '../../../assessments/services/test-loader.service';
import { TestSection, TestQuestion } from '../../../assessments/models/test.interfaces';

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
  conditionalSections: Record<string, boolean | undefined> = {};
  highlightUnanswered = false;
  questionType = 'NUMERIC';
  optionLabels: string[] = [];
  shortName = '';
  loading = true;
  submitting = false;
  error = '';

  // Pagination / instructions
  phase: 'instructions' | 'questions' = 'questions';
  globalInstructions = '';
  questionsPerPage = 0;
  currentPage = 0;
  allQuestions: TestQuestion[] = [];
  paginateBySection = false;
  currentSectionIndex = 0;

  get isPaginated(): boolean { return this.questionsPerPage > 0; }
  get totalPages(): number { return Math.ceil(this.allQuestions.length / this.questionsPerPage); }
  get isLastPage(): boolean { return this.currentPage === this.totalPages - 1; }
  get currentPageQuestions(): TestQuestion[] {
    const start = this.currentPage * this.questionsPerPage;
    return this.allQuestions.slice(start, start + this.questionsPerPage);
  }
  get currentSection(): TestSection | null {
    return this.paginateBySection ? (this.sections[this.currentSectionIndex] ?? null) : null;
  }
  get isLastSection(): boolean { return this.currentSectionIndex === this.sections.length - 1; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationService,
    private testLoader: TestLoaderService,
    private cdiScoringService: CdiScoringService,
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

        if (config.questionsPerPage) {
          this.questionsPerPage = config.questionsPerPage;
          this.allQuestions = config.sections.flatMap((s) => s.questions);
        }
        if (config.paginateBySection) {
          this.paginateBySection = true;
        }
        if (config.globalInstructions) {
          this.globalInstructions = config.globalInstructions;
          this.phase = 'instructions';
        }
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

  startTest() {
    this.phase = 'questions';
    window.scrollTo(0, 0);
  }

  nextSection() {
    const section = this.sections[this.currentSectionIndex];
    if (section.conditional && this.conditionalSections[section.title] === undefined) {
      this.error = 'Debe indicar Sí o No antes de continuar.';
      this.highlightUnanswered = true;
      setTimeout(() => {
        const el = document.querySelector('.gate-pending-highlight');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    if (!section.conditional || this.conditionalSections[section.title] === true) {
      const unanswered = section.questions.filter((q) => this.answers[q.index] === undefined);
      if (unanswered.length > 0) {
        this.error = `Faltan ${unanswered.length} preguntas por responder en esta sección.`;
        this.highlightUnanswered = true;
        setTimeout(() => {
          const el = document.querySelector('.unanswered');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }
    this.error = '';
    this.highlightUnanswered = false;
    this.currentSectionIndex++;
    window.scrollTo(0, 0);
  }

  prevSection() {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.error = '';
      this.highlightUnanswered = false;
      window.scrollTo(0, 0);
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.error = '';
      this.highlightUnanswered = false;
      window.scrollTo(0, 0);
    }
  }

  nextPage() {
    const unansweredOnPage = this.currentPageQuestions.filter(
      (q) => this.answers[q.index] === undefined
    );
    if (unansweredOnPage.length > 0) {
      this.error = `Faltan ${unansweredOnPage.length} preguntas por responder en esta página.`;
      this.highlightUnanswered = true;
      setTimeout(() => {
        const el = document.querySelector('.unanswered');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    this.error = '';
    this.highlightUnanswered = false;
    this.currentPage++;
    window.scrollTo(0, 0);
  }

  selectOption(questionIndex: number, value: number) {
    this.answers[questionIndex] = value;
    if (this.highlightUnanswered && this.isComplete()) {
      this.highlightUnanswered = false;
      this.error = '';
    }
  }

  setConditionalSection(title: string, applies: boolean) {
    this.conditionalSections[title] = applies;
    if (!applies) {
      const section = this.sections.find((s) => s.title === title);
      if (section) {
        for (const q of section.questions) {
          delete this.answers[q.index];
        }
      }
    }
    if (this.highlightUnanswered && this.isComplete()) {
      this.highlightUnanswered = false;
      this.error = '';
    }
  }

  isConditionalEnabled(section: TestSection): boolean {
    return this.conditionalSections[section.title] === true;
  }

  isConditionalDisabled(section: TestSection): boolean {
    return this.conditionalSections[section.title] === false;
  }

  isConditionalPending(section: TestSection): boolean {
    return !!section.conditional && this.conditionalSections[section.title] === undefined;
  }

  isSelected(questionIndex: number, value: number): boolean {
    return this.answers[questionIndex] === value;
  }

  getAnsweredCount(): number {
    return Object.keys(this.answers).length;
  }

  getEffectiveTotal(): number {
    if (this.isPaginated) return this.allQuestions.length;
    return this.sections
      .filter((s) => !s.conditional || this.conditionalSections[s.title] === true)
      .reduce((sum, s) => sum + s.questions.length, 0);
  }

  getAnsweredInCurrentSection(): number {
    if (!this.currentSection) return 0;
    return this.currentSection.questions.filter((q) => this.answers[q.index] !== undefined).length;
  }

  isComplete(): boolean {
    const pendingGate = this.sections.some(
      (s) => s.conditional && this.conditionalSections[s.title] === undefined,
    );
    if (pendingGate) return false;
    return this.getUnanswered().length === 0;
  }

  getUnanswered(): number[] {
    if (this.isPaginated) {
      return this.allQuestions
        .filter((q) => this.answers[q.index] === undefined)
        .map((q) => q.index);
    }
    const unanswered: number[] = [];
    for (const section of this.sections) {
      if (section.conditional && this.conditionalSections[section.title] !== true) continue;
      for (const q of section.questions) {
        if (this.answers[q.index] === undefined) {
          unanswered.push(q.index);
        }
      }
    }
    return unanswered;
  }

  async onSubmit() {
    const pendingGates = this.sections.filter(
      (s) => s.conditional && this.conditionalSections[s.title] === undefined,
    );
    if (pendingGates.length > 0) {
      this.error = 'Debe indicar Sí o No en cada sección condicional antes de continuar.';
      this.highlightUnanswered = true;
      setTimeout(() => {
        const el = document.querySelector('.gate-pending');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

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

      await this.evaluationService.saveAnswersPublic(
        this.sessionId,
        JSON.stringify(answersArray),
        'COMPLETED',
        this.evalId
      );

       // Scoring: CDI va por Lambda (backend), el resto por el service viejo (frontend)
      if (this.shortName === 'CDI') {
        await this.cdiScoringService.scorePublic(this.sessionId);
      } else {
        await this.evaluationService.scorePublic(this.sessionId, answersArray);
      }

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