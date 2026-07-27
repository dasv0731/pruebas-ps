import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

export interface AIResponse {
  success: boolean;
  type?: string;
  content?: string;
  model?: string;
  generatedAt?: string;
  /** True si la transcripción se truncó por longitud y el análisis es parcial. */
  truncated?: boolean;
  error?: string;
  promptId?: string;
  promptVersion?: number;
  inputSnapshot?: Record<string, unknown>;
  structuredContent?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class AIService {

  async generateAssessmentInterpretation(
    assessmentCode: string,
    data: string,
  ): Promise<AIResponse> {
    return this.callAI('ASSESSMENT_INTERPRETATION', data, undefined, undefined, undefined, assessmentCode);
  }

  async generateInterviewAnalysis(
    transcript: string,
    interviewPromptId: string,
    extractionRequest?: string,
  ): Promise<AIResponse> {
    return this.callAI('INTERVIEW_ANALYSIS', transcript, undefined, undefined, extractionRequest, undefined, interviewPromptId);
  }

  async generateSubjectAssessmentReport(interpretations: unknown[], reportPromptId: string, instruction?: string): Promise<AIResponse> {
    return this.callAI('SUBJECT_ASSESSMENT_REPORT', JSON.stringify({ interpretations }), undefined, undefined, instruction, undefined, undefined, reportPromptId);
  }

  async generateSubjectInterviewReport(analyses: string[], reportPromptId: string, instruction?: string): Promise<AIResponse> {
    return this.callAI('SUBJECT_INTERVIEW_REPORT', JSON.stringify({ analyses }), undefined, undefined, instruction, undefined, undefined, reportPromptId);
  }

  private static readonly SECCION_NO_DISPONIBLE =
    '[SECCIÓN NO DISPONIBLE: esta fuente no fue evaluada o no se consolidó. No inventar contenido.]';

  async generateSubjectReport(
    assessmentReport: string | null,
    interviewReport: string | null
  ): Promise<AIResponse> {
    const data = JSON.stringify({
      assessmentReport: assessmentReport ?? AIService.SECCION_NO_DISPONIBLE,
      interviewReport: interviewReport ?? AIService.SECCION_NO_DISPONIBLE,
      missingSections: [
        ...(!assessmentReport ? ['pruebas'] : []),
        ...(!interviewReport ? ['entrevistas'] : []),
      ],
    });
    return this.callAI('SUBJECT_REPORT', data);
  }

  async generateCaseReport(subjectReports: { subjectName: string; report: string }[]): Promise<AIResponse> {
    const data = JSON.stringify({ subjectReports });
    return this.callAI('CASE_REPORT', data);
  }

  private async callAI(
    type: string,
    data: string,
    systemPrompt?: string,
    maxTokens?: number,
    extractionRequest?: string,
    assessmentCode?: string,
    interviewPromptId?: string,
    reportPromptId?: string,
  ): Promise<AIResponse> {
    try {
      const payload: any = { type, data };
      if (systemPrompt) payload.systemPrompt = systemPrompt;
      if (maxTokens) payload.maxTokens = maxTokens;
      if (extractionRequest) payload.extractionRequest = extractionRequest;
      if (assessmentCode) payload.assessmentCode = assessmentCode;
      if (interviewPromptId) payload.interviewPromptId = interviewPromptId;
      if (reportPromptId) payload.reportPromptId = reportPromptId;

      const response = await client.queries.generateAIContent(payload);

      if (response.errors) {
        throw new Error(response.errors.map((e: any) => e.message).join(', '));
      }

      const parsed = typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;

      return parsed as AIResponse;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error al generar contenido con IA',
      };
    }
  }
}
