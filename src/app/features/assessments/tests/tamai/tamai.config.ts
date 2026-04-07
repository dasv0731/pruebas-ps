import { TestConfig } from '../../models/test.interfaces';

const PERSONAL_QUESTIONS = [
  "Me gustaría tener menos edad", "Me gustaría nacer de nuevo y ser distinto de cómo soy", "Todo me sale mal", "Pienso mucho en la muerte", "Los demás son más fuertes que yo", "Me aburro jugando", "Soy muy miedoso", "Casi siempre sueño cosas tristes", "Si hubiera una catástrofe, seguro que me moriría", "Me da miedo la gente", "Me asusto y lloro muchas veces", "Creo que soy malo", "Creo que soy bastante tonto", "Soy muy vergonzoso", "Muchas veces siento pena y lloro", "A veces siento que soy un desastre", "La vida muchas veces es triste", "Hay veces que me cuesta concentrarme en lo que hago", "Algunas veces tengo ganas de morirme", "Suelo sentir molestias y dolores en todo el cuerpo", "Me tengo rabia a mí mismo alguna vez", "A veces siento que soy inútil",
];

const ESCOLAR_QUESTIONS = [
  "Me fastidia estudiar", "Saco malas notas", "Paso mucho tiempo distraído", "Estudio y trabajo poco", "Creo que soy bastante vago", "Me canso rápidamente cuando trabajo o estudio", "Me porto muy mal en clase", "Suelo estar hablando y molestando", "Soy revoltoso y desobediente", "Me da igual saber que no saber", "Me aburre estudiar", "Me gustaría que todo el año fueran vacaciones", "Me resulta aburrido todo lo que estudio", "Me gustaría tener otros profesores", "Estoy a disgusto con el profesor o profesores que tengo", "Me gustaría que los profesores fueran de otra manera", "Me fastidia ir al colegio", "Deseo que se acaben las clases para marcharme", "Me aburro en la clase", "Prefiero cambiar de colegio",
];

const SOCIAL_QUESTIONS = [
  "Tengo muy pocos amigos", "Jugando solo estoy más a gusto", "Suelo estar callado cuando estoy con los demás", "Me cuesta hacer amigos de los otros", "Prefiero estar con pocas personas", "Los compañeros se están metiendo siempre conmigo", "Los demás son malos y envidiosos", "Me gustaría ser muy poderoso para mandar", "Siempre estoy discutiendo", "Me enfado muchas veces y peleo", "Tengo muy mal genio", "Me suelen decir que soy inquieto", "Me suelen decir que soy revoltoso", "Me suelen decir que soy sucio y descuidado", "Me suelen decir que soy desordenado", "Rompo y ensucio en seguida las cosas", "Me aburro y me canso en seguida de lo que estoy haciendo", "Me enfado, discuto y peleo con facilidad",
];

const SATISFACCION_QUESTIONS = [
  "Creo que soy bueno, guapo, listo, trabajador y alegre", "Casi siempre estoy alegre", "Los demás piensan que soy valiente", "Casi siempre estoy tranquilo, sin temblar ni enrojecer", "Normalmente estoy bien, sin mareos ni ahogos", "Creo que soy una persona tranquila y sin preocupaciones", "La culpa de lo malo que me pasa la suelen tener los demás", "Me gustaría ser de la misma forma que soy ahora", "Cuando me levanto me encuentro bien, sin dolores", "Normalmente estoy bien, sin marearme ni ganas de devolver", "Casi siempre tengo bien el estómago", "Casi siempre tengo bien la cabeza", "Como con mucho apetito y duermo muy bien", "Tengo muy buena salud", "Hablo con las personas mayores, sin vergüenza y tranquilo", "Todo el mundo me quiere", "Soy una persona muy feliz",
];

const ESCOLAR_POS_QUESTIONS = [
  "Estudio y trabajo bastante", "Saco buenas notas", "Normalmente estoy atento y aplicado", "Acostumbro a estar en silencio en clase", "Mis profesores están contentos con mi comportamiento", "Me agrada hacer los trabajos de matemáticas", "Me gusta estudiar las ciencias naturales y sociales", "Me gustan los ejercicios de conocimientos y lenguaje", "Mis profesores son buenos y amables", "Mis profesores enseñan bien", "En clase estoy más a gusto que en una fiesta",
];

const SOCIAL_POS_QUESTIONS = [
  "Me gusta estar con mucha gente", "Soy muy chistoso y hablador", "Me aburro cuando estoy solo", "Prefiero salir con los amigos que ver la televisión", "Enseguida me hago amigo de los demás", "Me comporto igual cuando estoy solo que con gente", "Casi todas las personas que conozco son buenas", "Normalmente prefiero callar que ponerme a discutir", "Me quedo muy tranquilo si se burlan de mí o critican", "Cuando pierdo en el juego me alegro de los que ganan", "Prefiero ser uno más de la cuadrilla que ser el jefe", "Soy muy cuidadoso con las cosas", "Me dicen que soy muy obediente", "Casi siempre hago las cosas sin rechistar", "Trato con mucho cariño a los animales", "Me suelen decir que me porto bien y soy bueno", "Siempre, siempre, digo la verdad",
];

