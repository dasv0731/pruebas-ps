import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PaiScaleInputComponent } from './pai-scale-input.component';

@Component({
  selector: 'pai-section-tratamiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaiScaleInputComponent],
  templateUrl: './pai-section-tratamiento.component.html',
})
export class PaiSectionTratamientoComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly agr = { key: 'AGR', label: 'Agresión' };
  readonly agrSubs = [
    { key: 'AGR_A', label: 'AGR-A Actitud Agresiva' },
    { key: 'AGR_V', label: 'AGR-V Agresiones Verbales' },
    { key: 'AGR_F', label: 'AGR-F Agresiones Físicas' },
  ];
  readonly otras = [
    { key: 'SUI', label: 'Ideación Suicida' },
    { key: 'EST', label: 'Estrés' },
    { key: 'FAS', label: 'Falta de Apoyo Social' },
    { key: 'RTR', label: 'Rechazo al Tratamiento' },
  ];

  groupOf(key: string): FormGroup {
    return this.group.get(key) as FormGroup;
  }
}
