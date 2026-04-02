import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseService, CaseInput } from '../../../../core/services/case.service';
import { CASE_STATUS_LABELS } from '../../../../core/models/types';

@Component({
  selector: 'app-case-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-form.component.html',
  styleUrl: './case-form.component.scss',
})
export class CaseFormComponent implements OnInit {
  isEdit = false;
  caseId = '';
  loading = false;
  saving = false;
  error = '';
  statusOptions = CASE_STATUS_LABELS;

  form: CaseInput = {
    caseNumber: '',
    court: '',
    jurisdiction: '',
    caseType: '',
    description: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    notes: '',
  };

  constructor(
    private caseService: CaseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'] || '';
    if (this.caseId) {
      this.isEdit = true;
      await this.loadCase();
    }
  }

  async loadCase() {
    try {
      this.loading = true;
      const data = await this.caseService.getById(this.caseId);
      if (data) {
        this.form = {
          caseNumber: data.caseNumber,
          court: data.court ?? '',
          jurisdiction: data.jurisdiction ?? '',
          caseType: data.caseType ?? '',
          description: data.description ?? '',
          status: data.status,
          startDate: data.startDate ?? '',
          endDate: data.endDate ?? '',
          notes: data.notes ?? '',
        };
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar el caso';
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (!this.form.caseNumber) {
      this.error = 'El número de caso es obligatorio';
      return;
    }

    try {
      this.saving = true;
      this.error = '';

      if (this.isEdit) {
        await this.caseService.update(this.caseId, this.form);
      } else {
        await this.caseService.create(this.form);
      }

      this.router.navigate(['/cases']);
    } catch (err: any) {
      this.error = err.message || 'Error al guardar el caso';
    } finally {
      this.saving = false;
    }
  }

  onCancel() {
    this.router.navigate(['/cases']);
  }
}