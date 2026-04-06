import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();

type InterviewStatus = 'DRAFT' | 'COMPLETED';

export interface InterviewInput {
  subjectId: string;
  interviewDate: string;
  transcript?: string;
  status: InterviewStatus;
}

@Injectable({
  providedIn: 'root',
})
export class InterviewService {

  async listBySubject(subjectId: string) {
    const { data, errors } = await client.models.Interview.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async getById(id: string) {
    const { data, errors } = await client.models.Interview.get({ id });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async create(input: InterviewInput) {
    const { data, errors } = await client.models.Interview.create(input);
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async update(id: string, input: Partial<InterviewInput>) {
    const { data, errors } = await client.models.Interview.update({
      id,
      ...input,
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async delete(id: string) {
    const { data, errors } = await client.models.Interview.delete({ id });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  // ── ANALYSIS ──

  async getAnalysis(interviewId: string) {
    const { data, errors } = await client.models.InterviewAnalysis.list({
      filter: {
        interviewId: { eq: interviewId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.length > 0 ? data[0] : null;
  }

  async saveAnalysis(interviewId: string, content: string, aiModel: string) {
    const existing = await client.models.InterviewAnalysis.list({
      filter: { interviewId: { eq: interviewId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await client.models.InterviewAnalysis.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await client.models.InterviewAnalysis.create({
      interviewId,
      content,
      source: 'AI' as const,
      status: 'COMPLETED' as const,
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }
}