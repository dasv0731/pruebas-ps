import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService } from '../../../../core/services/subject.service';
import { AssessmentService } from '../../../assessments/services/assessment.service';
import { InterviewService } from '../../../interviews/services/interview.service';
import { SubjectReportService } from '../../services/subject-report.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-subject-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subject-summary.component.html',
  styleUrl: './subject-summary.component.scss',
})
export class SubjectSummaryComponent implements OnInit {
  caseId = '';
  subjectId = '';
  subject: any = null;
  interpretations: any[] = [];
  analyses: any[] = [];
  assessmentReport: any = null;
  interviewReport: any = null;
  loading = true;
  generatingAssessment = false;
  generatingInterview = false;
  editingAssessment = false;
  editingInterview = false;
  assessmentReportContent = '';
  interviewReportContent = '';
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectService: SubjectService,
    private assessmentService: AssessmentService,
    private interviewService: InterviewService,
    private subjectReportService: SubjectReportService,
    private aiService: AIService
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';

      this.subject = await this.subjectService.getById(this.subjectId);

      // Cargar interpretaciones de pruebas
      const sessions = await this.assessmentService.listSessionsBySubject(this.subjectId);
      this.interpretations = [];
      for (const session of sessions) {
        if (session.status === 'SCORED') {
          const scoring = await this.assessmentService.getScoring(session.id);
          if (scoring) {
            const interp = await this.assessmentService.getInterpretation(scoring.id);
            if (interp) {
              this.interpretations.push({
                assessmentName: session.assessmentName,
                content: interp.content,
              });
            }
          }
        }
      }

      // Cargar análisis de entrevistas
      const interviews = await this.interviewService.listBySubject(this.subjectId);
      this.analyses = [];
      for (const interview of interviews) {
        if (interview.status === 'COMPLETED') {
          const analysis = await this.interviewService.getAnalysis(interview.id);
          if (analysis) {
            this.analyses.push({
              date: interview.interviewDate,
              content: analysis.content,
            });
          }
        }
      }

      // Cargar consolidados existentes
      this.assessmentReport = await this.subjectReportService.getAssessmentReport(this.subjectId);
      if (this.assessmentReport) {
        this.assessmentReportContent = this.assessmentReport.content;
      }

      this.interviewReport = await this.subjectReportService.getInterviewReport(this.subjectId);
      if (this.interviewReport) {
        this.interviewReportContent = this.interviewReport.content;
      }

    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  async generateAssessmentReport() {
    if (this.interpretations.length === 0) {
      this.error = 'No hay interpretaciones de pruebas para consolidar. Genere interpretaciones primero.';
      return;
    }

    try {
      this.generatingAssessment = true;
      this.error = '';

      const texts = this.interpretations.map(
        (i) => `--- ${i.assessmentName} ---\n${i.content}`
      );

      const response: AIResponse = await this.aiService.generateSubjectAssessmentReport(texts);

      if (response.success && response.content) {
        await this.subjectReportService.saveAssessmentReport(
          this.subjectId,
          response.content,
          response.model || 'claude-sonnet-4-20250514'
        );
        this.assessmentReportContent = response.content;
        this.assessmentReport = { content: response.content };
      } else {
        this.error = response.error || 'Error al generar consolidado de pruebas';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar consolidado de pruebas';
    } finally {
      this.generatingAssessment = false;
    }
  }

  async generateInterviewReport() {
    if (this.analyses.length === 0) {
      this.error = 'No hay análisis de entrevistas para consolidar. Genere análisis primero.';
      return;
    }

    try {
      this.generatingInterview = true;
      this.error = '';

      const texts = this.analyses.map(
        (a) => `--- Entrevista ${a.date} ---\n${a.content}`
      );

      const response: AIResponse = await this.aiService.generateSubjectInterviewReport(texts);

      if (response.success && response.content) {
        await this.subjectReportService.saveInterviewReport(
          this.subjectId,
          response.content,
          response.model || 'claude-sonnet-4-20250514'
        );
        this.interviewReportContent = response.content;
        this.interviewReport = { content: response.content };
      } else {
        this.error = response.error || 'Error al generar consolidado de entrevistas';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar consolidado de entrevistas';
    } finally {
      this.generatingInterview = false;
    }
  }

  async saveAssessmentEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveAssessmentReport(
        this.subjectId,
        this.assessmentReportContent,
        'MANUAL'
      );
      this.assessmentReport = { content: this.assessmentReportContent };
      this.editingAssessment = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  async saveInterviewEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveInterviewReport(
        this.subjectId,
        this.interviewReportContent,
        'MANUAL'
      );
      this.interviewReport = { content: this.interviewReportContent };
      this.editingInterview = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }
}