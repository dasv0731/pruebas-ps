import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PaiScaleInputComponent } from './pai-scale-input.component';

@Component({
  selector: 'pai-section-interpersonales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaiScaleInputComponent],
  templateUrl: './pai-section-interpersonales.component.html',
})
export class PaiSectionInterpersonalesComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly scales = [
    { key: 'DOM', label: 'Dominancia' },
    { key: 'AFA', label: 'Afabilidad' },
  ];

  groupOf(key: string): FormGroup {
    return this.group.get(key) as FormGroup;
  }
}
