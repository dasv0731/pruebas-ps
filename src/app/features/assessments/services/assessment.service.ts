import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { TestLoaderService } from './test-loader.service';
import { SubjectService } from '../../../core/services/subject.service';
import { SubjectReportService } from '../../subjects/services/subject-report.service';
import { listAll } from '../../../core/utils/paginate';

const client = generateClient<Schema>();

type ScoringSource = 'LOCAL' | 'TEA';
type SessionStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'SCORED';
type ScoringStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface SessionInput {
  subjectId: string;
  assessmentId: string;
  assessmentName: string;
  status: SessionStatus;
  subjectAgeYears: number;
  subjectSex: 'MALE' | 'FEMALE';
  answers?: string;
  currentQuestion?: number;
  startedAt?: string;
  completedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {

  constructor(
    private testLoader: TestLoaderService,
    private subjectService: SubjectService,
    private subjectReportService: SubjectReportService,
  ) {}

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
    // Upsert por shortName: NO se borran los existentes (borrarlos y recrearlos con
    // ids nuevos dejaría huérfanas las AssessmentSession que apuntan al id viejo).
    const existing = await this.listAssessments();
    const byShortName = new Map(existing.map((a: any) => [a.shortName, a]));

    const tests = this.testLoader.getAllTests();
    for (const test of tests) {
      const payload = {
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
      };
      const found = byShortName.get(test.shortName);
      if (found) {
        // Actualiza en sitio conservando el id → las sesiones existentes siguen válidas.
        await client.models.Assessment.update({ id: found.id, ...payload });
      } else {
        await client.models.Assessment.create(payload);
      }
    }
  }

  // ── SESIONES ──

  async listSessionsBySubject(subjectId: string) {
    return listAll((args) => client.models.AssessmentSession.list({
      filter: { subjectId: { eq: subjectId } },
      ...args,
    }));
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
    const data = await listAll((args) => client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId }, isCurrent: { eq: true } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
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

    // Invalidar scorings previos de la sesión y versionar (evita dos isCurrent).
    const existing = await listAll((args) => client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId } },
      ...args,
    }));
    let maxVersion = 0;
    for (const item of existing) {
      if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
      if (item.isCurrent) {
        await client.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
      }
    }

    const { data, errors } = await client.models.AssessmentScoring.create({
      sessionId,
      totalScore,
      scores: JSON.stringify(scoresJson),
      source: 'LOCAL' as ScoringSource,
      status: 'COMPLETED' as ScoringStatus,
      version: maxVersion + 1,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
    });

    if (errors) throw new Error(errors.map((e) => e.message).join(', '));

    await this.updateSession(sessionId, {
      status: 'SCORED' as SessionStatus,
      completedAt: new Date().toISOString(),
    });
    await this.markReportsStaleForSession(sessionId);

    return totalScore;
  }

  // ── INTERPRETATIONS ──

  async getInterpretation(scoringId: string) {
    const data = await listAll((args) => client.models.AssessmentInterpretation.list({
      filter: { scoringId: { eq: scoringId }, isCurrent: { eq: true }, status: { eq: 'COMPLETED' } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
  }

  /**
   * ¿Existe una interpretación ligada a un scoring ANTERIOR (no vigente) de esta
   * sesión? Sirve para detectar que una re-corrección dejó huérfana la narrativa
   * previa. Es robusto frente a pruebas cuyo scoring nace en versión >1 (p. ej.
   * CUIDA, cuyo flujo de 2 pasos deja el primer scoring en versión 2), a diferencia
   * de mirar solo `scoring.version`.
   */
  async sessionHasPriorInterpretation(sessionId: string, currentScoringId: string): Promise<boolean> {
    const data = await listAll((args) => client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId } },
      ...args,
    }));
    const priorScorings = data.filter((s) => s.id !== currentScoringId);
    for (const s of priorScorings) {
      const interp = await this.getInterpretation(s.id);
      if (interp) return true;
    }
    return false;
  }

  async saveInterpretation(
    scoringId: string,
    content: string,
    aiModel: string,
    source: 'AI' | 'MANUAL' = 'AI',
    metadata?: {
      promptId?: string;
      promptVersion?: number;
      inputSnapshot?: Record<string, unknown>;
      structuredContent?: Record<string, unknown>;
    },
  ) {
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
      source: source as any,
      status: 'COMPLETED' as const,
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
      promptId: metadata?.promptId,
      promptVersion: metadata?.promptVersion,
      inputSnapshot: metadata?.inputSnapshot ? JSON.stringify(metadata.inputSnapshot) : null,
      structuredContent: metadata?.structuredContent ? JSON.stringify(metadata.structuredContent) : null,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    await this.markReportsStaleForSessionFromScoring(scoringId);
    return data;
  }

  // ── CUIDA MANUAL SCORING ──

  async saveCuidaScoring(sessionId: string, cuidaScoring: object): Promise<void> {
    const existing = await client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId } },
    });

    let maxVersion = 0;
    if (existing.data) {
      for (const item of existing.data) {
        if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
        if (item.isCurrent) {
          await client.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
        }
      }
    }

    const { errors } = await client.models.AssessmentScoring.create({
      sessionId,
      totalScore: 0,
      scores: JSON.stringify(cuidaScoring),
      source: 'TEA' as ScoringSource,
      status: 'COMPLETED' as ScoringStatus,
      version: maxVersion + 1,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
      reportMode: 'COMPLETE' as any,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));

    await this.updateSession(sessionId, { status: 'SCORED' as SessionStatus });
    await this.markReportsStaleForSession(sessionId);
  }

  async saveTAMAIScoring(sessionId: string, tamaiScoring: object): Promise<void> {
    const existing = await client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId } },
    });
    let maxVersion = 0;
    if (existing.data) {
      for (const item of existing.data) {
        if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
        if (item.isCurrent) {
          await client.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
        }
      }
    }
    const { errors } = await client.models.AssessmentScoring.create({
      sessionId, totalScore: 0,
      scores: JSON.stringify(tamaiScoring),
      source: 'TEA' as ScoringSource,
      status: 'COMPLETED' as ScoringStatus,
      version: maxVersion + 1, isCurrent: true,
      generatedAt: new Date().toISOString(),
      reportMode: 'COMPLETE' as any,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    await this.updateSession(sessionId, { status: 'SCORED' as SessionStatus });
    await this.markReportsStaleForSession(sessionId);
  }

  async savePAIScoring(sessionId: string, paiScoring: object): Promise<void> {
    const existing = await client.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId } },
    });
    let maxVersion = 0;
    if (existing.data) {
      for (const item of existing.data) {
        if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
        if (item.isCurrent) {
          await client.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
        }
      }
    }
    const { errors } = await client.models.AssessmentScoring.create({
      sessionId, totalScore: 0,
      scores: JSON.stringify(paiScoring),
      source: 'TEA' as ScoringSource,
      status: 'COMPLETED' as ScoringStatus,
      version: maxVersion + 1, isCurrent: true,
      generatedAt: new Date().toISOString(),
      reportMode: 'COMPLETE' as any,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    await this.updateSession(sessionId, { status: 'SCORED' as SessionStatus });
    await this.markReportsStaleForSession(sessionId);
  }

  // ── COMPLETE SESSION ──

  /**
   * Marca una sesión como COMPLETED y congela los datos del sujeto
   * (edad y sexo) al momento de la aplicación. Usado en el flujo privado
   * de la psicóloga. El flujo público (evaluado) usa EvaluationService.saveAnswersPublic.
   */
  async completeSession(sessionId: string, answers: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Sesión no encontrada');

    const subject = await this.subjectService.getById(session.subjectId);
    if (!subject) throw new Error('Implicado no encontrado');

    if (!subject.sex) throw new Error('El implicado no tiene sexo registrado');
    if (!subject.dateOfBirth) throw new Error('El implicado no tiene fecha de nacimiento registrada');

    const ageYears = this.calculateAgeYears(subject.dateOfBirth);

    const updatePayload = {
      id: sessionId,
      answers,
      status: 'COMPLETED' as SessionStatus,
      completedAt: new Date().toISOString(),
      subjectAgeYears: ageYears,
      subjectSex: subject.sex,
    };
    const { data, errors } = await client.models.AssessmentSession.update(updatePayload);
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
  }

  /**
   * Calcula años enteros cumplidos entre una fecha de nacimiento y hoy.
   */
  private calculateAgeYears(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private async markReportsStaleForSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session?.subjectId) {
      await this.subjectReportService.markReportsStaleForSubject(session.subjectId);
    }
  }

  private async markReportsStaleForSessionFromScoring(scoringId: string): Promise<void> {
    const scoring = await (client.models as any).AssessmentScoring.get({ id: scoringId });
    if (scoring.data?.sessionId) {
      await this.markReportsStaleForSession(scoring.data.sessionId);
    }
  }
}
