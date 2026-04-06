import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root',
})
export class SubjectReportService {

  // ── SUBJECT ASSESSMENT REPORT ──

  async getAssessmentReport(subjectId: string) {
    const { data, errors } = await (client.models as any).SubjectAssessmentReport.list({
      filter: {
        subjectId: { eq: subjectId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data.length > 0 ? data[0] : null;
  }

  async saveAssessmentReport(subjectId: string, content: string, aiModel: string) {
    const existing = await (client.models as any).SubjectAssessmentReport.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).SubjectAssessmentReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).SubjectAssessmentReport.create({
      subjectId,
      content,
      source: 'AI',
      status: 'COMPLETED',
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  // ── SUBJECT INTERVIEW REPORT ──

  async getInterviewReport(subjectId: string) {
    const { data, errors } = await (client.models as any).SubjectInterviewReport.list({
      filter: {
        subjectId: { eq: subjectId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data.length > 0 ? data[0] : null;
  }

  async saveInterviewReport(subjectId: string, content: string, aiModel: string) {
    const existing = await (client.models as any).SubjectInterviewReport.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).SubjectInterviewReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).SubjectInterviewReport.create({
      subjectId,
      content,
      source: 'AI',
      status: 'COMPLETED',
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }
}