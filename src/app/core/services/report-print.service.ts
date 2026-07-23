import { Injectable } from '@angular/core';

export interface ReportPrintData {
  /** Título del documento, p. ej. "Informe pericial del implicado". */
  title: string;
  caseNumber?: string;
  subjectName?: string;
  subjectType?: string;
  documentId?: string;
  status?: string;
  generatedAt?: string;
  /** Cuerpo narrativo del informe (texto plano con párrafos separados por saltos de línea). */
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportPrintService {

  private escapeHtml(text: string): string {
    return (text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Convierte el texto plano del informe en párrafos HTML (escapados). */
  private renderContent(content: string): string {
    const blocks = (content ?? '')
      .split(/\n\s*\n/) // párrafos separados por línea en blanco
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    if (blocks.length === 0) {
      return '<p class="empty">[Sin contenido]</p>';
    }
    return blocks
      .map((b) => `<p>${this.escapeHtml(b).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  private metaRow(label: string, value?: string): string {
    if (!value) return '';
    return `<div class="info-item"><span class="info-label">${label}:</span><span class="info-value">${this.escapeHtml(value)}</span></div>`;
  }

  generateReportHtml(data: ReportPrintData): string {
    const fecha = data.generatedAt
      ? new Date(data.generatedAt).toLocaleString('es-ES')
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #2d3748; padding: 30px 40px; font-size: 12px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
    .header h1 { font-size: 18px; color: #2c3e50; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 14px 0 20px; padding: 10px 14px; background: #f7f8fa; border-radius: 6px; }
    .info-item { display: flex; gap: 8px; }
    .info-label { font-weight: 600; color: #4a5568; min-width: 110px; }
    .info-value { color: #2d3748; }
    .content { text-align: justify; }
    .content p { margin-bottom: 12px; }
    .content .empty { color: #999; font-style: italic; }
    .signature-section { margin-top: 48px; padding-top: 15px; }
    .signature-grid { display: grid; grid-template-columns: 1fr; justify-items: end; }
    .signature-box { text-align: center; width: 260px; }
    .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 6px; font-size: 12px; }
    .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { padding: 20px 30px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(data.title)}</h1>
  </div>

  <div class="info-grid">
    ${this.metaRow('N.º de caso', data.caseNumber)}
    ${this.metaRow('Implicado', data.subjectName)}
    ${this.metaRow('Rol', data.subjectType)}
    ${this.metaRow('Identificación', data.documentId)}
    ${this.metaRow('Estado', data.status)}
    ${this.metaRow('Generado', fecha)}
  </div>

  <div class="content">
    ${this.renderContent(data.content)}
  </div>

  <div class="signature-section">
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line">Psicóloga Perito<br>Profesional responsable</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${new Date().toLocaleString('es-ES')} — Sistema de Peritajes Psicológicos.
    Este informe debe ser revisado y firmado por el profesional responsable antes de su presentación.
  </div>
</body>
</html>`;
  }

  /** Abre una ventana de impresión con el informe (el usuario puede "Guardar como PDF"). */
  print(data: ReportPrintData): void {
    const html = this.generateReportHtml(data);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}
