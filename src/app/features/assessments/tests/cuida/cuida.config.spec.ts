import { CUIDA_CONFIG } from './cuida.config';

describe('CUIDA_CONFIG', () => {
  it('mantiene los 189 elementos y el ítem crítico oficial 189', () => {
    const questions = CUIDA_CONFIG.sections.flatMap((section) => section.questions);

    expect(CUIDA_CONFIG.totalQuestions).toBe(189);
    expect(questions.length).toBe(189);
    expect(questions[188].index).toBe(189);
    expect(questions[188].text).toContain(
      'Con la cantidad de niños que necesitan un hogar es absurdo traer un hijo al mundo',
    );
  });
});
