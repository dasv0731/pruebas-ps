import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'tamai-scale-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tamai-scale-input.component.html',
  styleUrl: './tamai-scale-input.component.scss',
})
export class TamaiScaleInputComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input({ required: true }) abbr!: string;
  @Input({ required: true }) label!: string;
  @Input() depth = 0;

  isInvalid(field: 'pd' | 'pc'): boolean {
    const c = this.group.get(field);
    return !!(c && c.invalid && c.touched);
  }

  get indentStyle(): { [k: string]: string } {
    return { 'padding-left.px': String(this.depth * 16) };
  }
}
