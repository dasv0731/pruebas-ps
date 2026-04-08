import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InterviewService } from '../../services/interview.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { CaseService } from '../../../../core/services/case.service';

@Component({
  selector: 'app-interview-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-list.component.html',
  styleUrl: './interview-list.component.scss',
})
export class InterviewListComponent implements OnInit {
  caseId = '';
  subjectId = '';
  subject: any = null;
  interviews: any[] = [];
  loading = true;
  caseLocked = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private interviewService: InterviewService,
    private subjectService: SubjectService,
    private caseService: CaseService
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
      const caseData = await this.caseService.getById(this.caseId);
      this.caseLocked = caseData?.status === 'COMPLETED';
      this.interviews = await this.interviewService.listBySubject(this.subjectId);
      this.interviews.sort((a: any, b: any) =>
        (b.interviewDate || '').localeCompare(a.interviewDate || '')
      );
    } catch (err: any) {
      this.error = err.message || 'Error al cargar entrevistas';
    } finally {
      this.loading = false;
    }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      COMPLETED: 'Sin análisis',
      ANALYZED: 'Analizada',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-pending',
      COMPLETED: 'badge-in-progress',
      ANALYZED: 'badge-active',
    };
    return map[status] || '';
  }

  goToNew() {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'interviews', 'new',
    ]);
  }

  goToEdit(interviewId: string) {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'interviews', interviewId, 'edit',
    ]);
  }

  async onDelete(interviewId: string) {
    if (!confirm('¿Está segura de eliminar esta entrevista?')) {
      return;
    }
    try {
      await this.interviewService.delete(interviewId);
      await this.loadData();
    } catch (err: any) {
      this.error = err.message || 'Error al eliminar la entrevista';
    }
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId]);
  }
}