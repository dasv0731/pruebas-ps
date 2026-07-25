import { PendingTeaAssessment } from './pending-assessments.service';
import { TeaXmlExportService } from './tea-xml-export.service';

function item(overrides: Partial<PendingTeaAssessment> = {}): PendingTeaAssessment {
  return {
    id: 'session-1',
    shortName: 'CUIDA',
    assessmentName: 'CUIDA',
    caseId: 'case-1',
    caseNumber: 'EXP-1',
    subjectId: 'subject-1',
    subjectName: "O'Hara",
    subjectType: 'MADRE',
    status: 'COMPLETED',
    completedAt: '2026-07-24T10:00:00.000Z',
    subjectAgeYears: 31,
    subjectSex: 'FEMALE',
    answers: [1, 0, 4],
    answerCount: 3,
    expectedQuestions: 3,
    validationIssues: [],
    isExportable: true,
    suggestedName: "O'Hara",
    entryRoute: [],
    caseRoute: [],
    ...overrides,
  };
}

describe('TeaXmlExportService', () => {
  it('genera un XML agrupado con varios sujetos y escapa atributos', () => {
    const service = new TeaXmlExportService();
    const xml = service.buildBatchXml([
      item(),
      item({ id: 'session-2', suggestedName: 'AB32', answers: [4, 3, 2] }),
    ]);

    expect(xml.startsWith('<sujetos>')).toBeTrue();
    expect(xml).toContain("idSujeto='1'");
    expect(xml).toContain("idSujeto='2'");
    expect(xml).toContain("nombre='O&apos;Hara'");
    expect(xml).toContain("respuestas='104'");
    expect(xml).toContain("respuestas='432'");
    expect(xml.endsWith('</sujetos>')).toBeTrue();
  });

  it('rechaza una descarga sin pruebas seleccionadas', () => {
    const service = new TeaXmlExportService();

    expect(() => service.buildBatchXml([])).toThrowError(
      'No hay pruebas seleccionadas para exportar.',
    );
  });
});
