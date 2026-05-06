import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type SegmentKind = 'text' | 'inference' | 'not-referred';

interface Segment {
  kind: SegmentKind;
  text: string;
}

/**
 * Patrón que reconoce los marcadores que la IA inserta en su análisis:
 *   [Inferencia clínica]               → señala un salto del dato literal a inferencia.
 *   [No referido en la entrevista]     → señala una sección sin información en la entrevista.
 *   [No referido]                       → variante corta.
 *
 * Insensible a mayúsculas para tolerar pequeñas variaciones del modelo.
 */
const MARKER_REGEX = /\[(?:Inferencia clínica|No referido(?: en la entrevista)?)\]/gi;

function classify(token: string): SegmentKind {
  const lower = token.toLowerCase();
  if (lower.includes('inferencia')) return 'inference';
  if (lower.includes('no referido')) return 'not-referred';
  return 'text';
}

function parseSegments(content: string): Segment[] {
  if (!content) return [];
  const parts = content.split(MARKER_REGEX);
  // El split sin grupos de captura no devuelve los matches, así que reconstruyo
  // recorriendo matches y huecos.
  const matches: Array<{ index: number; text: string }> = [];
  for (const m of content.matchAll(MARKER_REGEX)) {
    matches.push({ index: m.index ?? 0, text: m[0] });
  }
  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) {
      segments.push({ kind: 'text', text: content.slice(cursor, m.index) });
    }
    segments.push({ kind: classify(m.text), text: m.text });
    cursor = m.index + m.text.length;
  }
  if (cursor < content.length) {
    segments.push({ kind: 'text', text: content.slice(cursor) });
  }
  // Si no hubo ningún marker, parts tendrá un solo elemento con todo el texto
  if (segments.length === 0 && parts.length > 0) {
    segments.push({ kind: 'text', text: parts.join('') });
  }
  return segments;
}

@Component({
  selector: 'app-analysis-output',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-output.component.html',
  styleUrl: './analysis-output.component.scss',
})
export class AnalysisOutputComponent {
  @Input({ required: true }) content!: string;

  get segments(): Segment[] {
    return parseSegments(this.content);
  }
}
