import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-assessment-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-results.component.html',
  styleUrl: './assessment-results.component.scss',
})
export class AssessmentResultsComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';
  session: any = null;
  assessment: any = null;
  scoring: any = null;
  answers: number[] = [];
  interpretation = '';
  interpretationVersion = 0;
  interpretationDate = '';
  loading = true;
  generating = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: AssessmentService,
    private aiService: AIService
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
      this.scoring = await this.assessmentService.getScoring(this.sessionId);

      if (this.session.answers) {
        try {
          this.answers = JSON.parse(this.session.answers);
        } catch {
          this.answers = [];
        }
      }

      // Cargar interpretación guardada
      if (this.scoring) {
        const saved = await this.assessmentService.getInterpretation(this.scoring.id);
        if (saved) {
          this.interpretation = saved.content;
          this.interpretationVersion = saved.version;
          this.interpretationDate = saved.generatedAt || '';
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
    }
  }

  getMaxPossibleScore(): number {
    if (!this.assessment) return 0;
    return this.assessment.totalQuestions * this.assessment.optionsPerQuestion;
  }

  getPercentage(): number {
    const max = this.getMaxPossibleScore();
    if (max === 0 || !this.scoring) return 0;
    return Math.round((this.scoring.totalScore / max) * 100);
  }

  getSourceLabel(): string {
    if (!this.scoring) return '';
    return this.scoring.source === 'TEA' ? 'TEA Corrige' : 'Baremo local';
  }

  async generateInterpretation() {
    if (!this.scoring) return;

    try {
      this.generating = true;
      this.error = '';

      const scores = {
        assessmentName: this.assessment?.name,
        totalScore: this.scoring.totalScore,
        maxScore: this.getMaxPossibleScore(),
        percentage: this.getPercentage(),
        totalQuestions: this.assessment?.totalQuestions,
        optionsPerQuestion: this.assessment?.optionsPerQuestion,
        rawScores: this.scoring.scores ? JSON.parse(this.scoring.scores) : null,
      };

      const response: AIResponse = await this.aiService.generateAssessmentInterpretation(
        this.assessment?.name || 'Prueba',
        scores
      );

      if (response.success && response.content) {
        // Guardar en base de datos
        await this.assessmentService.saveInterpretation(
          this.scoring.id,
          response.content,
          response.model || 'claude-sonnet-4-20250514'
        );

        this.interpretation = response.content;
        this.interpretationVersion++;
        this.interpretationDate = new Date().toISOString();
      } else {
        this.error = response.error || 'Error al generar interpretación';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar interpretación';
    } finally {
      this.generating = false;
    }
  }

  goBack() {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'assessments',
    ]);
  }

  goToCase() {
    this.router.navigate(['/cases', this.caseId]);
  }
}