import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaseService } from '../../../../core/services/case.service';
import { CASE_STATUS_LABELS, CaseStatus } from '../../../../core/models/types';

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
  statusLabels: Record<string, string> = CASE_STATUS_LABELS;
  
  constructor(
    private caseService: CaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadCases();
  }

  async loadCases() {
    try {
      this.loading = true;
      this.error = '';
      this.cases = await this.caseService.list();
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
}