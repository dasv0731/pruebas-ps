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
}