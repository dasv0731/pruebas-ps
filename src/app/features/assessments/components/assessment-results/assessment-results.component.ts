import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { TestLoaderService } from '../../services/test-loader.service';
import { getTestInterpretation } from '../../tests/test-registry';

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
    private aiService: AIService,
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

      const shortName = this.assessment?.shortName || '';
      const interpretation = getTestInterpretation(shortName);

      let aiData: string;
      let systemPrompt: string | undefined;
      let maxTokens: number | undefined;

      if (interpretation) {
        // Usar interpretación modular
        const scoringResult = this.testLoader.score(shortName, this.answers);
        if (scoringResult) {
          const aiInput = interpretation.buildAIInput(scoringResult);
          aiData = JSON.stringify(aiInput);
          systemPrompt = interpretation.systemPrompt;
          maxTokens = interpretation.maxTokens;
        } else {
          aiData = this.buildFallbackData();
        }
      } else {
        aiData = this.buildFallbackData();
      }

      const response: AIResponse = await this.aiService.generateAssessmentInterpretation(
        aiData, systemPrompt, maxTokens
      );

      if (response.success && response.content) {
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

  private buildFallbackData(): string {
    return JSON.stringify({
      assessmentName: this.assessment?.name,
      totalScore: this.scoring.totalScore,
      maxScore: this.getMaxPossibleScore(),
      percentage: this.getPercentage(),
    });
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