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
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AIService {

  async generateAssessmentInterpretation(assessmentName: string, scores: any): Promise<AIResponse> {
    const data = JSON.stringify({
      assessmentName,
      scores,
    });

    return this.callAI('ASSESSMENT_INTERPRETATION', data);
  }

  async generateInterviewAnalysis(transcript: string): Promise<AIResponse> {
    return this.callAI('INTERVIEW_ANALYSIS', transcript);
  }

  async generateSubjectAssessmentReport(interpretations: string[]): Promise<AIResponse> {
    const data = JSON.stringify({
      interpretations,
    });

    return this.callAI('SUBJECT_ASSESSMENT_REPORT', data);
  }

  async generateSubjectInterviewReport(analyses: string[]): Promise<AIResponse> {
    const data = JSON.stringify({
      analyses,
    });

    return this.callAI('SUBJECT_INTERVIEW_REPORT', data);
  }

  async generateSubjectReport(assessmentReport: string, interviewReport: string): Promise<AIResponse> {
    const data = JSON.stringify({
      assessmentReport,
      interviewReport,
    });

    return this.callAI('SUBJECT_REPORT', data);
  }

  async generateCaseReport(subjectReports: { subjectName: string; report: string }[]): Promise<AIResponse> {
    const data = JSON.stringify({
      subjectReports,
    });

    return this.callAI('CASE_REPORT', data);
  }

  private async callAI(type: string, data: string): Promise<AIResponse> {
    try {
      const response = await client.queries.generateAIContent({
        type,
        data,
      });

      console.log('AI Response:', JSON.stringify(response, null, 2));

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