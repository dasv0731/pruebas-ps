import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ScaleNode } from '../tamai-level-config';
import { TamaiScaleInputComponent } from './tamai-scale-input.component';

@Component({
  selector: 'tamai-scale-tree',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TamaiScaleInputComponent],
  templateUrl: './tamai-scale-tree.component.html',
})
export class TamaiScaleTreeComponent {
  @Input({ required: true }) nodes!: ScaleNode[];
  @Input({ required: true }) escalasGroup!: FormGroup;

  groupOf(code: string): FormGroup {
    return this.escalasGroup.get(code) as FormGroup;
  }
}
