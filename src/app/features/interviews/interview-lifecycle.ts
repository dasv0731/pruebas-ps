export type AnalysisSource = 'AI' | 'MANUAL';
export type InterpretationStatus = 'PENDING' | 'COMPLETED' | 'REVIEWED';
export type InterviewStatus = 'DRAFT' | 'COMPLETED' | 'ANALYZED';

export function statusForSource(source: AnalysisSource): InterpretationStatus {
  return source === 'AI' ? 'COMPLETED' : 'REVIEWED';
}

export function canReopen(interviewStatus: InterviewStatus, caseLocked: boolean): boolean {
  if (caseLocked) return false;
  return interviewStatus === 'COMPLETED' || interviewStatus === 'ANALYZED';
}

export type ExclusionReason = 'BORRADOR' | 'SIN_ANALISIS' | 'ANALISIS_OBSOLETO';

export interface InterviewAnalysisPair {
  interviewId: string;
  interviewDate: string;
  status: InterviewStatus;
  analysis: { content: string; isStale: boolean } | null;
}

export interface ConsolidationPartition {
  included: { interviewId: string; interviewDate: string; content: string }[];
  excluded: { interviewId: string; interviewDate: string; reason: ExclusionReason }[];
}

export function partitionForConsolidation(pairs: InterviewAnalysisPair[]): ConsolidationPartition {
  const included: ConsolidationPartition['included'] = [];
  const excluded: ConsolidationPartition['excluded'] = [];
  for (const p of pairs) {
    const base = { interviewId: p.interviewId, interviewDate: p.interviewDate };
    if (p.status === 'DRAFT') { excluded.push({ ...base, reason: 'BORRADOR' }); continue; }
    if (!p.analysis) { excluded.push({ ...base, reason: 'SIN_ANALISIS' }); continue; }
    if (p.analysis.isStale) { excluded.push({ ...base, reason: 'ANALISIS_OBSOLETO' }); continue; }
    included.push({ ...base, content: p.analysis.content });
  }
  return { included, excluded };
}
