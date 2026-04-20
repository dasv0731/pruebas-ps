import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { aiGenerate } from '../functions/ai-generate/resource';

const schema = a.schema({

  // ──────────────────────────────────────────────
  // ENUMS
  // ──────────────────────────────────────────────

  CaseStatus: a.enum([
    'ACTIVE',
    'IN_PROGRESS',
    'COMPLETED',
    'ARCHIVED',
  ]),

  SubjectType: a.enum([
    'MADRE',
    'PADRE',
    'HIJO',
    'HIJA',
    'TUTOR',
    'OTRO',
  ]),

  SubjectStatus: a.enum([
    'PENDING',
    'IN_EVALUATION',
    'EVALUATED',
    'REPORT_DRAFT',
    'REPORT_APPROVED',
  ]),

  SessionStatus: a.enum([
    'CREATED',
    'IN_PROGRESS',
    'COMPLETED',
    'SCORED',
  ]),

  ScoringSource: a.enum([
    'LOCAL',
    'TEA',
  ]),

  ScoringStatus: a.enum([
    'PENDING',
    'COMPLETED',
    'FAILED',
  ]),

  InterviewStatus: a.enum([
    'DRAFT',
    'COMPLETED',
    'ANALYZED',
  ]),

  InterpretationSource: a.enum([
    'AI',
    'MANUAL',
  ]),

  InterpretationStatus: a.enum([
    'PENDING',
    'COMPLETED',
    'REVIEWED',
  ]),

  EvalSessionStatus: a.enum([
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'EXPIRED',
  ]),

  Sex: a.enum([
    'MALE',
    'FEMALE',
  ]),

  ReportMode: a.enum([
    'COMPLETE',
    'PARTIAL_NO_NORM',
    'PARTIAL_INSUFFICIENT',
    'NOT_INTERPRETABLE',
  ]),

  // ──────────────────────────────────────────────
  // CASE (Juicio)
  // ──────────────────────────────────────────────

  Case: a
    .model({
      caseNumber: a.string().required(),
      court: a.string(),
      jurisdiction: a.string(),
      caseType: a.string(),
      description: a.string(),
      status: a.ref('CaseStatus').required(),
      startDate: a.date(),
      endDate: a.date(),
      notes: a.string(),
      subjects: a.hasMany('Subject', 'caseId'),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // SUBJECT (Implicado)
  // ──────────────────────────────────────────────

  Subject: a
    .model({
      caseId: a.id().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      dateOfBirth: a.date(),
      sex: a.ref('Sex'),
      documentId: a.string(),
      subjectType: a.ref('SubjectType').required(),
      status: a.ref('SubjectStatus').required(),
      contactPhone: a.string(),
      contactEmail: a.email(),
      address: a.string(),
      notes: a.string(),
      case: a.belongsTo('Case', 'caseId'),
      assessmentSessions: a.hasMany('AssessmentSession', 'subjectId'),
      interviews: a.hasMany('Interview', 'subjectId'),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // ASSESSMENT (Catálogo de pruebas - GLOBAL)
  // ──────────────────────────────────────────────
 
  AssessmentQuestion: a.customType({
    index: a.integer().required(),
    text: a.string().required(),
    options: a.integer().required(),
  }),

  Assessment: a
    .model({
      name: a.string().required(),
      shortName: a.string().required(),
      description: a.string(),
      totalQuestions: a.integer().required(),
      optionsPerQuestion: a.integer().required(),
      scoringType: a.ref('ScoringSource').required(),
      questions: a.json(),
      isActive: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.publicApiKey().to(['read']),
    ]),

  // ──────────────────────────────────────────────
  // ASSESSMENT SESSION (Aplicación de prueba)
  // ──────────────────────────────────────────────

  AssessmentSession: a
    .model({
      subjectId: a.id().required(),
      assessmentId: a.id().required(),
      assessmentName: a.string().required(),
      answers: a.json(),
      currentQuestion: a.integer(),
      status: a.ref('SessionStatus').required(),
      startedAt: a.datetime(),
      completedAt: a.datetime(),
      subjectAgeYears: a.integer(),
      subjectSex: a.ref('Sex'),
      evaluationSessionId: a.id(),
      subject: a.belongsTo('Subject', 'subjectId'),
      scoring: a.hasMany('AssessmentScoring', 'sessionId'),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read', 'update']),
    ]),

  // ──────────────────────────────────────────────
  // ASSESSMENT SCORING (Resultado numérico)
  // ──────────────────────────────────────────────

  AssessmentScoring: a
    .model({
      sessionId: a.id().required(),
      totalScore: a.integer(),
      scores: a.json(),
      source: a.ref('ScoringSource').required(),
      status: a.ref('ScoringStatus').required(),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      generatedAt: a.datetime(),
      scoringVersion: a.integer(),
      reportMode: a.ref('ReportMode'),
      session: a.belongsTo('AssessmentSession', 'sessionId'),
      interpretation: a.hasMany('AssessmentInterpretation', 'scoringId'),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['create', 'read']),
    ]),

  // ──────────────────────────────────────────────
  // ASSESSMENT INTERPRETATION (Narrativa clínica)
  // ──────────────────────────────────────────────

  AssessmentInterpretation: a
    .model({
      scoringId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.ref('InterpretationStatus').required(),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
      scoring: a.belongsTo('AssessmentScoring', 'scoringId'),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // INTERVIEW (Entrevista)
  // ──────────────────────────────────────────────

  Interview: a
    .model({
      subjectId: a.id().required(),
      interviewDate: a.date().required(),
      transcript: a.string(),
      status: a.ref('InterviewStatus').required(),
      subject: a.belongsTo('Subject', 'subjectId'),
      analysis: a.hasMany('InterviewAnalysis', 'interviewId'),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // INTERVIEW ANALYSIS (Análisis de entrevista)
  // ──────────────────────────────────────────────

  InterviewAnalysis: a
    .model({
      interviewId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.ref('InterpretationStatus').required(),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
      interview: a.belongsTo('Interview', 'interviewId'),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // SUBJECT ASSESSMENT REPORT (Consolidado pruebas)
  // ──────────────────────────────────────────────

  SubjectAssessmentReport: a
    .model({
      subjectId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.ref('InterpretationStatus').required(),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // SUBJECT INTERVIEW REPORT (Consolidado entrevistas)
  // ──────────────────────────────────────────────

  SubjectInterviewReport: a
    .model({
      subjectId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.ref('InterpretationStatus').required(),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // SUBJECT REPORT (Informe final por implicado)
  // ──────────────────────────────────────────────

  SubjectReport: a
    .model({
      subjectId: a.id().required(),
      caseId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.enum(['DRAFT', 'REVIEWED', 'APPROVED']),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // CASE REPORT (Informe final del juicio)
  // ──────────────────────────────────────────────

  CaseReport: a
    .model({
      caseId: a.id().required(),
      content: a.string().required(),
      source: a.ref('InterpretationSource').required(),
      status: a.enum(['BLOCKED', 'READY', 'DRAFT', 'REVIEWED', 'APPROVED', 'STALE']),
      version: a.integer().required(),
      isCurrent: a.boolean().required(),
      aiModel: a.string(),
      generatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
    ]),

  // ──────────────────────────────────────────────
  // EVALUATION SESSION (Sesión de evaluación pública)
  // ──────────────────────────────────────────────

  EvaluationSession: a
    .model({
      subjectId: a.id().required(),
      caseId: a.id().required(),
      accessCode: a.string().required(),
      status: a.ref('EvalSessionStatus').required(),
      expiresAt: a.datetime().required(),
      assessmentSessionIds: a.json().required(),
      subjectName: a.string().required(),
      subjectAgeYears: a.integer(),
      subjectSex: a.ref('Sex'),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read', 'update']),
    ]),

  // ──────────────────────────────────────────────
  // AI GENERATION (Custom query)
  // ──────────────────────────────────────────────

  generateAIContent: a
    .query()
    .arguments({
      type: a.string().required(),
      data: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(aiGenerate))
    .authorization((allow) => [
      allow.authenticated(),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});