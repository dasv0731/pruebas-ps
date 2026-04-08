import { Injectable } from '@angular/core';
import { getTestConfig } from '../tests/test-registry';
import { TestConfig } from '../models/test.interfaces';

export interface PrintData {
  subjectName: string;
  subjectDocumentId: string;
  subjectType: string;
  caseNumber: string;
  assessmentName: string;
  shortName: string;
  date: string;
  answers: number[];
}

@Injectable({
  providedIn: 'root',
})
export class PrintService {

  generatePrintHtml(data: PrintData): string {
    const config = getTestConfig(data.shortName);
    if (!config) return '<p>Prueba no encontrada en el registro.</p>';

    let answerIndex = 0;
    let sectionsHtml = '';

    for (const section of config.sections) {
      sectionsHtml += `<div class="section">`;
      sectionsHtml += `<h3>${section.title}</h3>`;

      if (section.instructions) {
        sectionsHtml += `<div class="instructions">${section.instructions}</div>`;
      }

      sectionsHtml += `<table class="answers-table">`;
      sectionsHtml += `<thead><tr><th class="col-num">#</th><th class="col-question">Pregunta</th><th class="col-answer">Respuesta</th></tr></thead>`;
      sectionsHtml += `<tbody>`;

      for (const q of section.questions) {
        const answer = data.answers[answerIndex] || 0;
        const answerText = this.getAnswerText(config, q, answer);

        const questionText = q.text || (q.textOptions ? `Pregunta ${q.index}` : `Pregunta ${q.index}`);

        sectionsHtml += `<tr>`;
        sectionsHtml += `<td class="col-num">${q.index}</td>`;
        sectionsHtml += `<td class="col-question">${q.textOptions ? this.formatTextOptions(q.textOptions, answer) : questionText}</td>`;
        sectionsHtml += `<td class="col-answer">${answerText}</td>`;
        sectionsHtml += `</tr>`;
        answerIndex++;
      }

      sectionsHtml += `</tbody></table></div>`;
    }

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Respuestas - ${data.assessmentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #333; padding: 15px; font-size: 11px; }
    .header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #2c3e50; padding-bottom: 6px; }
    .header h1 { font-size: 16px; color: #2c3e50; margin-bottom: 2px; }
    .header h2 { font-size: 13px; color: #555; font-weight: normal; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; margin-bottom: 8px; padding: 6px 10px; background: #f7f8fa; border-radius: 4px; }
    .info-item { display: flex; gap: 6px; }
    .info-label { font-weight: 600; color: #4a5568; min-width: 120px; }
    .info-value { color: #2d3748; }
    .section { margin-bottom: 10px; }
    .section h3 { font-size: 12px; color: #2c3e50; border-bottom: 1px solid #3498db; padding-bottom: 3px; margin-bottom: 6px; }
    .instructions { background: #e8f4f8; padding: 4px 8px; border-left: 3px solid #3498db; margin-bottom: 6px; font-size: 10px; color: #555; }
    .answers-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 10px; }
    .answers-table th { background: #f0f0f0; padding: 3px 6px; text-align: left; font-weight: 600; border: 1px solid #ddd; }
    .answers-table td { padding: 2px 6px; border: 1px solid #ddd; vertical-align: top; }
    .col-num { width: 30px; text-align: center; }
    .col-answer { width: 80px; text-align: center; font-weight: 600; }
    .selected-option { font-weight: bold; color: #2c3e50; }
    .unselected-option { color: #aaa; font-size: 9px; }
    .signature-section { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
    .signature-box { text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 11px; }
    .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #999; }
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>REGISTRO DE RESPUESTAS</h1>
    <h2>${data.assessmentName}</h2>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <span class="info-label">Evaluado:</span>
      <span class="info-value">${data.subjectName}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Identificación:</span>
      <span class="info-value">${data.subjectDocumentId || 'No registrada'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Rol:</span>
      <span class="info-value">${data.subjectType}</span>
    </div>
    <div class="info-item">
      <span class="info-label">N° Caso:</span>
      <span class="info-value">${data.caseNumber}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Fecha de aplicación:</span>
      <span class="info-value">${data.date}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Total preguntas:</span>
      <span class="info-value">${data.answers.length}</span>
    </div>
  </div>

  ${sectionsHtml}

  <div class="signature-section">
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-line">${data.subjectName}<br>Evaluado/a</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Psicóloga Perito<br>Profesional responsable</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${new Date().toLocaleString('es-EC')} — Sistema de Peritajes Psicológicos
  </div>
</body>
</html>`;
  }

  private getAnswerText(config: TestConfig, question: any, answer: number): string {
    if (config.optionLabels && config.optionLabels.length > 0) {
      return config.optionLabels[answer - 1] || String(answer);
    }
    if (question.textOptions && question.textOptions.length > 0) {
      return question.textOptions[answer - 1] || String(answer);
    }
    return String(answer);
  }

  private formatTextOptions(textOptions: string[], selectedAnswer: number): string {
    return textOptions.map((opt, i) => {
      if (i + 1 === selectedAnswer) {
        return `<span class="selected-option">► ${opt}</span>`;
      }
      return `<span class="unselected-option">${opt}</span>`;
    }).join('<br>');
  }

  openPrintWindow(html: string) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }
}