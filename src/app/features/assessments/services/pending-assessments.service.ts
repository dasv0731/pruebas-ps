import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { listAll } from '../../../core/utils/paginate';

const client = generateClient<Schema>();

export const TEA_TESTS = ['CUIDA', 'TAMAI', 'PAI'] as const;
export type TeaTestShortName = typeof TEA_TESTS[number];

export interface PendingTeaAssessment {
  id: string;
  shortName: TeaTestShortName;
  assessmentName: string;
  caseId: string;
  caseNumber: string;
  subjectId: string;
  subjectName: string;
  subjectType: string;
  status: string;
  completedAt: string | null;
  subjectAgeYears: number | null;
  subjectSex: 'MALE' | 'FEMALE' | null;
  answers: number[];
  answerCount: number;
  expectedQuestions: number | null;
  validationIssues: string[];
  isExportable: boolean;
  suggestedName: string;
  entryRoute: string[];
  caseRoute: string[];
}

function parseAnswers(raw: unknown): number[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed)
      ? parsed.map((value) => {
          const number = Number(value);
          return Number.isFinite(number) ? number : 0;
        })
      : [];
  } catch {
    return [];
  }
}

function buildSuggestedName(subject: any, ageYears: number | null): string {
  const firstName = String(subject?.firstName || '').trim();
  const lastName = String(subject?.lastName || '').trim();
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitials = lastName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('');

  return `${firstInitial}${lastInitials}${ageYears ?? ''}` || 'SUJETO';
}

@Injectable({ providedIn: 'root' })
export class PendingAssessmentsService {
  async listPendingTeaAssessments(): Promise<PendingTeaAssessment[]> {
    const [sessions, subjects, cases, assessments, scorings] = await Promise.all([
      listAll<any>((args) => (client.models as any).AssessmentSession.list({ ...args })),
      listAll<any>((args) => (client.models as any).Subject.list({ ...args })),
      listAll<any>((args) => (client.models as any).Case.list({ ...args })),
      listAll<any>((args) => (client.models as any).Assessment.list({ ...args })),
      listAll<any>((args) => (client.models as any).AssessmentScoring.list({ ...args })),
    ]);

    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
    const casesById = new Map(cases.map((caseData) => [caseData.id, caseData]));
    const assessmentsById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
    const currentTeaScoring = new Set(
      scorings
        .filter((scoring) => scoring.isCurrent === true && scoring.source === 'TEA')
        .map((scoring) => scoring.sessionId),
    );

    return sessions
      .filter((session) =>
        (session.status === 'COMPLETED' || session.status === 'SCORED') &&
        !currentTeaScoring.has(session.id),
      )
      .map((session) => {
        const assessment = assessmentsById.get(session.assessmentId);
        const shortName = assessment?.shortName as TeaTestShortName | undefined;
        const subject = subjectsById.get(session.subjectId);
        const caseData = subject ? casesById.get(subject.caseId) : null;

        if (!shortName || !TEA_TESTS.includes(shortName) || !subject || !caseData) {
          return null;
        }

        const answers = parseAnswers(session.answers);
        const subjectAgeYears = session.subjectAgeYears ?? null;
        const subjectName = `${subject.firstName || ''} ${subject.lastName || ''}`.trim();
        const baseRoute = ['/cases', caseData.id, 'subjects', subject.id, 'assessments', session.id];
        const expectedQuestions = Number.isFinite(Number(assessment.totalQuestions))
          ? Number(assessment.totalQuestions)
          : null;
        const optionsPerQuestion = Number.isFinite(Number(assessment.optionsPerQuestion))
          ? Number(assessment.optionsPerQuestion)
          : null;
        const validationIssues: string[] = [];

        if (answers.length === 0 || answers.every((value) => value === 0)) {
          validationIssues.push('No hay respuestas contestadas.');
        }
        if (expectedQuestions !== null && answers.length !== expectedQuestions) {
          validationIssues.push(`Se esperaban ${expectedQuestions} respuestas y hay ${answers.length}.`);
        }
        if (subjectAgeYears === null) {
          validationIssues.push('Falta la edad congelada de la aplicación.');
        }
        if (session.subjectSex !== 'MALE' && session.subjectSex !== 'FEMALE') {
          validationIssues.push('Falta el sexo congelado de la aplicación.');
        }
        if (optionsPerQuestion !== null && answers.some((value) =>
          !Number.isInteger(value) || value < 0 || value > optionsPerQuestion
        )) {
          validationIssues.push(`Hay respuestas fuera del rango 0-${optionsPerQuestion}.`);
        }

        return {
          id: session.id,
          shortName,
          assessmentName: assessment.name || session.assessmentName,
          caseId: caseData.id,
          caseNumber: caseData.caseNumber || caseData.id,
          subjectId: subject.id,
          subjectName: subjectName || 'Sin nombre',
          subjectType: subject.subjectType || 'OTRO',
          status: session.status,
          completedAt: session.completedAt ?? null,
          subjectAgeYears,
          subjectSex: session.subjectSex ?? null,
          answers,
          answerCount: answers.length,
          expectedQuestions,
          validationIssues,
          isExportable: validationIssues.length === 0,
          suggestedName: buildSuggestedName(subject, subjectAgeYears),
          entryRoute: [...baseRoute, `${shortName.toLowerCase()}-entry`],
          caseRoute: ['/cases', caseData.id],
        } satisfies PendingTeaAssessment;
      })
      .filter((item): item is PendingTeaAssessment => item !== null)
      .sort((a, b) => {
        const left = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const right = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return left - right;
      });
  }
}
