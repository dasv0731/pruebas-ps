import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { TestLoaderService } from '../../assessments/services/test-loader.service';
import { listAll } from '../../../core/utils/paginate';

const client = generateClient<Schema>();
const publicClient = generateClient<Schema>({ authMode: 'apiKey' });

@Injectable({
  providedIn: 'root',
})
export class EvaluationService {

  constructor(private testLoader: TestLoaderService) {}

  // ── PSICÓLOGA (autenticado) ──

  async createEvaluationSession(
    subjectId: string,
    caseId: string,
    subjectName: string,
    subjectAgeYears: number,
    subjectSex: 'MALE' | 'FEMALE',
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
      subjectAgeYears,
      subjectSex,
      createdAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async getEvaluationSessionBySubject(subjectId: string) {
    const data = await listAll<any>((args) => (client.models as any).EvaluationSession.list({
      filter: { subjectId: { eq: subjectId } },
      ...args,
    }));
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

  // ── EVALUADO (público, mediado por la Lambda eval-portal) ──
  // Ninguna operación accede a los modelos directamente: la Lambda valida el
  // accessCode server-side en cada llamada. La API key pública ya no puede
  // enumerar ni alterar datos de menores.

  private parsePortal(res: any): any {
    if (res?.errors?.length) throw new Error(res.errors.map((e: any) => e.message).join(', '));
    const d = res?.data;
    return typeof d === 'string' ? JSON.parse(d) : d;
  }

  /** Valida el código; devuelve { evalSessionId, subjectName, tests } o null. */
  async validateCode(code: string) {
    const parsed = this.parsePortal(await (publicClient.queries as any).evalValidateCode({ code }));
    return parsed?.valid ? parsed : null;
  }

  /** Datos de una prueba (estado + respuestas guardadas para reanudar) o null. */
  async getTest(code: string, sessionId: string) {
    const parsed = this.parsePortal(await (publicClient.queries as any).evalGetTest({ code, sessionId }));
    return parsed?.ok ? parsed : null;
  }

  /** Guarda progreso; si final=true, la Lambda completa y puntúa server-side. */
  async saveProgress(code: string, sessionId: string, answersJson: string, final: boolean) {
    const parsed = this.parsePortal(await (publicClient.mutations as any).evalSaveProgress({
      code, sessionId, answersJson, final,
    }));
    if (!parsed?.ok) throw new Error(parsed?.error || 'Error al guardar las respuestas');
    return parsed;
  }

  /** Cierra la sesión de evaluación (valida el código server-side). */
  async completeEval(code: string) {
    const parsed = this.parsePortal(await (publicClient.mutations as any).evalComplete({ code }));
    if (!parsed?.ok) throw new Error(parsed?.error || 'Error al finalizar la sesión');
    return parsed;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}