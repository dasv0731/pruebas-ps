import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InterviewService, InterviewInput } from '../../services/interview.service';
import { AIService, AIResponse } from '../../../../core/services/ai.service';
import { CaseService } from '../../../../core/services/case.service';
import { AnalysisOutputComponent } from '../../../../shared/components/analysis-output/analysis-output.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-interview-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AnalysisOutputComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './interview-form.component.html',
  styleUrl: './interview-form.component.scss',
})
export class InterviewFormComponent implements OnInit {
  caseId = '';
  subjectId = '';
  interviewId = '';
  isEdit = false;
  loading = false;
  saving = false;
  generating = false;
  caseLocked = false;
  error = '';
  analysis = '';
  analysisVersion = 0;
  analysisDate = '';

  form: InterviewInput = {
    subjectId: '',
    interviewDate: '',
    transcript: '',
    extractionRequest: '',
    status: 'DRAFT',
  };

  /** Indica si se ha modificado el extractionRequest desde la última carga (para habilitar el botón "Guardar focos"). */
  extractionDirty = false;
  savingExtraction = false;

  constructor(
    private interviewService: InterviewService,
    private aiService: AIService,
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    const caseData = await this.caseService.getById(this.caseId);
    this.caseLocked = caseData?.status === 'COMPLETED'
    this.subjectId = this.route.snapshot.params['subjectId'];
    this.interviewId = this.route.snapshot.params['interviewId'] || '';
    this.form.subjectId = this.subjectId;

    if (this.interviewId) {
      this.isEdit = true;
      await this.loadInterview();
    } else {
      this.form.interviewDate = new Date().toISOString().split('T')[0];
    }
  }

  async loadInterview() {
    try {
      this.loading = true;
      const data = await this.interviewService.getById(this.interviewId);
      if (data) {
        this.form = {
          subjectId: data.subjectId,
          interviewDate: data.interviewDate,
          transcript: data.transcript ?? '',
          extractionRequest: (data as any).extractionRequest ?? '',
          status: data.status as 'DRAFT' | 'COMPLETED' | 'ANALYZED',
        };
        this.extractionDirty = false;

        const saved = await this.interviewService.getAnalysis(this.interviewId);
        if (saved) {
          this.analysis = saved.content;
          this.analysisVersion = saved.version;
          this.analysisDate = saved.generatedAt || '';
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al cargar la entrevista';
    } finally {
      this.loading = false;
    }
  }

  isEditable(): boolean {
    return this.form.status === 'DRAFT' && !this.caseLocked;
  }

  isCompleted(): boolean {
    return this.form.status === 'COMPLETED' || this.form.status === 'ANALYZED';
  }

  canGenerateAnalysis(): boolean {
    return this.isCompleted() && !this.caseLocked && !!this.form.transcript && this.form.transcript.trim().length > 0;
  }

  async onSubmit() {
    if (!this.form.interviewDate) {
      this.error = 'La fecha es obligatoria';
      return;
    }

    try {
      this.saving = true;
      this.error = '';

      if (this.isEdit) {
        await this.interviewService.update(this.interviewId, this.form);
      } else {
        const created = await this.interviewService.create(this.form);
        if (created) {
          this.interviewId = created.id;
          this.isEdit = true;
        }
      }
    } catch (err: any) {
      this.error = err.message || 'Error al guardar la entrevista';
    } finally {
      this.saving = false;
    }
  }

  async onSaveAndComplete() {
    if (!this.form.transcript || this.form.transcript.trim().length === 0) {
      this.error = 'Debe escribir la transcripción antes de completar la entrevista';
      return;
    }

    this.form.status = 'COMPLETED';
    await this.onSubmit();
  }

  async generateAnalysis() {
    if (!this.canGenerateAnalysis()) {
      this.error = 'Debe completar la entrevista antes de generar el análisis';
      return;
    }

    if (!this.interviewId) {
      await this.onSubmit();
      if (!this.interviewId) return;
    }

    try {
      this.generating = true;
      this.error = '';

      const response: AIResponse = await this.aiService.generateInterviewAnalysis(
        this.form.transcript!,
        this.form.extractionRequest?.trim() || undefined,
      );

      if (response.success && response.content) {
        await this.interviewService.saveAnalysis(
          this.interviewId,
          response.content,
          response.model || 'claude-sonnet-4-20250514'
        );

        // Actualizar estado a ANALYZED
        this.form.status = 'ANALYZED';
        await this.interviewService.update(this.interviewId, { status: 'ANALYZED' });

        this.analysis = response.content;
        this.analysisVersion++;
        this.analysisDate = new Date().toISOString();
      } else {
        this.error = response.error || 'Error al generar análisis';
      }
    } catch (err: any) {
      this.error = err.message || 'Error al generar análisis';
    } finally {
      this.generating = false;
    }
  }

  getStatusLabel(): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      COMPLETED: 'Completada',
      ANALYZED: 'Analizada',
    };
    return map[this.form.status] || this.form.status;
  }

  getStatusClass(): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-pending',
      COMPLETED: 'badge-in-progress',
      ANALYZED: 'badge-active',
    };
    return map[this.form.status] || '';
  }

  goBack() {
    this.router.navigate([
      '/cases', this.caseId,
      'subjects', this.subjectId,
      'interviews',
    ]);
  }

  /** Permite editar los focos a resaltar incluso después de COMPLETED, sin desbloquear la transcripción. */
  canEditExtractionRequest(): boolean {
    return this.isEdit && !this.caseLocked;
  }

  onExtractionChange() {
    this.extractionDirty = true;
  }

  async saveExtractionRequest() {
    if (!this.interviewId || !this.canEditExtractionRequest()) return;
    try {
      this.savingExtraction = true;
      this.error = '';
      await this.interviewService.update(this.interviewId, {
        extractionRequest: this.form.extractionRequest ?? '',
      });
      this.extractionDirty = false;
    } catch (err: any) {
      this.error = err.message || 'Error al guardar los focos a resaltar';
    } finally {
      this.savingExtraction = false;
    }
  }
}