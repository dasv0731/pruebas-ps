import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();
const publicClient = generateClient<Schema>({ authMode: 'apiKey' });

@Injectable({
  providedIn: 'root',
})
export class EvaluationService {

  // ── PSICÓLOGA (autenticado) ──

  async createEvaluationSession(
    subjectId: string,
    caseId: string,
    subjectName: string,
    assessmentSessionIds: string[]
  ) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const { data, errors } = await (client.models as any).EvaluationSession.create({
      subjectId,
      caseId,
      accessCode: code,
      status: 'ACTIVE',
      expiresAt,
      assessmentSessionIds: JSON.stringify(assessmentSessionIds),
      subjectName,
      createdAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async getEvaluationSessionBySubject(subjectId: string) {
    const { data, errors } = await (client.models as any).EvaluationSession.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    const active = data.filter((s: any) =>
      s.status === 'ACTIVE' || s.status === 'PAUSED'
    );
    return active.length > 0 ? active[0] : null;
  }

  async pauseSession(sessionId: string) {
    const { data, errors } = await (client.models as any).EvaluationSession.update({
      id: sessionId,
      status: 'PAUSED',
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async resumeSession(sessionId: string) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const { data, errors } = await (client.models as any).EvaluationSession.update({
      id: sessionId,
      status: 'ACTIVE',
      accessCode: code,
      expiresAt,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  // ── EVALUADO (público con API key) ──

  async validateCode(code: string) {
    const { data, errors } = await (publicClient.models as any).EvaluationSession.list({
      filter: { accessCode: { eq: code } },
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));

    if (!data || data.length === 0) return null;

    const session = data[0];

    if (session.status !== 'ACTIVE') return null;
    if (new Date(session.expiresAt) < new Date()) {
      await (publicClient.models as any).EvaluationSession.update({
        id: session.id,
        status: 'EXPIRED',
      });
      return null;
    }

    return session;
  }

  async getSessionPublic(sessionId: string) {
    const { data, errors } = await (publicClient.models as any).EvaluationSession.get({
      id: sessionId,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async getAssessmentSessionPublic(sessionId: string) {
    const { data, errors } = await (publicClient.models as any).AssessmentSession.get({
      id: sessionId,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async getAssessmentPublic(assessmentId: string) {
    const { data, errors } = await (publicClient.models as any).Assessment.get({
      id: assessmentId,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async saveAnswersPublic(sessionId: string, answers: string, status: string) {
    const { data, errors } = await (publicClient.models as any).AssessmentSession.update({
      id: sessionId,
      answers,
      status,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async scorePublic(sessionId: string, answers: number[]) {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);

    const { data, errors } = await (publicClient.models as any).AssessmentScoring.create({
      sessionId,
      totalScore,
      scores: JSON.stringify({ raw: totalScore, answers }),
      source: 'LOCAL',
      status: 'COMPLETED',
      version: 1,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));

    await this.saveAnswersPublic(sessionId, JSON.stringify(answers), 'SCORED');

    return totalScore;
  }

  async completeEvaluationSession(sessionId: string) {
    const { data, errors } = await (publicClient.models as any).EvaluationSession.update({
      id: sessionId,
      status: 'COMPLETED',
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}