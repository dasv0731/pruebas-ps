import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ScaleNode } from '../tamai-level-config';
import { TamaiScaleTreeComponent } from './tamai-scale-tree.component';

@Component({
  selector: 'tamai-section-block',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TamaiScaleTreeComponent],
  templateUrl: './tamai-section-block.component.html',
})
export class TamaiSectionBlockComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) nodes!: ScaleNode[];
  @Input({ required: true }) escalasGroup!: FormGroup;
}