const FAMILIAR_QUESTIONS = [
  "Mi casa la encuentro triste, estoy a disgusto en ella",
  "Mis padres discuten muchas veces",
  "Mis padres muchas veces se enfadan",
  "Mis padres se quieren poco",
  "En mi casa hay bastantes líos",
];

const HERMANOS_QUESTIONS = [
  "Peleo y me llevo mal con mis hermanos", "Algunos hermanos se meten mucho conmigo", "Me gustaría no tener hermanos y ser yo solo", "Algunos hermanos me tienen envidia", "Alguna vez deseo que desaparezca algún hermano",
];

const PARENTAL_QUESTIONS = [
  "Me trata muy bien, como a una persona mayor", "Me quiere mucho", "Me anima a hacer las cosas",
  "Me castiga o riñe pocas veces, cuando es necesario", "Me deja actuar a mi solo; tiene confianza en mí",
  "Está muy pendiente de mí", "Suele estar con miedo de que me pase algo", "Me ayuda demasiado",
  "Se preocupa de lo que he hecho y con quién he estado", "Me defiende", "Me deja hacer todo lo que yo quiero",
  "Le hace gracia lo que digo o hago", "Muy pocas veces me castiga o riñe", "Casi todo lo que pido me lo concede",
  "Llorando o enfadándome consigo lo que deseo", "Siempre me está llamando la atención", "Quiere que sea como una persona mayor",
  "Me exige y me controla", "Todo lo que hago parece que está mal", "Se enfada por cualquier cosa",
  "Me hace poco caso", "Habla poco conmigo", "Quiere a otros hermanos más que a mí", "Se preocupa poco por mí",
  "Muchas veces siento que me tienen abandonado", "Me suele pegar muchas veces", "Siempre me está chillando",
  "Me quiere poco", "Es serio conmigo", "Me tiene manía",
];

function buildSectionQuestions(items: string[], startIndex: number): { questions: any[], nextIndex: number } {
  const questions: any[] = [];
  let index = startIndex;
  for (const text of items) {
    questions.push({ index, text: `${index}. ${text}`, options: 2 });
    index++;
  }
  return { questions, nextIndex: index };
}

function buildAllSections() {
  let idx = 1;

  const personal = buildSectionQuestions(PERSONAL_QUESTIONS, idx);
  idx = personal.nextIndex;

  const escolar = buildSectionQuestions(ESCOLAR_QUESTIONS, idx);
  idx = escolar.nextIndex;

  const social = buildSectionQuestions(SOCIAL_QUESTIONS, idx);
  idx = social.nextIndex;

  const satisfaccion = buildSectionQuestions(SATISFACCION_QUESTIONS, idx);
  idx = satisfaccion.nextIndex;

  const escolarPos = buildSectionQuestions(ESCOLAR_POS_QUESTIONS, idx);
  idx = escolarPos.nextIndex;

  const socialPos = buildSectionQuestions(SOCIAL_POS_QUESTIONS, idx);
  idx = socialPos.nextIndex;

  const familiar = buildSectionQuestions(FAMILIAR_QUESTIONS, idx);
  idx = familiar.nextIndex;

  const hermanos = buildSectionQuestions(HERMANOS_QUESTIONS, idx);
  idx = hermanos.nextIndex;

  const padre = buildSectionQuestions(PARENTAL_QUESTIONS, idx);
  idx = padre.nextIndex;

  const madre = buildSectionQuestions(PARENTAL_QUESTIONS, idx);
  idx = madre.nextIndex;

  const totalQuestions = idx - 1;

  return {
    totalQuestions,
    sections: [
      {
        title: 'Adaptación Personal',
        instructions: 'Conteste SÍ o NO a cada pregunta. No hay respuestas correctas ni incorrectas. Sea lo más sincero posible.',
        legend: ['SÍ', 'NO'],
        questions: personal.questions,
      },
      {
        title: 'Adaptación Escolar',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: escolar.questions,
      },
      {
        title: 'Adaptación Social',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: social.questions,
      },
      {
        title: 'Satisfacción Personal',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: satisfaccion.questions,
      },
      {
        title: 'Adaptación Escolar (positiva)',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: escolarPos.questions,
      },
      {
        title: 'Adaptación Social (positiva)',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: socialPos.questions,
      },
      {
        title: 'Adaptación Familiar',
        instructions: 'Contestar solo si conoce a ambos padres.',
        legend: ['SÍ', 'NO'],
        questions: familiar.questions,
      },
      {
        title: 'Relación con Hermanos',
        instructions: 'Contestar solo si tiene hermanos.',
        legend: ['SÍ', 'NO'],
        questions: hermanos.questions,
      },
      {
        title: 'Con respecto a mi Padre',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: padre.questions,
      },
      {
        title: 'Con respecto a mi Madre',
        instructions: '',
        legend: ['SÍ', 'NO'],
        questions: madre.questions,
      },
    ],
  };
}

const built = buildAllSections();

export const TAMAI_CONFIG: TestConfig = {
  shortName: 'TAMAI',
  name: 'TAMAI - Test Autoevaluativo Multifactorial de Adaptación Infantil',
  description: 'Evalúa la adaptación personal, escolar, social y familiar en niños y adolescentes',
  totalQuestions: built.totalQuestions,
  optionsPerQuestion: 2,
  questionType: 'NUMERIC',
  scoringType: 'LOCAL',
  optionLabels: ['SÍ', 'NO'],
  sections: built.sections,
};