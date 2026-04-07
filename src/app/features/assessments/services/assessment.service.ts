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
    console.log('getAssessment called with id:', id);
    // Intentar con get
    const { data, errors } = await client.models.Assessment.get({ id });
    console.log('getAssessment result:', data, 'errors:', errors);
    if (data) return data;
    
    // Fallback: buscar en la lista
    const listResult = await client.models.Assessment.list();
    console.log('All assessments:', listResult.data?.length);
    const found = listResult.data?.find((a: any) => a.id === id);
    return found || null;
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
    // Buscar primero con autenticación del owner
    const { data, errors } = await client.models.AssessmentScoring.list({
      filter: {
        sessionId: { eq: sessionId },
        isCurrent: { eq: true },
      },
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    if (data.length > 0) return data[0];

    // Si no encuentra, buscar con API key (scoring creado por el evaluado)
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
        description: 'Evalúa síntomas depresivos en niños de 7 a 17 años',
        totalQuestions: 27,
        optionsPerQuestion: 3,
        scoringType: 'LOCAL' as const,
        isActive: true,
        questions: JSON.stringify({
          type: 'TEXT_OPTIONS',
          instructions: 'Este es un cuestionario que tiene oraciones que están en grupos de tres. Escoge en cada grupo una oración, la que mejor diga cómo te has portado, cómo te has sentido en las ÚLTIMAS DOS SEMANAS.',
          cutoffScore: 19,
          cutoffDescription: 'Puntuación de 19 o superior indica posible trastorno depresivo',
          subscales: {
            disforia: { name: 'Disforia (D)', description: 'Ánimo triste, pesimismo', items: [1,2,3,4,6,10,11,12,16,17,18,19,20,21,22,26,27] },
            autoestima: { name: 'Autoestima Negativa (A)', description: 'Sentimientos de inutilidad, ineficacia', items: [5,7,8,9,13,14,15,23,24,25] },
          },
          scoring: [
            [0, 1, 2],
            [2, 1, 0],
            [0, 1, 2],
            null, null, null, null, null, null, null,
            null, null, null, null, null, null, null,
            null, null, null, null, null, null, null,
            null, null, null
          ],
          sections: [
            {
              title: 'CDI - Inventario de Depresión Infantil',
              instructions: 'Escoge en cada grupo una oración, la que mejor diga cómo te has portado, cómo te has sentido en las ÚLTIMAS DOS SEMANAS. No hay respuesta correcta ni falsa.',
              legend: [],
              questions: [
                { index: 1, text: '', options: 3, textOptions: ["Estoy triste de vez en cuando.", "Estoy triste muchas veces.", "Estoy triste siempre."] },
                { index: 2, text: '', options: 3, textOptions: ["Nunca me saldrá nada bien.", "No estoy seguro de si las cosas me saldrán bien.", "Las cosas me saldrán bien."] },
                { index: 3, text: '', options: 3, textOptions: ["Hago bien la mayoría de las cosas.", "Hago mal muchas cosas.", "Todo lo hago mal."] },
                { index: 4, text: '', options: 3, textOptions: ["Me divierten muchas cosas.", "Me divierten algunas cosas.", "Nada me divierte."] },
                { index: 5, text: '', options: 3, textOptions: ["Soy malo siempre.", "Soy malo muchas veces.", "Soy malo algunas veces."] },
                { index: 6, text: '', options: 3, textOptions: ["A veces pienso que me pueden ocurrir cosas malas.", "Me preocupa que me ocurran cosas malas.", "Estoy seguro de que me van a ocurrir cosas terribles."] },
                { index: 7, text: '', options: 3, textOptions: ["Me odio.", "No me gusta como soy.", "Me gusta como soy."] },
                { index: 8, text: '', options: 3, textOptions: ["Todas las cosas malas son culpa mía.", "Muchas cosas malas son culpa mía.", "Generalmente no tengo la culpa de que ocurran cosas malas."] },
                { index: 9, text: '', options: 3, textOptions: ["No pienso en matarme.", "Pienso en matarme pero no lo haría.", "Quiero matarme."] },
                { index: 10, text: '', options: 3, textOptions: ["Tengo ganas de llorar todos los días.", "Tengo ganas de llorar muchos días.", "Tengo ganas de llorar de cuando en cuando."] },
                { index: 11, text: '', options: 3, textOptions: ["Las cosas me preocupan siempre.", "Las cosas me preocupan muchas veces.", "Las cosas me preocupan de cuando en cuando."] },
                { index: 12, text: '', options: 3, textOptions: ["Me gusta estar con la gente.", "Muy a menudo no me gusta estar con la gente.", "No quiero en absoluto estar con la gente."] },
                { index: 13, text: '', options: 3, textOptions: ["No puedo decidirme.", "Me cuesta decidirme.", "Me decido fácilmente."] },
                { index: 14, text: '', options: 3, textOptions: ["Tengo buen aspecto.", "Hay algunas cosas de mi aspecto que no me gustan.", "Soy feo."] },
                { index: 15, text: '', options: 3, textOptions: ["Siempre me cuesta ponerme a hacer los deberes.", "Muchas veces me cuesta ponerme a hacer los deberes.", "No me cuesta ponerme a hacer los deberes."] },
                { index: 16, text: '', options: 3, textOptions: ["Todas las noches me cuesta dormirme.", "Muchas noches me cuesta dormirme.", "Duermo muy bien."] },
                { index: 17, text: '', options: 3, textOptions: ["Estoy cansado de cuando en cuando.", "Estoy cansado muchos días.", "Estoy cansado siempre."] },
                { index: 18, text: '', options: 3, textOptions: ["La mayoría de los días no tengo ganas de comer.", "Muchos días no tengo ganas de comer.", "Como muy bien."] },
                { index: 19, text: '', options: 3, textOptions: ["No me preocupa el dolor ni la enfermedad.", "Muchas veces me preocupa el dolor y la enfermedad.", "Siempre me preocupa el dolor y la enfermedad."] },
                { index: 20, text: '', options: 3, textOptions: ["Nunca me siento solo.", "Me siento solo muchas veces.", "Me siento solo siempre."] },
                { index: 21, text: '', options: 3, textOptions: ["Nunca me divierto en el colegio.", "Me divierto en el colegio sólo de vez en cuando.", "Me divierto en el colegio muchas veces."] },
                { index: 22, text: '', options: 3, textOptions: ["Tengo muchos amigos.", "Tengo muchos amigos pero me gustaría tener más.", "No tengo amigos."] },
                { index: 23, text: '', options: 3, textOptions: ["Mi trabajo en el colegio es bueno.", "Mi trabajo en el colegio no es tan bueno como antes.", "Llevo muy mal las asignaturas que antes llevaba bien."] },
                { index: 24, text: '', options: 3, textOptions: ["Nunca podré ser tan bueno como otros niños.", "Si quiero puedo ser tan bueno como otros niños.", "Soy tan bueno como otros niños."] },
                { index: 25, text: '', options: 3, textOptions: ["Nadie me quiere.", "No estoy seguro de que alguien me quiera.", "Estoy seguro de que alguien me quiere."] },
                { index: 26, text: '', options: 3, textOptions: ["Generalmente hago lo que me dicen.", "Muchas veces no hago lo que me dicen.", "Nunca hago lo que me dicen."] },
                { index: 27, text: '', options: 3, textOptions: ["Me llevo bien con la gente.", "Me peleo muchas veces.", "Me peleo siempre."] },
              ],
            },
          ],
        }),
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
    // Marcar anteriores como no current
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