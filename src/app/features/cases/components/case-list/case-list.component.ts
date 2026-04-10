import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaseService } from '../../../../core/services/case.service';
import { CASE_STATUS_LABELS, CaseStatus } from '../../../../core/models/types';
import { SubjectReportService } from '../../../subjects/services/subject-report.service';

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.scss',
})
export class CaseListComponent implements OnInit {
  cases: any[] = [];
  loading = true;
  error = '';
  caseReportStatus: Record<string, string> = {};
  statusLabels: Record<string, string> = CASE_STATUS_LABELS;
  
  constructor(
    private caseService: CaseService,
    private router: Router,
    private subjectReportService: SubjectReportService
  ) {}

  async ngOnInit() {
    await this.loadCases();
  }

  async loadCases() {
    try {
      this.loading = true;
      this.error = '';
      this.cases = await this.caseService.list();
      // Cargar estado de informe final por caso
      this.caseReportStatus = {};
      for (const c of this.cases) {
        const report = await this.subjectReportService.getCaseReport(c.id);
        if (report) {
          this.caseReportStatus[c.id] = report.status;
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar los casos';
    } finally {
      this.loading = false;
    }
  }

  goToNew() {
    this.router.navigate(['/cases/new']);
  }

  goToDetail(caseId: string) {
    this.router.navigate(['/cases', caseId]);
  }

  goToEdit(caseId: string) {
    this.router.navigate(['/cases', caseId, 'edit']);
  }

  async onDelete(caseId: string) {
    if (!confirm('¿Está segura de eliminar este caso? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await this.caseService.delete(caseId);
      await this.loadCases();
    } catch (err: any) {
      this.error = err.message || 'Error al eliminar el caso';
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge-active',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-completed',
      ARCHIVED: 'badge-archived',
    };
    return map[status] || '';
  }

  goToReport(caseId: string) {
    this.router.navigate(['/cases', caseId, 'report']);
  }
}