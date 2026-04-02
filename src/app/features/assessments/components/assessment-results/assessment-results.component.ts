import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../../services/assessment.service';

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
  loading = true;
  error = '';

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