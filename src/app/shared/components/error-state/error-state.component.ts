import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  @Input({ required: true }) message!: string;
  /** Texto del botón principal (reintentar). Si no se pasa, no se muestra. */
  @Input() retryLabel?: string;
  /** Texto del botón secundario (volver, cancelar, etc.). Si no se pasa, no se muestra. */
  @Input() secondaryLabel?: string;
  /** Variante visual: inline (más compacto) o block (con icono y más espacio). */
  @Input() variant: 'inline' | 'block' = 'inline';

  @Output() retry = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();

  onRetry() { this.retry.emit(); }
  onSecondary() { this.secondary.emit(); }
}
