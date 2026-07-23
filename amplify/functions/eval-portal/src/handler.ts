import type { Schema } from '../../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { computeScore } from './scoring';

let client: ReturnType<typeof generateClient<Schema>> | null = null;

async function getClient() {
  if (client) return client;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(process.env as any);
  Amplify.configure(resourceConfig, libraryOptions);
  client = generateClient<Schema>();
  return client;
}

/** Busca la EvaluationSession por código y valida estado ACTIVE + no caducada. */
async function findValidEvalSession(dataClient: any, code: string): Promise<any | null> {
  if (!code || typeof code !== 'string') return null;
  let match: any = null;
  let nextToken: string | null | undefined = undefined;
  do {
    const res = await dataClient.models.EvaluationSession.list({
      filter: { accessCode: { eq: code } },
      nextToken,
      limit: 1000,
    });
    const found = (res.data || []).find(Boolean);
    if (found) { match = found; break; }
    nextToken = res.nextToken;
  } while (nextToken);

  if (!match) return null;
  if (match.status !== 'ACTIVE') return null;
  if (new Date(match.expiresAt) < new Date()) {
    // Caducó: marcar EXPIRED server-side y denegar.
    await dataClient.models.EvaluationSession.update({ id: match.id, status: 'EXPIRED' });
    return null;
  }
  return match;
}

function parseIds(raw: any): string[] {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

async function getAssessmentInfo(dataClient: any, assessmentId: string, assessmentName: string) {
  let a: any = null;
  try {
    const r = await dataClient.models.Assessment.get({ id: assessmentId });
    a = r.data;
  } catch { /* fallback abajo */ }
  const m = (assessmentName || '').match(/^(\w+)\s*-/);
  return {
    shortName: a?.shortName ?? (m ? m[1] : (assessmentName || '')),
    name: a?.name ?? assessmentName,
    description: a?.description ?? '',
    totalQuestions: a?.totalQuestions ?? null,
  };
}

export const handler = async (event: any): Promise<any> => {
  const field: string = event?.info?.fieldName || '';
  const args = typeof event.arguments === 'string' ? JSON.parse(event.arguments) : (event.arguments || {});
  const dataClient = await getClient();

  try {
    const evalSession = await findValidEvalSession(dataClient, args.code);
    if (!evalSession) {
      return { ok: false, valid: false, error: 'Código inválido, expirado o sesión no activa' };
    }
    const allowedIds = new Set(parseIds(evalSession.assessmentSessionIds));

    switch (field) {
      // ── Validar código y devolver la lista de pruebas (mínimo necesario) ──
      case 'evalValidateCode': {
        const tests: any[] = [];
        for (const id of allowedIds) {
          const r = await dataClient.models.AssessmentSession.get({ id });
          if (r.data) {
            const info = await getAssessmentInfo(dataClient, r.data.assessmentId, r.data.assessmentName);
            tests.push({
              id: r.data.id,
              assessmentId: r.data.assessmentId,
              assessmentName: r.data.assessmentName,
              status: r.data.status,
              ...info,
            });
          }
        }
        return {
          ok: true,
          valid: true,
          evalSessionId: evalSession.id,
          subjectName: evalSession.subjectName,
          tests,
        };
      }

      // ── Datos de una prueba concreta (con respuestas para reanudar) ──
      case 'evalGetTest': {
        const sessionId = String(args.sessionId || '');
        if (!allowedIds.has(sessionId)) {
          return { ok: false, error: 'La prueba no pertenece a esta sesión' };
        }
        const r = await dataClient.models.AssessmentSession.get({ id: sessionId });
        if (!r.data) return { ok: false, error: 'Prueba no encontrada' };
        const info = await getAssessmentInfo(dataClient, r.data.assessmentId, r.data.assessmentName);
        return {
          ok: true,
          sessionId: r.data.id,
          assessmentId: r.data.assessmentId,
          assessmentName: r.data.assessmentName,
          shortName: info.shortName,
          status: r.data.status,
          answers: typeof r.data.answers === 'string' ? r.data.answers : JSON.stringify(r.data.answers ?? null),
        };
      }

      // ── Guardar progreso; si final=true, completar y puntuar server-side ──
      case 'evalSaveProgress': {
        const sessionId = String(args.sessionId || '');
        if (!allowedIds.has(sessionId)) {
          return { ok: false, error: 'La prueba no pertenece a esta sesión' };
        }
        const final = args.final === true;
        const answersJson = String(args.answersJson ?? '[]');

        const update: any = {
          id: sessionId,
          answers: answersJson,
          status: final ? 'COMPLETED' : 'IN_PROGRESS',
        };
        if (final) {
          update.completedAt = new Date().toISOString();
          if (evalSession.subjectAgeYears != null) update.subjectAgeYears = evalSession.subjectAgeYears;
          if (evalSession.subjectSex != null) update.subjectSex = evalSession.subjectSex;
        }
        await dataClient.models.AssessmentSession.update(update);

        if (!final) return { ok: true, status: 'IN_PROGRESS' };

        // Puntuar server-side (recalcula; nunca confía en el cliente).
        const r = await dataClient.models.AssessmentSession.get({ id: sessionId });
        const shortName = (await getAssessmentInfo(dataClient, r.data.assessmentId, r.data.assessmentName)).shortName;
        let answers: number[] = [];
        try {
          const parsed = typeof answersJson === 'string' ? JSON.parse(answersJson) : answersJson;
          answers = Array.isArray(parsed) ? parsed.map((n: any) => Number(n) || 0) : [];
        } catch { answers = []; }

        const computed = computeScore(
          shortName, answers,
          evalSession.subjectSex ?? r.data?.subjectSex,
          evalSession.subjectAgeYears ?? r.data?.subjectAgeYears,
        );

        if (computed) {
          await persistScoring(dataClient, sessionId, computed);
          await dataClient.models.AssessmentSession.update({ id: sessionId, status: 'SCORED' });
          return { ok: true, status: 'SCORED' };
        }
        // CUIDA/TAMAI/PAI: sin auto-score (se corrigen en TEA). Queda COMPLETED.
        return { ok: true, status: 'COMPLETED' };
      }

      // ── Cerrar la sesión de evaluación ──
      case 'evalComplete': {
        await dataClient.models.EvaluationSession.update({ id: evalSession.id, status: 'COMPLETED' });
        return { ok: true };
      }

      default:
        return { ok: false, error: `Operación no soportada: ${field}` };
    }
  } catch (err: any) {
    console.error('[eval-portal] Error:', err);
    return { ok: false, error: err?.message || 'Error interno del portal' };
  }
};

/** Persiste un AssessmentScoring invalidando el anterior (versionado). */
async function persistScoring(dataClient: any, sessionId: string, computed: any): Promise<void> {
  const existing = await dataClient.models.AssessmentScoring.list({ filter: { sessionId: { eq: sessionId } } });
  let maxVersion = 0;
  for (const item of existing.data || []) {
    if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
    if (item.isCurrent) {
      await dataClient.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
    }
  }
  await dataClient.models.AssessmentScoring.create({
    sessionId,
    totalScore: computed.totalScore,
    scores: JSON.stringify(computed.scores),
    source: 'LOCAL',
    status: 'COMPLETED',
    version: maxVersion + 1,
    isCurrent: true,
    generatedAt: new Date().toISOString(),
    scoringVersion: computed.scoringVersion,
    reportMode: computed.reportMode,
  });
}
