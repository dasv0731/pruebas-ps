import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

type CaseStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface CaseInput {
  caseNumber: string;
  court?: string;
  jurisdiction?: string;
  caseType?: string;
  description?: string;
  status: CaseStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CaseService {

  async list() {
    const { data, errors } = await client.models.Case.list();
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async getById(id: string) {
    const { data, errors } = await client.models.Case.get({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async create(input: CaseInput) {
    const { data, errors } = await client.models.Case.create(input);
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async update(id: string, input: Partial<CaseInput>) {
    const { data, errors } = await client.models.Case.update({
      id,
      ...input,
    });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async delete(id: string) {
    const { data, errors } = await client.models.Case.delete({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }
}