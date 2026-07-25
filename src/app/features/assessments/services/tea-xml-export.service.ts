import { Injectable } from '@angular/core';
import { PendingTeaAssessment, TeaTestShortName } from './pending-assessments.service';

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

@Injectable({ providedIn: 'root' })
export class TeaXmlExportService {
  buildBatchXml(items: PendingTeaAssessment[]): string {
    if (items.length === 0) {
      throw new Error('No hay pruebas seleccionadas para exportar.');
    }
    const invalid = items.filter((item) => !item.isExportable);
    if (invalid.length > 0) {
      throw new Error(`Hay ${invalid.length} prueba(s) con datos incompletos o inválidos.`);
    }

    const rows = items.map((item, index) => {
      const name = escapeXmlAttribute(item.suggestedName || item.subjectName);
      const age = item.subjectAgeYears ?? 0;
      const sex = item.subjectSex === 'MALE' ? 0 : 1;
      const answers = item.answers.join('');

      return `  <sujeto idSujeto='${index + 1}' nombre='${name}' edad='${age}' sexo='${sex}' respuestas='${answers}' />`;
    });

    return `<sujetos>\n${rows.join('\n')}\n</sujetos>`;
  }

  downloadBatch(shortName: TeaTestShortName, xml: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${shortName}_pendientes_${date}.xml`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
