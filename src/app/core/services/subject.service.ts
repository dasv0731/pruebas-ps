import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

type SubjectType = 'MADRE' | 'PADRE' | 'HIJO' | 'HIJA' | 'TUTOR' | 'OTRO';
type SubjectStatus = 'PENDING' | 'IN_EVALUATION' | 'EVALUATED' | 'REPORT_DRAFT' | 'REPORT_APPROVED';
type Sex = 'MALE' | 'FEMALE';

export interface SubjectInput {
  caseId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  sex?: Sex;
  documentId?: string;
  subjectType: SubjectType;
  status: SubjectStatus;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubjectService {

  async listByCase(caseId: string) {
    const { data, errors } = await client.models.Subject.list({
      filter: { caseId: { eq: caseId } },
    });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async getById(id: string) {
    const { data, errors } = await client.models.Subject.get({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async create(input: SubjectInput) {
    const { data, errors } = await client.models.Subject.create(input);
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async update(id: string, input: Partial<SubjectInput>) {
    const { data, errors } = await client.models.Subject.update({
      id,
      ...input,
    });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async delete(id: string) {
    const { data, errors } = await client.models.Subject.delete({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }
}