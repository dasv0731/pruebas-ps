import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { listAll } from '../utils/paginate';

const client = generateClient<Schema>();

type SubjectType = 'MADRE' | 'PADRE' | 'HIJO' | 'HIJA' | 'TUTOR' | 'OTRO';
type SubjectStatus = 'PENDING' | 'IN_EVALUATION' | 'EVALUATED' | 'REPORT_DRAFT' | 'REPORT_APPROVED';
type Sex = 'MALE' | 'FEMALE';

export interface SubjectInput {
  caseId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex?: Sex;
  documentId?: string;
  subjectType: SubjectType;
  status: SubjectStatus;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  notes?: string;
  excludedFromCaseReport?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SubjectService {

  private normalizeOptionalFields(input: Partial<SubjectInput>): Partial<SubjectInput> {
    const normalized = { ...input };
    for (const field of ['documentId', 'contactPhone', 'contactEmail', 'address', 'notes'] as const) {
      if (typeof normalized[field] === 'string' && !normalized[field]!.trim()) {
        normalized[field] = undefined;
      }
    }
    return normalized;
  }

  async listByCase(caseId: string) {
    return listAll((args) => client.models.Subject.list({
      filter: { caseId: { eq: caseId } },
      ...args,
    }));
  }

  async getById(id: string) {
    const { data, errors } = await client.models.Subject.get({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async create(input: SubjectInput) {
    if (!input.dateOfBirth || !input.sex) {
      throw new Error('La fecha de nacimiento y el sexo son obligatorios');
    }
    const { data, errors } = await client.models.Subject.create({
      ...(this.normalizeOptionalFields(input) as SubjectInput),
      dateOfBirth: input.dateOfBirth,
      sex: input.sex,
    });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async update(id: string, input: Partial<SubjectInput>) {
    const { data, errors } = await client.models.Subject.update({
      id,
      ...this.normalizeOptionalFields(input),
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
