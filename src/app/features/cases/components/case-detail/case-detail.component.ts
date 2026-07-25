import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseService, CaseInput } from '../../../../core/services/case.service';
import { SubjectService } from '../../../../core/services/subject.service';
import { SubjectInput } from '../../../../core/services/subject.service';
import { AssessmentService } from '../../../assessments/services/assessment.service';
import { InterviewService } from '../../../interviews/services/interview.service';
import {
  CASE_STATUS_LABELS,
  SUBJECT_TYPE_LABELS,
  SUBJECT_STATUS_LABELS,
} from '../../../../core/models/types';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-detail.component.html',
  styleUrl: './case-detail.component.scss',
})
export class CaseDetailComponent implements OnInit {
  caseId = '';
  caseData: any = null;
  subjects: any[] = [];
  loading = true;
  error = '';
  caseLocked = false;
  subjectTestStatus: Record<string, { scored: number; total: number }> = {};
  subjectInterviewStatus: Record<string, string> = {};
  statusLabels: Record<string, string> = CASE_STATUS_LABELS;
  subjectTypeLabels: Record<string, string> = SUBJECT_TYPE_LABELS;
  subjectStatusLabels: Record<string, string> = SUBJECT_STATUS_LABELS;
  newSubjectOpen = false;
  editCaseOpen = false;
  savingCase = false;
  editCaseError = '';
  editCase: CaseInput = this.emptyCase();
  creatingSubject = false;
  editingSubjectId = '';
  newSubjectError = '';
  newSubject: SubjectInput = this.emptySubject();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CaseService,
    private subjectService: SubjectService,
    private assessmentService: AssessmentService,
    private interviewService: InterviewService
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
      this.caseLocked = this.caseData?.status === 'COMPLETED';
      this.subjects = await this.subjectService.listByCase(this.caseId);
      // Cargar estado de pruebas y entrevistas por implicado
      this.subjectTestStatus = {};
      this.subjectInterviewStatus = {};
      for (const s of this.subjects) {
        const sessions = await this.assessmentService.listSessionsBySubject(s.id);
        const total = sessions.length;
        const scored = sessions.filter((sess: any) => sess.status === 'SCORED').length;
        this.subjectTestStatus[s.id] = { scored, total };

        const interviews = await this.interviewService.listBySubject(s.id);
        if (interviews.length === 0) {
          this.subjectInterviewStatus[s.id] = 'SIN_ENTREVISTAS';
        } else {
          const allAnalyzed = interviews.every((i: any) => i.status === 'ANALYZED');
          const allCompleted = interviews.every((i: any) => i.status === 'COMPLETED' || i.status === 'ANALYZED');
          if (allAnalyzed) {
            this.subjectInterviewStatus[s.id] = 'ANALYZED';
          } else if (allCompleted) {
            this.subjectInterviewStatus[s.id] = 'COMPLETED';
          } else {
            this.subjectInterviewStatus[s.id] = 'DRAFT';
          }
        }
      }
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
    this.editCase = {
      caseNumber: this.caseData.caseNumber, court: this.caseData.court ?? '',
      jurisdiction: this.caseData.jurisdiction ?? '', caseType: this.caseData.caseType ?? '',
      description: this.caseData.description ?? '', notes: this.caseData.notes ?? '',
      startDate: this.caseData.startDate ?? '', endDate: this.caseData.endDate ?? '',
      status: this.caseData.status,
    };
    this.editCaseError = '';
    this.editCaseOpen = true;
  }

  closeEditCase() {
    if (!this.savingCase) this.editCaseOpen = false;
  }

  async updateCase() {
    if (!this.editCase.caseNumber.trim()) {
      this.editCaseError = 'El número de caso es obligatorio';
      return;
    }
    try {
      this.savingCase = true;
      this.editCaseError = '';
      await this.caseService.update(this.caseId, this.editCase);
      this.editCaseOpen = false;
      await this.loadData();
    } catch (err: any) {
      this.editCaseError = err.message || 'Error al actualizar el caso';
    } finally {
      this.savingCase = false;
    }
  }

  goToNewSubject() {
    this.newSubject = this.emptySubject();
    this.newSubjectError = '';
    this.editingSubjectId = '';
    this.newSubjectOpen = true;
  }

  closeNewSubject() {
    if (!this.creatingSubject) this.newSubjectOpen = false;
  }

  async createSubject() {
    if (!this.newSubject.firstName.trim() || !this.newSubject.lastName.trim()) {
      this.newSubjectError = 'Nombre y apellido son obligatorios';
      return;
    }
    if (!this.newSubject.sex || !this.newSubject.dateOfBirth || !this.newSubject.documentId?.trim()) {
      this.newSubjectError = 'Sexo, fecha de nacimiento y documento son obligatorios';
      return;
    }
    try {
      this.creatingSubject = true;
      this.newSubjectError = '';
      if (this.editingSubjectId) {
        await this.subjectService.update(this.editingSubjectId, this.newSubject);
      } else {
        await this.subjectService.create(this.newSubject);
      }
      this.newSubjectOpen = false;
      await this.loadData();
    } catch (err: any) {
      this.newSubjectError = err.message || 'Error al crear el implicado';
    } finally {
      this.creatingSubject = false;
    }
  }

  private emptySubject(): SubjectInput {
    return {
      caseId: this.caseId,
      firstName: '', lastName: '', dateOfBirth: '', sex: undefined,
      documentId: '', subjectType: 'MADRE', status: 'PENDING',
      contactPhone: '', contactEmail: '', address: '', notes: '',
    };
  }

  private emptyCase(): CaseInput {
    return { caseNumber: '', court: '', jurisdiction: '', caseType: '', description: '', notes: '', startDate: '', endDate: '', status: 'ACTIVE' };
  }

  goToEditSubject(subjectData: any) {
    this.newSubject = {
      caseId: this.caseId, firstName: subjectData.firstName, lastName: subjectData.lastName,
      dateOfBirth: subjectData.dateOfBirth ?? '', sex: subjectData.sex ?? undefined,
      documentId: subjectData.documentId ?? '', subjectType: subjectData.subjectType,
      status: subjectData.status, contactPhone: subjectData.contactPhone ?? '',
      contactEmail: subjectData.contactEmail ?? '', address: subjectData.address ?? '', notes: subjectData.notes ?? '',
    };
    this.newSubjectError = '';
    this.editingSubjectId = subjectData.id;
    this.newSubjectOpen = true;
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

  getTestStatusLabel(subjectId: string): string {
    const status = this.subjectTestStatus[subjectId];
    if (!status || status.total === 0) return 'Sin pruebas';
    if (status.scored === status.total) return 'Aplicadas';
    return `${status.scored}/${status.total} calificadas`;
  }

  getTestStatusClass(subjectId: string): string {
    const status = this.subjectTestStatus[subjectId];
    if (!status || status.total === 0) return 'badge-archived';
    if (status.scored === status.total) return 'badge-active';
    return 'badge-pending';
  }

  getInterviewStatusLabel(subjectId: string): string {
    const map: Record<string, string> = {
      SIN_ENTREVISTAS: 'Sin entrevistas',
      DRAFT: 'Borrador',
      COMPLETED: 'Sin análisis',
      ANALYZED: 'Analizadas',
    };
    return map[this.subjectInterviewStatus[subjectId]] || 'Sin entrevistas';
  }

  getInterviewStatusClass(subjectId: string): string {
    const map: Record<string, string> = {
      SIN_ENTREVISTAS: 'badge-archived',
      DRAFT: 'badge-pending',
      COMPLETED: 'badge-in-progress',
      ANALYZED: 'badge-active',
    };
    return map[this.subjectInterviewStatus[subjectId]] || 'badge-archived';
  }
}
