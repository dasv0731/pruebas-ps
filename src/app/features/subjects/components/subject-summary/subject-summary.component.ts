import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService } from '../../../../core/services/subject.service';
import { AssessmentService } from '../../../assessments/services/assessment.service';
import { InterviewService } from '../../../interviews/services/interview.service';
import { SubjectReportService } from '../../services/subject-report.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { CaseService } from '../../../../core/services/case.service';
import { ReportPrintService } from '../../../../core/services/report-print.service';
import { SUBJECT_TYPE_LABELS, SubjectType } from '../../../../core/models/types';

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
  subjectReport: any = null;
  loading = true;
  caseLocked = false;
  generatingAssessment = false;
  totalScoredTests = 0;
  totalInterviews = 0;
  totalCompletedInterviews = 0;
  generatingInterview = false;
  generatingSubjectReport = false;
  editingAssessment = false;
  editingInterview = false;
  editingSubjectReport = false;
  assessmentReportContent = '';
  interviewReportContent = '';
  subjectReportContent = '';
  caseNumber = '';
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subjectService: SubjectService,
    private assessmentService: AssessmentService,
    private interviewService: InterviewService,
    private subjectReportService: SubjectReportService,
    private aiService: AIService,
    private caseService: CaseService,
    private reportPrint: ReportPrintService
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
      const caseData = await this.caseService.getById(this.caseId);
      this.caseLocked = caseData?.status === 'COMPLETED';
      this.caseNumber = caseData?.caseNumber || '';
      this.subject = await this.subjectService.getById(this.subjectId);

      const sessions = await this.assessmentService.listSessionsBySubject(this.subjectId);
      this.totalScoredTests = sessions.filter((s: any) => s.status === 'SCORED').length;
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

      const interviews = await this.interviewService.listBySubject(this.subjectId);
      this.totalInterviews = interviews.filter((i: any) => i.status === 'COMPLETED' || i.status === 'ANALYZED').length;
      this.analyses = [];
      for (const interview of interviews) {
        if (interview.status === 'COMPLETED' || interview.status === 'ANALYZED') {
          const analysis = await this.interviewService.getAnalysis(interview.id);
          if (analysis) {
            this.analyses.push({
              date: interview.interviewDate,
              content: analysis.content,
            });
          }
        }
      }
      this.totalCompletedInterviews = this.totalInterviews;

      this.assessmentReport = await this.subjectReportService.getAssessmentReport(this.subjectId);
      if (this.assessmentReport) {
        this.assessmentReportContent = this.assessmentReport.content;
      }

      this.interviewReport = await this.subjectReportService.getInterviewReport(this.subjectId);
      if (this.interviewReport) {
        this.interviewReportContent = this.interviewReport.content;
      }

      this.subjectReport = await this.subjectReportService.getSubjectReport(this.subjectId);
      if (this.subjectReport) {
        this.subjectReportContent = this.subjectReport.content;
      }
    
    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  // ── Consolidado pruebas ──

  async generateAssessmentReport() {
    if (this.interpretations.length === 0) {
      this.error = 'No hay interpretaciones de pruebas para consolidar.';
      return;
    }
    try {
      this.generatingAssessment = true;
      this.error = '';
      const texts = this.interpretations.map((i) => `--- ${i.assessmentName} ---\n${i.content}`);
      const response: AIResponse = await this.aiService.generateSubjectAssessmentReport(texts);
      if (response.success && response.content) {
        await this.subjectReportService.saveAssessmentReport(this.subjectId, response.content, response.model || 'deepseek-chat');
        this.assessmentReportContent = response.content;
        this.assessmentReport = { content: response.content };
      } else {
        this.error = response.error || 'Error al generar consolidado';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar consolidado';
    } finally {
      this.generatingAssessment = false;
    }
  }

  async saveAssessmentEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveAssessmentReport(this.subjectId, this.assessmentReportContent, 'MANUAL');
      this.assessmentReport = { content: this.assessmentReportContent };
      this.editingAssessment = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  // ── Consolidado entrevistas ──

  async generateInterviewReport() {
    if (this.analyses.length === 0) {
      this.error = 'No hay análisis de entrevistas para consolidar.';
      return;
    }
    try {
      this.generatingInterview = true;
      this.error = '';
      const texts = this.analyses.map((a) => `--- Entrevista ${a.date} ---\n${a.content}`);
      const response: AIResponse = await this.aiService.generateSubjectInterviewReport(texts);
      if (response.success && response.content) {
        await this.subjectReportService.saveInterviewReport(this.subjectId, response.content, response.model || 'deepseek-chat');
        this.interviewReportContent = response.content;
        this.interviewReport = { content: response.content };
      } else {
        this.error = response.error || 'Error al generar consolidado';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar consolidado';
    } finally {
      this.generatingInterview = false;
    }
  }

  async saveInterviewEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveInterviewReport(this.subjectId, this.interviewReportContent, 'MANUAL');
      this.interviewReport = { content: this.interviewReportContent };
      this.editingInterview = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  // ── Informe final del implicado ──

  canGenerateSubjectReport(): boolean {
    return !!this.assessmentReportContent || !!this.interviewReportContent;
  }

  getMissingConsolidado(): 'pruebas' | 'entrevistas' | null {
    if (!this.assessmentReportContent) return 'pruebas';
    if (!this.interviewReportContent) return 'entrevistas';
    return null;
  }

  async generateSubjectReport() {
    if (!this.canGenerateSubjectReport()) {
      this.error = 'Necesita al menos un consolidado (pruebas o entrevistas) para generar el informe final.';
      return;
    }
    const missing = this.getMissingConsolidado();
    if (missing) {
      const ok = confirm(
        `Se generará el informe del implicado SIN el consolidado de ${missing}. ` +
        `El informe dejará constancia de que esa fuente no está disponible. ¿Continuar?`
      );
      if (!ok) return;
    }
    try {
      this.generatingSubjectReport = true;
      this.error = '';
      const response: AIResponse = await this.aiService.generateSubjectReport(
        this.assessmentReportContent || null,
        this.interviewReportContent || null
      );
      if (response.success && response.content) {
        await this.subjectReportService.saveSubjectReport(
          this.subjectId, this.caseId, response.content, response.model || 'deepseek-chat'
        );
        this.subjectReportContent = response.content;
        this.subjectReport = await this.subjectReportService.getSubjectReport(this.subjectId);
        this.subjectReportContent = this.subjectReport?.content || response.content;
      } else {
        this.error = response.error || 'Error al generar informe final';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar informe final';
    } finally {
      this.generatingSubjectReport = false;
    }
  }

  async saveSubjectReportEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveSubjectReport(
        this.subjectId, this.caseId, this.subjectReportContent, 'MANUAL'
      );
      this.subjectReport = await this.subjectReportService.getSubjectReport(this.subjectId);
      this.subjectReportContent = this.subjectReport?.content || this.subjectReportContent;
      this.editingSubjectReport = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  async changeSubjectReportStatus(newStatus: string) {
    if (!this.subjectReport?.id) return;
    try {
      this.error = '';

      // Si se desaprueba (de APPROVED a DRAFT), invalidar CaseReport
      if (this.subjectReport.status === 'APPROVED' && newStatus === 'DRAFT') {
        const caseReport = await this.subjectReportService.getCaseReport(this.caseId);
        if (caseReport && (caseReport.status === 'APPROVED' || caseReport.status === 'REVIEWED')) {
          await this.subjectReportService.updateCaseReportStatus(caseReport.id, 'STALE');
        }
      }

      await this.subjectReportService.updateSubjectReportStatus(this.subjectReport.id, newStatus);
      this.subjectReport.status = newStatus;
    } catch (err: any) {
      this.error = err.message || 'Error al cambiar estado';
    }
  }

  isSubjectReportLocked(): boolean {
    return this.subjectReport?.status === 'APPROVED';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      REVIEWED: 'Revisado',
      APPROVED: 'Aprobado',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-pending',
      REVIEWED: 'badge-in-progress',
      APPROVED: 'badge-active',
    };
    return map[status] || '';
  }

  // ── Impresión / exportación a PDF ──

  private subjectFullName(): string {
    return `${this.subject?.firstName || ''} ${this.subject?.lastName || ''}`.trim();
  }

  private subjectRoleLabel(): string {
    const t = this.subject?.subjectType;
    return t ? (SUBJECT_TYPE_LABELS[t as SubjectType] || t) : '';
  }

  printAssessmentReport() {
    this.reportPrint.print({
      title: 'Informe consolidado de pruebas',
      caseNumber: this.caseNumber,
      subjectName: this.subjectFullName(),
      subjectType: this.subjectRoleLabel(),
      documentId: this.subject?.documentId,
      generatedAt: this.assessmentReport?.generatedAt,
      content: this.assessmentReportContent,
    });
  }

  printInterviewReport() {
    this.reportPrint.print({
      title: 'Informe consolidado de entrevistas',
      caseNumber: this.caseNumber,
      subjectName: this.subjectFullName(),
      subjectType: this.subjectRoleLabel(),
      documentId: this.subject?.documentId,
      generatedAt: this.interviewReport?.generatedAt,
      content: this.interviewReportContent,
    });
  }

  printSubjectReport() {
    this.reportPrint.print({
      title: 'Informe pericial del implicado',
      caseNumber: this.caseNumber,
      subjectName: this.subjectFullName(),
      subjectType: this.subjectRoleLabel(),
      documentId: this.subject?.documentId,
      status: this.subjectReport?.status ? this.getStatusLabel(this.subjectReport.status) : undefined,
      generatedAt: this.subjectReport?.generatedAt,
      content: this.subjectReportContent,
    });
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }
}