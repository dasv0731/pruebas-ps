import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'lines' | 'card' | 'table' | 'analysis';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'lines';
  /** Número de líneas o filas según variante. */
  @Input() lines = 3;
  /** Texto opcional bajo el skeleton (ej. "Generando análisis con IA..."). */
  @Input() label?: string;

  get range(): number[] {
    return Array.from({ length: Math.max(1, this.lines) });
  }
}
