import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { listAll } from '../../../core/utils/paginate';
import { statusForSource } from '../interview-lifecycle';

const client = generateClient<Schema>();

type InterviewStatus = 'DRAFT' | 'COMPLETED' | 'ANALYZED';

export interface InterviewInput {
  subjectId: string;
  interviewDate: string;
  transcript?: string;
  extractionRequest?: string;
  status: InterviewStatus;
}

@Injectable({
  providedIn: 'root',
})
export class InterviewService {

  async listBySubject(subjectId: string) {
    return listAll((args) => client.models.Interview.list({
      filter: { subjectId: { eq: subjectId } },
      ...args,
    }));
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
    const data = await listAll((args) => client.models.InterviewAnalysis.list({
      filter: { interviewId: { eq: interviewId }, isCurrent: { eq: true } },
      ...args,
    }));
    if (data.length === 0) return null;
    // Red de seguridad: si por un fallo a mitad de guardado quedaran varios
    // isCurrent, devolver el de mayor versión (el más reciente).
    return [...data].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  }

  async saveAnalysis(
    interviewId: string,
    content: string,
    opts: { source: 'AI' | 'MANUAL'; aiModel?: string },
  ) {
    const existing = await client.models.InterviewAnalysis.list({
      filter: { interviewId: { eq: interviewId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await client.models.InterviewAnalysis.update({ id: item.id, isCurrent: false });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await client.models.InterviewAnalysis.create({
      interviewId,
      content,
      source: opts.source,
      status: statusForSource(opts.source),
      version,
      isCurrent: true,
      isStale: false,
      aiModel: opts.aiModel ?? null,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  /**
   * Reabre una entrevista COMPLETED/ANALYZED a DRAFT para corregir la
   * transcripción (traza `reopenedAt`) y marca su análisis vigente como obsoleto.
   * Devuelve el subjectId para que el componente marque el consolidado obsoleto.
   */
  async reopenInterview(interviewId: string): Promise<{ subjectId: string }> {
    const interview = await this.getById(interviewId);
    if (!interview) throw new Error('Entrevista no encontrada');

    await this.update(interviewId, { status: 'DRAFT' });
    await client.models.Interview.update({ id: interviewId, reopenedAt: new Date().toISOString() });

    const current = await this.getAnalysis(interviewId);
    if (current) {
      await client.models.InterviewAnalysis.update({ id: current.id, isStale: true });
    }
    return { subjectId: interview.subjectId };
  }
}