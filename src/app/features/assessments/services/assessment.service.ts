import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';

const client = generateClient<Schema>();

type ScoringSource = 'LOCAL' | 'TEA';
type SessionStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'SCORED';
type ScoringStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AssessmentInput {
  name: string;
  shortName: string;
  description?: string;
  totalQuestions: number;
  optionsPerQuestion: number;
  scoringType: ScoringSource;
  questions?: string;
  isActive: boolean;
}

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

  // ── CATÁLOGO ──

  async listAssessments() {
    const { data, errors } = await client.models.Assessment.list();
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async getAssessment(id: string) {
    const { data, errors } = await client.models.Assessment.get({ id });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }

  async createAssessment(input: AssessmentInput) {
    const { data, errors } = await client.models.Assessment.create(input);
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
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
    return data.length > 0 ? data[0] : null;
  }

  async scoreSession(sessionId: string, answers: number[]): Promise<number> {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);

    const { data, errors } = await client.models.AssessmentScoring.create({
      sessionId,
      totalScore,
      scores: JSON.stringify({ raw: totalScore, answers }),
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

  async seedCatalog() {
    // Eliminar pruebas existentes
    const existing = await this.listAssessments();
    for (const a of existing) {
      await client.models.Assessment.delete({ id: a.id });
    }

    const staiQuestions = {
      sections: [
        {
          title: 'Parte 1: Ansiedad - Estado',
          instructions: 'A continuación encontrará unas frases que se utilizan corrientemente para describirse uno a sí mismo. Lea cada frase y señale la puntuación de 1 a 4 que indique mejor cómo se siente usted ahora mismo, en este momento. No hay respuestas buenas ni malas.',
          legend: ['1 = Nada', '2 = Algo', '3 = Bastante', '4 = Mucho'],
          questions: [
            { index: 1, text: '1. Me siento calmado', options: 4 },
            { index: 2, text: '2. Me siento seguro', options: 4 },
            { index: 3, text: '3. Estoy tenso', options: 4 },
            { index: 4, text: '4. Estoy contrariado', options: 4 },
            { index: 5, text: '5. Me siento cómodo (estoy a gusto)', options: 4 },
            { index: 6, text: '6. Me siento alterado', options: 4 },
            { index: 7, text: '7. Estoy preocupado ahora por posibles desgracias futuras', options: 4 },
            { index: 8, text: '8. Me siento descansado', options: 4 },
            { index: 9, text: '9. Me siento angustiado', options: 4 },
            { index: 10, text: '10. Me siento confortable', options: 4 },
            { index: 11, text: '11. Tengo confianza en mí mismo', options: 4 },
            { index: 12, text: '12. Me siento nervioso', options: 4 },
            { index: 13, text: '13. Estoy desasosegado', options: 4 },
            { index: 14, text: '14. Me siento muy «atado» (como oprimido)', options: 4 },
            { index: 15, text: '15. Estoy relajado', options: 4 },
            { index: 16, text: '16. Me siento satisfecho', options: 4 },
            { index: 17, text: '17. Estoy preocupado', options: 4 },
            { index: 18, text: '18. Me siento aturdido y sobreexcitado', options: 4 },
            { index: 19, text: '19. Me siento alegre', options: 4 },
            { index: 20, text: '20. En este momento me siento bien', options: 4 },
          ],
        },
        {
          title: 'Parte 2: Ansiedad - Rasgo',
          instructions: 'A continuación encontrará unas frases que se utilizan corrientemente para describirse uno a sí mismo. Lea cada frase y señale la puntuación de 1 a 4 que indique mejor cómo se siente usted en general, en la mayoría de las ocasiones. No hay respuestas buenas ni malas.',
          legend: ['1 = Casi nunca', '2 = A veces', '3 = A menudo', '4 = Casi siempre'],
          questions: [
            { index: 21, text: '21. Me siento bien', options: 4 },
            { index: 22, text: '22. Me canso rápidamente', options: 4 },
            { index: 23, text: '23. Siento ganas de llorar', options: 4 },
            { index: 24, text: '24. Me gustaría ser tan feliz como otros', options: 4 },
            { index: 25, text: '25. Pierdo oportunidades por no decidirme pronto', options: 4 },
            { index: 26, text: '26. Me siento descansado', options: 4 },
            { index: 27, text: '27. Soy una persona tranquila, serena y sosegada', options: 4 },
            { index: 28, text: '28. Veo que las dificultades se amontonan y no puedo con ellas', options: 4 },
            { index: 29, text: '29. Me preocupo demasiado por cosas sin importancia', options: 4 },
            { index: 30, text: '30. Soy feliz', options: 4 },
            { index: 31, text: '31. Suelo tomar las cosas demasiado seriamente', options: 4 },
            { index: 32, text: '32. Me falta confianza en mí mismo', options: 4 },
            { index: 33, text: '33. Me siento seguro', options: 4 },
            { index: 34, text: '34. No suelo afrontar las crisis o dificultades', options: 4 },
            { index: 35, text: '35. Me siento triste (melancólico)', options: 4 },
            { index: 36, text: '36. Estoy satisfecho', options: 4 },
            { index: 37, text: '37. Me rondan y molestan pensamientos sin importancia', options: 4 },
            { index: 38, text: '38. Me afectan tanto los desengaños que no puedo olvidarlos', options: 4 },
            { index: 39, text: '39. Soy una persona estable', options: 4 },
            { index: 40, text: '40. Cuando pienso sobre asuntos y preocupaciones actuales me pongo tenso y agitado', options: 4 },
          ],
        },
      ],
    };

    const assessments = [
      {
        name: 'STAI - Inventario de Ansiedad Estado-Rasgo',
        shortName: 'STAI',
        description: 'Evalúa ansiedad estado y ansiedad rasgo',
        totalQuestions: 40,
        optionsPerQuestion: 4,
        scoringType: 'LOCAL' as const,
        isActive: true,
        questions: JSON.stringify(staiQuestions),
      },
      {
        name: 'STAIC - Inventario de Ansiedad Estado-Rasgo para Niños',
        shortName: 'STAIC',
        description: 'Evalúa ansiedad en niños y adolescentes',
        totalQuestions: 40,
        optionsPerQuestion: 3,
        scoringType: 'LOCAL' as const,
        isActive: true,
        questions: JSON.stringify({ sections: [] }),
      },
      {
        name: 'CDI - Inventario de Depresión Infantil',
        shortName: 'CDI',
        description: 'Evalúa síntomas depresivos en niños',
        totalQuestions: 20,
        optionsPerQuestion: 3,
        scoringType: 'LOCAL' as const,
        isActive: true,
        questions: JSON.stringify({ sections: [] }),
      },
      {
        name: 'CUIDA - Cuestionario para la Evaluación de Adoptantes',
        shortName: 'CUIDA',
        description: 'Evaluación de capacidades parentales',
        totalQuestions: 120,
        optionsPerQuestion: 4,
        scoringType: 'TEA' as const,
        isActive: true,
        questions: JSON.stringify({ sections: [] }),
      },
      {
        name: 'PAI - Inventario de Evaluación de Personalidad',
        shortName: 'PAI',
        description: 'Evaluación clínica de personalidad y psicopatología',
        totalQuestions: 120,
        optionsPerQuestion: 4,
        scoringType: 'TEA' as const,
        isActive: true,
        questions: JSON.stringify({ sections: [] }),
      },
    ];

    for (const a of assessments) {
      await this.createAssessment(a);
    }
  }
}