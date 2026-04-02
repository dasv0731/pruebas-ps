import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService, SubjectInput } from '../../../../core/services/subject.service';
import { SUBJECT_TYPE_LABELS, SUBJECT_STATUS_LABELS } from '../../../../core/models/types';

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subject-form.component.html',
  styleUrl: './subject-form.component.scss',
})
export class SubjectFormComponent implements OnInit {
  isEdit = false;
  caseId = '';
  subjectId = '';
  loading = false;
  saving = false;
  error = '';
  typeOptions = SUBJECT_TYPE_LABELS;
  statusOptions = SUBJECT_STATUS_LABELS;

  form: SubjectInput = {
    caseId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    documentId: '',
    subjectType: 'MADRE',
    status: 'PENDING',
    contactPhone: '',
    contactEmail: '',
    address: '',
    notes: '',
  };

  constructor(
    private subjectService: SubjectService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'] || '';
    this.form.caseId = this.caseId;

    if (this.subjectId) {
      this.isEdit = true;
      await this.loadSubject();
    }
  }

  async loadSubject() {
    try {
      this.loading = true;
      const data = await this.subjectService.getById(this.subjectId);
      if (data) {
        this.form = {
          caseId: data.caseId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth ?? '',
          documentId: data.documentId ?? '',
          subjectType: data.subjectType,
          status: data.status,
          contactPhone: data.contactPhone ?? '',
          contactEmail: data.contactEmail ?? '',
          address: data.address ?? '',
          notes: data.notes ?? '',
        };
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar el implicado';
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (!this.form.firstName || !this.form.lastName) {
      this.error = 'Nombre y apellido son obligatorios';
      return;
    }

    try {
      this.saving = true;
      this.error = '';

      if (this.isEdit) {
        await this.subjectService.update(this.subjectId, this.form);
      } else {
        await this.subjectService.create(this.form);
      }

      this.router.navigate(['/cases', this.caseId]);
    } catch (err: any) {
      this.error = err.message || 'Error al guardar el implicado';
    } finally {
      this.saving = false;
    }
  }

  onCancel() {
    this.router.navigate(['/cases', this.caseId]);
  }
}