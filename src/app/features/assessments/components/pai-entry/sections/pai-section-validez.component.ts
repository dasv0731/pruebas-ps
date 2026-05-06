import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PaiScaleInputComponent } from './pai-scale-input.component';

@Component({
  selector: 'pai-section-validez',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaiScaleInputComponent],
  templateUrl: './pai-section-validez.component.html',
})
export class PaiSectionValidezComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly scales = [
    { key: 'INC', label: 'Inconsistencia' },
    { key: 'INF', label: 'Infrecuencia' },
    { key: 'IMN', label: 'Impresión Negativa' },
    { key: 'IMP', label: 'Impresión Positiva' },
  ] as const;

  groupOf(key: string): FormGroup {
    return this.group.get(key) as FormGroup;
  }
}
