import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'pai-items-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pai-items-list.component.html',
  styleUrl: './pai-items-list.component.scss',
})
export class PaiItemsListComponent {
  @Input({ required: true }) arr!: FormArray;
  @Input({ required: true }) title!: string;
  @Input() emptyText = 'Sin ítems registrados.';
  @Input() maxItem = 344;

  readonly responseOptions = [
    { value: 0, label: 'F' },
    { value: 1, label: 'LV' },
    { value: 2, label: 'BV' },
    { value: 3, label: 'CV' },
  ];

  constructor(private fb: FormBuilder) {}

  get groups(): FormGroup[] {
    return this.arr.controls as FormGroup[];
  }

  addItem(): void {
    this.arr.push(this.fb.group({
      itemNumber: [null, [Validators.required, Validators.min(1), Validators.max(this.maxItem)]],
      response: [null, [Validators.required, Validators.min(0), Validators.max(3)]],
    }));
  }

  removeItem(index: number): void {
    this.arr.removeAt(index);
  }

  isInvalid(group: FormGroup, field: string): boolean {
    const c = group.get(field);
    return !!(c && c.invalid && c.touched);
  }
}
