import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseService } from '../../../../core/services/case.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { SubjectReportService } from '../../../subjects/services/subject-report.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-case-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-report.component.html',
  styleUrl: './case-report.component.scss',
})
export class CaseReportComponent implements OnInit {
  caseId = '';
  caseData: any = null;
  subjects: any[] = [];
  subjectReports: any[] = [];
  caseReport: any = null;
  caseReportContent = '';
  loading = true;
  generating = false;
  editing = false;
  error = '';
  readiness: { ready: boolean; approved: number; missing: number } = { ready: false, approved: 0, missing: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CaseService,
    private subjectService: SubjectService,
    private subjectReportService: SubjectReportService,
    private aiService: AIService
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;
      this.error = '';

      this.caseData = await this.caseService.getById(this.caseId);
      this.subjects = await this.subjectService.listByCase(this.caseId);

      // Cargar informes de cada implicado
      this.subjectReports = [];
      for (const subject of this.subjects) {
        const report = await this.subjectReportService.getSubjectReport(subject.id);
        this.subjectReports.push({
          subjectId: subject.id,
          subjectName: `${subject.firstName} ${subject.lastName}`,
          subjectType: subject.subjectType,
          report,
          status: report?.status || 'PENDIENTE',
        });
      }

      // Verificar si se puede generar
      this.readiness = await this.subjectReportService.canGenerateCaseReport(
        this.caseId,
        this.subjects.length
      );

      // Cargar informe del caso
      this.caseReport = await this.subjectReportService.getCaseReport(this.caseId);
      if (this.caseReport) {
        this.caseReportContent = this.caseReport.content;
      }

    } catch (err: any) {
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  async generateCaseReport() {
    if (!this.readiness.ready) {
      this.error = `Faltan ${this.readiness.missing} informes de implicados por aprobar.`;
      return;
    }

    try {
      this.generating = true;
      this.error = '';

      const reports = this.subjectReports
        .filter((sr) => sr.report && sr.report.status === 'APPROVED')
        .map((sr) => ({
          subjectName: sr.subjectName,
          report: sr.report.content,
        }));

      const response: AIResponse = await this.aiService.generateCaseReport(reports);

      if (response.success && response.content) {
        await this.subjectReportService.saveCaseReport(
          this.caseId,
          response.content,
          response.model || 'claude-sonnet-4-20250514'
        );
        this.caseReportContent = response.content;
        this.caseReport = { content: response.content, status: 'DRAFT' };
      } else {
        this.error = response.error || 'Error al generar informe del caso';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar informe del caso';
    } finally {
      this.generating = false;
    }
  }

  async saveCaseReportEdit() {
    try {
      this.error = '';
      await this.subjectReportService.saveCaseReport(
        this.caseId, this.caseReportContent, 'MANUAL'
      );
      this.caseReport = { ...this.caseReport, content: this.caseReportContent, status: 'DRAFT' };
      this.editing = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar';
    }
  }

  async changeStatus(newStatus: string) {
    if (!this.caseReport?.id) return;
    try {
      this.error = '';
      await this.subjectReportService.updateCaseReportStatus(this.caseReport.id, newStatus);
      this.caseReport.status = newStatus;
    } catch (err: any) {
      this.error = err.message || 'Error al cambiar estado';
    }
  }

  isCaseReportLocked(): boolean {
    return this.caseReport?.status === 'APPROVED';
  }

  getSubjectStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      REVIEWED: 'Revisado',
      APPROVED: 'Aprobado',
      PENDIENTE: 'Sin informe',
    };
    return map[status] || status;
  }

  getSubjectStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-pending',
      REVIEWED: 'badge-in-progress',
      APPROVED: 'badge-active',
      PENDIENTE: 'badge-archived',
    };
    return map[status] || '';
  }

  getCaseStatusLabel(status: string): string {
    const map: Record<string, string> = {
      BLOCKED: 'Bloqueado',
      READY: 'Listo',
      DRAFT: 'Borrador',
      REVIEWED: 'Revisado',
      APPROVED: 'Aprobado',
      STALE: 'Desactualizado',
    };
    return map[status] || status;
  }

  getCaseStatusClass(status: string): string {
    const map: Record<string, string> = {
      BLOCKED: 'badge-archived',
      READY: 'badge-in-progress',
      DRAFT: 'badge-pending',
      REVIEWED: 'badge-in-progress',
      APPROVED: 'badge-active',
      STALE: 'badge-stale',
    };
    return map[status] || '';
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }
}