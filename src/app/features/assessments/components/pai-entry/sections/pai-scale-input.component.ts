import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'pai-scale-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pai-scale-input.component.html',
  styleUrl: './pai-scale-input.component.scss',
})
export class PaiScaleInputComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input({ required: true }) abbr!: string;
  @Input({ required: true }) label!: string;
  @Input() onlyT = false;
  @Input() variant: 'main' | 'sub' = 'main';

  isInvalid(field: 'pd' | 't'): boolean {
    const c = this.group.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
