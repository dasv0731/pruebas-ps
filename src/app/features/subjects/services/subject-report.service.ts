import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { listAll } from '../../../core/utils/paginate';

const client = generateClient<Schema>();

@Injectable({
  providedIn: 'root',
})
export class SubjectReportService {

  // ── SUBJECT ASSESSMENT REPORT ──

  async getAssessmentReport(subjectId: string) {
    const data = await listAll<any>((args) => (client.models as any).SubjectAssessmentReport.list({
      filter: { subjectId: { eq: subjectId }, isCurrent: { eq: true } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
  }

  async saveAssessmentReport(subjectId: string, content: string, aiModel: string) {
    const existing = await (client.models as any).SubjectAssessmentReport.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).SubjectAssessmentReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).SubjectAssessmentReport.create({
      subjectId,
      content,
      source: 'AI',
      status: 'COMPLETED',
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  // ── SUBJECT INTERVIEW REPORT ──

  async getInterviewReport(subjectId: string) {
    const data = await listAll<any>((args) => (client.models as any).SubjectInterviewReport.list({
      filter: { subjectId: { eq: subjectId }, isCurrent: { eq: true } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
  }

  async saveInterviewReport(subjectId: string, content: string, aiModel: string) {
    const existing = await (client.models as any).SubjectInterviewReport.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).SubjectInterviewReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).SubjectInterviewReport.create({
      subjectId,
      content,
      source: 'AI',
      status: 'COMPLETED',
      version,
      isCurrent: true,
      isStale: false,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async markInterviewReportStale(subjectId: string): Promise<void> {
    const list = await (client.models as any).SubjectInterviewReport.list({
      filter: { subjectId: { eq: subjectId }, isCurrent: { eq: true } },
    });
    for (const item of list.data ?? []) {
      if (item.isStale !== true) {
        await (client.models as any).SubjectInterviewReport.update({ id: item.id, isStale: true });
      }
    }
  }

  // ── SUBJECT REPORT (Informe final por implicado) ──

  async getSubjectReport(subjectId: string) {
    const data = await listAll<any>((args) => (client.models as any).SubjectReport.list({
      filter: { subjectId: { eq: subjectId }, isCurrent: { eq: true } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
  }

  async saveSubjectReport(subjectId: string, caseId: string, content: string, aiModel: string, status: string = 'DRAFT') {
    const existing = await (client.models as any).SubjectReport.list({
      filter: { subjectId: { eq: subjectId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).SubjectReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).SubjectReport.create({
      subjectId,
      caseId,
      content,
      source: aiModel === 'MANUAL' ? 'MANUAL' : 'AI',
      status,
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async updateSubjectReportStatus(reportId: string, status: string) {
    const { data, errors } = await (client.models as any).SubjectReport.update({
      id: reportId,
      status,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));

    // Si se aprueba un SubjectReport, invalidar CaseReport existente
    if (status === 'APPROVED') {
      // No invalidamos aquí, lo haremos al consultar
    }

    return data;
  }

  // ── CASE REPORT (Informe final del juicio) ──

  async getCaseReport(caseId: string) {
    const data = await listAll<any>((args) => (client.models as any).CaseReport.list({
      filter: { caseId: { eq: caseId }, isCurrent: { eq: true } },
      ...args,
    }));
    return data.length > 0 ? data[0] : null;
  }

  async saveCaseReport(caseId: string, content: string, aiModel: string, status: string = 'DRAFT') {
    const existing = await (client.models as any).CaseReport.list({
      filter: { caseId: { eq: caseId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await (client.models as any).CaseReport.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await (client.models as any).CaseReport.create({
      caseId,
      content,
      source: aiModel === 'MANUAL' ? 'MANUAL' : 'AI',
      status,
      version,
      isCurrent: true,
      aiModel,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  async updateCaseReportStatus(reportId: string, status: string) {
    const { data, errors } = await (client.models as any).CaseReport.update({
      id: reportId,
      status,
    });
    if (errors) throw new Error(errors.map((e: any) => e.message).join(', '));
    return data;
  }

  // ── VALIDACIONES ──

  async getAllSubjectReports(caseId: string) {
    return listAll((args) => (client.models as any).SubjectReport.list({
      filter: { caseId: { eq: caseId }, isCurrent: { eq: true } },
      ...args,
    }));
  }

  async canGenerateCaseReport(
    caseId: string,
    subjects: { id: string; excludedFromCaseReport?: boolean | null }[]
  ): Promise<{ ready: boolean; approved: number; excluded: number; missing: number }> {
    const reports = await this.getAllSubjectReports(caseId);
    const excludedIds = new Set(subjects.filter(s => !!s.excludedFromCaseReport).map(s => s.id));
    const approved = reports.filter(
      (r: any) => r.status === 'APPROVED' && !excludedIds.has(r.subjectId)
    ).length;
    const excluded = excludedIds.size;
    const total = subjects.length;
    return {
      ready: total > 0 && approved >= 1 && approved + excluded === total,
      approved,
      excluded,
      missing: total - approved - excluded,
    };
  }


}