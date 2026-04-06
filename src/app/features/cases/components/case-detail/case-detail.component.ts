import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseService } from '../../../../core/services/case.service';
import { SubjectService } from '../../../../core/services/subject.service';
import {
  CASE_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  SUBJECT_STATUS_LABELS,
} from '../../../../core/models/types';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-detail.component.html',
  styleUrl: './case-detail.component.scss',
})
export class CaseDetailComponent implements OnInit {
  caseId = '';
  caseData: any = null;
  subjects: any[] = [];
  loading = true;
  error = '';
  statusLabels: Record<string, string> = CASE_STATUS_LABELS;
  subjectTypeLabels: Record<string, string> = SUBJECT_TYPE_LABELS;
  subjectStatusLabels: Record<string, string> = SUBJECT_STATUS_LABELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CaseService,
    private subjectService: SubjectService
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
    } catch (err: any) {
      this.error = err.message || 'Error al cargar el caso';
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/cases']);
  }

  goToEdit() {
    this.router.navigate(['/cases', this.caseId, 'edit']);
  }

  goToNewSubject() {
    this.router.navigate(['/cases', this.caseId, 'subjects', 'new']);
  }

  goToEditSubject(subjectId: string) {
    this.router.navigate(['/cases', this.caseId, 'subjects', subjectId, 'edit']);
  }

  async onDeleteSubject(subjectId: string) {
    if (!confirm('¿Está segura de eliminar este implicado?')) {
      return;
    }
    try {
      await this.subjectService.delete(subjectId);
      await this.loadData();
    } catch (err: any) {
      this.error = err.message || 'Error al eliminar el implicado';
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge-active',
      IN_PROGRESS: 'badge-in-progress',
      COMPLETED: 'badge-completed',
      ARCHIVED: 'badge-archived',
      PENDING: 'badge-pending',
      IN_EVALUATION: 'badge-in-progress',
      EVALUATED: 'badge-completed',
      REPORT_DRAFT: 'badge-in-progress',
      REPORT_APPROVED: 'badge-completed',
    };
    return map[status] || '';
  }

  goToAssessments(subjectId: string) {
    this.router.navigate(['/cases', this.caseId, 'subjects', subjectId, 'assessments']);
  }

  goToInterviews(subjectId: string) {
    this.router.navigate(['/cases', this.caseId, 'subjects', subjectId, 'interviews']);
  }

  goToSummary(subjectId: string) {
    this.router.navigate(['/cases', this.caseId, 'subjects', subjectId, 'summary']);
  }

  goToReport() {
    this.router.navigate(['/cases', this.caseId, 'report']);
  }
}