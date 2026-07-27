import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { listAll } from '../utils/paginate';

const client = generateClient<Schema>();

type CaseStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface CaseInput {
  caseNumber: string;
  court?: string;
  jurisdiction?: string;
  caseType?: string;
  description?: string;
  status: CaseStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CaseService {

  async list() {
    return listAll((args) => client.models.Case.list({ ...args }));
  }

  async getById(id: string) {
    const { data, errors } = await client.models.Case.get({ id });
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async create(input: CaseInput) {
    const { data, errors } = await client.models.Case.create(this.normalizeDateFields(input));
    if (errors) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    return data;
  }

  async update(id: string, input: Partial<CaseInput>) {
    const { data, errors } = await client.models.Case.update({
      id,
      ...this.normalizeDateFields(input),
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

  async isLocked(id: string): Promise<boolean> {
    const caseData = await this.getById(id);
    return caseData?.status === 'COMPLETED';
  }

  /** GraphQL date fields accept an ISO date or null, never an empty string. */
  private normalizeDateFields<T extends Partial<CaseInput>>(input: T): T {
    const normalized = { ...input };
    if (normalized.startDate === '') normalized.startDate = null;
    if (normalized.endDate === '') normalized.endDate = null;
    return normalized;
  }
}
