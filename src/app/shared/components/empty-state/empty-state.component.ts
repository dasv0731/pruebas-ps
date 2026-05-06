import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionVariant: 'primary' | 'secondary' = 'primary';
  /** Si se quiere un icono inline, pásalo como SVG en este campo (ya pintado en CSS). */
  @Input() icon: 'inbox' | 'document' | 'search' | 'check' = 'inbox';

  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}
