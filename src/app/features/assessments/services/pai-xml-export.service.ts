import { Injectable } from '@angular/core';
import { AssessmentService } from './assessment.service';
import { SubjectService } from '../../../core/services/subject.service';

@Injectable({ providedIn: 'root' })
export class PaiXmlExportService {
  constructor(
    private assessmentService: AssessmentService,
    private subjectService: SubjectService,
  ) {}

  buildSuggestedName(subject: any, ageYears: number | null | undefined): string {
    const firstName = (subject?.firstName || '').trim();
    const lastName = (subject?.lastName || '').trim();
    const age = ageYears ?? '';
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastParts = lastName.split(/\s+/).filter(Boolean);
    const lastInitials = lastParts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
    return `${firstInitial}${lastInitials}${age}`;
  }

  async loadSuggestedName(sessionId: string): Promise<string> {
    const session = await this.assessmentService.getSession(sessionId);
    if (!session) return 'PAI';
    const subject = await this.subjectService.getById(session.subjectId);
    return this.buildSuggestedName(subject, session.subjectAgeYears);
  }

  async buildXml(sessionId: string, nombre: string): Promise<string> {
    const session = await this.assessmentService.getSession(sessionId);
    if (!session) throw new Error('Sesión no encontrada');

    const edad = session.subjectAgeYears ?? 0;
    const sexo = session.subjectSex === 'MALE' ? 0 : 1;

    let answers: number[] = [];
    if (session.answers) {
      try {
        answers = typeof session.answers === 'string'
          ? JSON.parse(session.answers)
          : (session.answers as number[]);
      } catch { answers = []; }
    }

    // PAI: opciones almacenadas 1-4; 0 = ítem en blanco. TEA usa 0 para blancos/dobles marcas.
    const respuestas = answers.join('');

    return `<sujetos>\n  <sujeto idSujeto='1' nombre='${nombre}' edad='${edad}' sexo='${sexo}' respuestas='${respuestas}' />\n</sujetos>`;
  }

  downloadXml(xml: string, nombre: string): void {
    const filename = `PAI_${nombre}.xml`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
