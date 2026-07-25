import {
  statusForSource, canReopen, partitionForConsolidation, InterviewAnalysisPair,
} from './interview-lifecycle';

describe('interview-lifecycle', () => {
  it('mapea source -> status', () => {
    expect(statusForSource('AI')).toBe('COMPLETED');
    expect(statusForSource('MANUAL')).toBe('REVIEWED');
  });

  it('permite reabrir solo COMPLETED/ANALYZED y con caso abierto', () => {
    expect(canReopen('COMPLETED', false)).toBe(true);
    expect(canReopen('ANALYZED', false)).toBe(true);
    expect(canReopen('DRAFT', false)).toBe(false);
    expect(canReopen('ANALYZED', true)).toBe(false); // caso cerrado
  });

  it('particiona entrevistas para consolidar', () => {
    const pairs: InterviewAnalysisPair[] = [
      { interviewId: 'a', interviewDate: '2026-01-01', status: 'ANALYZED', analysis: { content: 'X', isStale: false } },
      { interviewId: 'b', interviewDate: '2026-01-02', status: 'ANALYZED', analysis: { content: 'Y', isStale: true } },
      { interviewId: 'c', interviewDate: '2026-01-03', status: 'COMPLETED', analysis: null },
      { interviewId: 'd', interviewDate: '2026-01-04', status: 'DRAFT', analysis: null },
    ];
    const p = partitionForConsolidation(pairs);
    expect(p.included).toEqual([{ interviewId: 'a', interviewDate: '2026-01-01', content: 'X' }]);
    expect(p.excluded).toEqual([
      { interviewId: 'b', interviewDate: '2026-01-02', reason: 'ANALISIS_OBSOLETO' },
      { interviewId: 'c', interviewDate: '2026-01-03', reason: 'SIN_ANALISIS' },
      { interviewId: 'd', interviewDate: '2026-01-04', reason: 'BORRADOR' },
    ]);
  });

  it('devuelve particiones vacias cuando no hay entrevistas', () => {
    expect(partitionForConsolidation([])).toEqual({ included: [], excluded: [] });
  });

  it('incluye todas las entrevistas que tienen analisis vigente', () => {
    const pairs: InterviewAnalysisPair[] = [
      { interviewId: 'a', interviewDate: '2026-02-01', status: 'COMPLETED', analysis: { content: 'X', isStale: false } },
      { interviewId: 'b', interviewDate: '2026-02-02', status: 'ANALYZED', analysis: { content: 'Y', isStale: false } },
    ];

    expect(partitionForConsolidation(pairs)).toEqual({
      included: [
        { interviewId: 'a', interviewDate: '2026-02-01', content: 'X' },
        { interviewId: 'b', interviewDate: '2026-02-02', content: 'Y' },
      ],
      excluded: [],
    });
  });

  it('excluye todas las entrevistas no consolidables', () => {
    const pairs: InterviewAnalysisPair[] = [
      { interviewId: 'a', interviewDate: '2026-03-01', status: 'DRAFT', analysis: { content: 'X', isStale: false } },
      { interviewId: 'b', interviewDate: '2026-03-02', status: 'COMPLETED', analysis: null },
      { interviewId: 'c', interviewDate: '2026-03-03', status: 'ANALYZED', analysis: { content: 'Z', isStale: true } },
    ];

    expect(partitionForConsolidation(pairs)).toEqual({
      included: [],
      excluded: [
        { interviewId: 'a', interviewDate: '2026-03-01', reason: 'BORRADOR' },
        { interviewId: 'b', interviewDate: '2026-03-02', reason: 'SIN_ANALISIS' },
        { interviewId: 'c', interviewDate: '2026-03-03', reason: 'ANALISIS_OBSOLETO' },
      ],
    });
  });
});
