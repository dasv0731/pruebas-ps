import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { TestLoaderService } from './test-loader.service';

const client = generateClient<Schema>();

type ScoringSource = 'LOCAL' | 'TEA';
type SessionStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'SCORED';
type ScoringStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface SessionInput {
  subjectId: string;
  assessmentId: string;
  assessmentName: string;
  status: SessionStatus;
  answers?: string;
  currentQuestion?: number;
  startedAt?: string;
  completedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {

  constructor(private testLoader: TestLoaderService) {}

  // ── CATÁLOGO ──

  async listAssessments() {
    const { data, errors } = await client.models.Assessment.list();
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async getAssessment(id: string) {
    const { data, errors } = await client.models.Assessment.get({ id });
    if (data) return data;

    const listResult = await client.models.Assessment.list();
    const found = listResult.data?.find((a: any) => a.id === id);
    return found || null;
  }

  async seedCatalog() {
    // Eliminar existentes
    const existing = await this.listAssessments();
    for (const a of existing) {
      await client.models.Assessment.delete({ id: a.id });
    }

    // Crear desde el registro
    const tests = this.testLoader.getAllTests();
    for (const test of tests) {
      await client.models.Assessment.create({
        name: test.name,
        shortName: test.shortName,
        description: test.description,
        totalQuestions: test.totalQuestions,
        optionsPerQuestion: test.optionsPerQuestion,
        scoringType: test.scoringType as ScoringSource,
        isActive: true,
        questions: JSON.stringify({
          type: test.questionType,
          sections: test.sections,
        }),
      });
    }
  }

  // ── SESIONES ──

  async listSessionsBySubject(subjectId: string) {
    const { data, errors } = await client.models.AssessmentSession.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async getSession(id: string) {
    const { data, errors } = await client.models.AssessmentSession.get({ id });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async createSession(input: SessionInput) {
    const { data, errors } = await client.models.AssessmentSession.create(input);
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async updateSession(id: string, input: Partial<SessionInput>) {
    const { data, errors } = await client.models.AssessmentSession.update({
      id,
      ...input,
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  // ── SCORING ──

  async getScoring(sessionId: string) {
    const { data, errors } = await client.models.AssessmentScoring.list({
      filter: {
        sessionId: { eq: sessionId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    if (data.length > 0) return data[0];

    const publicClient = generateClient<Schema>({ authMode: 'apiKey' });
    const pubResult = await publicClient.models.AssessmentScoring.list({
      filter: {
        sessionId: { eq: sessionId },
        isCurrent: { eq: true },
      },
    });
    if (pubResult.errors) throw new Error(pubResult.errors.map((e) => e.message).join(', '));
    return pubResult.data.length > 0 ? pubResult.data[0] : null;
  }

  async scoreSession(sessionId: string, answers: number[], shortName?: string): Promise<number> {
    let totalScore: number;
    let scoresJson: any;

    if (shortName) {
      const result = this.testLoader.score(shortName, answers);
      if (result) {
        totalScore = result.totalScore;
        scoresJson = result;
      } else {
        totalScore = answers.reduce((sum, val) => sum + val, 0);
        scoresJson = { raw: totalScore, answers };
      }
    } else {
      totalScore = answers.reduce((sum, val) => sum + val, 0);
      scoresJson = { raw: totalScore, answers };
    }

    const { data, errors } = await client.models.AssessmentScoring.create({
      sessionId,
      totalScore,
      scores: JSON.stringify(scoresJson),
      source: 'LOCAL' as ScoringSource,
      status: 'COMPLETED' as ScoringStatus,
      version: 1,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
    });

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));

    await this.updateSession(sessionId, {
      status: 'SCORED' as SessionStatus,
      completedAt: new Date().toISOString(),
    });

    return totalScore;
  }

  // ── INTERPRETATIONS ──

  async getInterpretation(scoringId: string) {
    const { data, errors } = await client.models.AssessmentInterpretation.list({
      filter: {
        scoringId: { eq: scoringId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data.length > 0 ? data[0] : null;
  }

  async saveInterpretation(scoringId: string, content: string, aiModel: string) {
    const existing = await client.models.AssessmentInterpretation.list({
      filter: { scoringId: { eq: scoringId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await client.models.AssessmentInterpretation.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await client.models.AssessmentInterpretation.create({
      scoringId,
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