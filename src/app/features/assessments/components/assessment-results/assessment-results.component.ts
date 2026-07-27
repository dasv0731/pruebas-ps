import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { TestLoaderService } from '../../services/test-loader.service';
import { getTestInterpretation } from '../../tests/test-registry';
import { buildStaiAIInput, staiNormedScores, StaiNormedResult } from '../../tests/stai/stai.interpretation';
import { buildStaicAIInput, staicNormedScores, StaicNormedResult } from '../../tests/staic/staic.interpretation';

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

  // Puntuaciones baremadas (STAI / STAIC) para mostrar centil·decatipo / percentil·S.
  staiNormed: StaiNormedResult | null = null;
  staicNormed: StaicNormedResult | null = null;

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

      // CDI tiene su propio componente de resultados. Redirigir.
      if (this.assessment?.shortName === 'CDI') {
        this.router.navigate([
          '/cases', this.caseId,
          'subjects', this.subjectId,
          'assessments', this.sessionId, 'results-cdi',
        ]);
        return;
      }

      // CUIDA se corrige en TEACorrige. Redirigir según si ya tiene scoring.
      if (this.assessment?.shortName === 'CUIDA') {
        const cuidaScoring = await this.assessmentService.getScoring(this.sessionId);
        if (cuidaScoring?.source === 'TEA' && cuidaScoring?.isCurrent) {
          this.router.navigate([
            '/cases', this.caseId,
            'subjects', this.subjectId,
            'assessments', this.sessionId, 'results-cuida',
          ]);
        } else {
          this.router.navigate([
            '/cases', this.caseId,
            'subjects', this.subjectId,
            'assessments', this.sessionId, 'cuida-pending',
          ]);
        }
        return;
      }

      // TAMAI se corrige en TEACorrige. Redirigir según si ya tiene scoring.
      if (this.assessment?.shortName === 'TAMAI') {
        const tamaiScoring = await this.assessmentService.getScoring(this.sessionId);
        if (tamaiScoring?.source === 'TEA' && tamaiScoring?.isCurrent) {
          this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'results-tamai']);
        } else {
          this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'tamai-pending']);
        }
        return;
      }

      // PAI se corrige en TEACorrige. Redirigir según si ya tiene scoring.
      if (this.assessment?.shortName === 'PAI') {
        const paiScoring = await this.assessmentService.getScoring(this.sessionId);
        if (paiScoring?.source === 'TEA' && paiScoring?.isCurrent) {
          this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'results-pai']);
        } else {
          this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'pai-pending']);
        }
        return;
      }

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

      // Baremar STAI / STAIC con sexo y edad de la sesión (Tabla 9 / Tabla 7).
      this.computeNormedScores();
    } catch (err: any) {
      this.error = err.message || 'Error al cargar resultados';
    } finally {
      this.loading = false;
    }
  }

  private computeNormedScores(): void {
    this.staiNormed = null;
    this.staicNormed = null;
    const shortName = this.assessment?.shortName || '';
    if ((shortName !== 'STAI' && shortName !== 'STAIC') || !this.answers.length) return;

    const scoringResult = this.testLoader.score(shortName, this.answers);
    if (!scoringResult) return;
    const estado = scoringResult.subscales?.['Ansiedad Estado'] ?? 0;
    const rasgo = scoringResult.subscales?.['Ansiedad Rasgo'] ?? 0;
    const sex = this.session?.subjectSex ?? null;
    const age = this.session?.subjectAgeYears ?? null;

    if (shortName === 'STAI') {
      this.staiNormed = staiNormedScores(estado, rasgo, sex, age);
    } else {
      this.staicNormed = staicNormedScores(estado, rasgo, sex, age);
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

  isAutomaticInterpretation(): boolean {
    return this.assessment?.shortName === 'STAI' || this.assessment?.shortName === 'STAIC';
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
          const sex = this.session?.subjectSex ?? null;
          const age = this.session?.subjectAgeYears ?? null;
          // STAI / STAIC se baremán por sexo·edad (Tabla 9 / Tabla 7); la ruta
          // genérica buildAIInput no recibe esos datos, así que se usa el
          // builder específico con el baremo aplicado.
          let aiInput: unknown;
          if (shortName === 'STAI') {
            aiInput = buildStaiAIInput(scoringResult, sex, age);
          } else if (shortName === 'STAIC') {
            aiInput = buildStaicAIInput(scoringResult, sex, age);
          } else {
            aiInput = interpretation.buildAIInput(scoringResult);
          }
          aiData = JSON.stringify(aiInput);
          systemPrompt = interpretation.systemPrompt;
          maxTokens = interpretation.maxTokens;
        } else {
          aiData = this.buildFallbackData();
        }
      } else {
        aiData = this.buildFallbackData();
      }

      const response: AIResponse = await this.aiService.generateAssessmentInterpretation(shortName, aiData);

      if (response.success && response.content) {
        await this.assessmentService.saveInterpretation(
          this.scoring.id,
          response.content,
          response.model || 'deepseek-chat',
          'AI',
          response,
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
