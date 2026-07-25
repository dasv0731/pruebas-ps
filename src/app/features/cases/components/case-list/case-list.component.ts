import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaseService, CaseInput } from '../../../../core/services/case.service';
import { CASE_STATUS_LABELS, CaseStatus } from '../../../../core/models/types';
import { SubjectReportService } from '../../../subjects/services/subject-report.service';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.scss',
})
export class CaseListComponent implements OnInit {
  cases: any[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  filteredCases: any[] = [];
  caseReportStatus: Record<string, string> = {};
  statusLabels: Record<string, string> = CASE_STATUS_LABELS;
  newCaseOpen = false;
  editingCaseId = '';
  creatingCase = false;
  newCaseError = '';
  newCase: CaseInput = this.emptyCase();
  
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
      } this.filteredCases = this.cases;
    } catch (err: any) {
      this.error = err.message || 'Error al cargar los casos';
    } finally {
      this.loading = false;
    }
  }

  goToNew() {
    this.newCase = this.emptyCase();
    this.newCaseError = '';
    this.editingCaseId = '';
    this.newCaseOpen = true;
  }

  openEditCase(caseData: any) {
    this.newCase = {
      caseNumber: caseData.caseNumber,
      court: caseData.court ?? '',
      jurisdiction: caseData.jurisdiction ?? '',
      caseType: caseData.caseType ?? '',
      description: caseData.description ?? '',
      notes: caseData.notes ?? '',
      startDate: caseData.startDate ?? '',
      endDate: caseData.endDate ?? '',
      status: caseData.status,
    };
    this.newCaseError = '';
    this.editingCaseId = caseData.id;
    this.newCaseOpen = true;
  }

  closeNewCase() {
    if (!this.creatingCase) this.newCaseOpen = false;
  }

  async createCase() {
    if (!this.newCase.caseNumber.trim()) {
      this.newCaseError = 'El número de caso es obligatorio';
      return;
    }
    try {
      this.creatingCase = true;
      this.newCaseError = '';
      const created = this.editingCaseId
        ? await this.caseService.update(this.editingCaseId, this.newCase)
        : await this.caseService.create(this.newCase);
      this.newCaseOpen = false;
      await this.loadCases();
      if (!this.editingCaseId && created?.id) this.goToDetail(created.id);
    } catch (err: any) {
      this.newCaseError = err.message || 'Error al crear el caso';
    } finally {
      this.creatingCase = false;
    }
  }

  private emptyCase(): CaseInput {
    return {
      caseNumber: '', court: '', jurisdiction: '', caseType: '',
      description: '', notes: '', startDate: '', endDate: '', status: 'ACTIVE',
    };
  }

  goToDetail(caseId: string) {
    this.router.navigate(['/cases', caseId]);
  }

  goToEdit(caseId: string) {
    const caseData = this.cases.find((item) => item.id === caseId);
    if (caseData) this.openEditCase(caseData);
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

  filterCases() {
    if (!this.searchTerm.trim()) {
      this.filteredCases = this.cases;
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredCases = this.cases.filter((c) =>
      c.caseNumber?.toLowerCase().includes(term) ||
      c.court?.toLowerCase().includes(term) ||
      c.caseType?.toLowerCase().includes(term)
    );
  }
}
