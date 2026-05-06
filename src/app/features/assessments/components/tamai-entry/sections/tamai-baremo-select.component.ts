import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { BaremoOption } from '../tamai-level-config';

@Component({
  selector: 'tamai-baremo-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tamai-baremo-select.component.html',
})
export class TamaiBaremoSelectComponent {
  @Input({ required: true }) options!: BaremoOption[];
  @Input({ required: true }) control!: FormControl;
}
