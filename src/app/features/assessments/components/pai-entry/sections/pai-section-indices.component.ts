import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PaiScaleInputComponent } from './pai-scale-input.component';

@Component({
  selector: 'pai-section-indices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaiScaleInputComponent],
  templateUrl: './pai-section-indices.component.html',
})
export class PaiSectionIndicesComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly indices = [
    { key: 'INC_F', abbr: 'INC-F', label: 'Inconsistencia final del cuestionario', onlyT: false },
    { key: 'SIM',   abbr: 'SIM',   label: 'Índice de simulación', onlyT: false },
    { key: 'FDR',   abbr: 'FDR',   label: 'Función discriminante de Rogers', onlyT: false },
    { key: 'DEF',   abbr: 'DEF',   label: 'Índice de defensividad', onlyT: false },
    { key: 'FDC',   abbr: 'FDC',   label: 'Función discriminante de Cashel', onlyT: false },
    { key: 'IPS',   abbr: 'IPS',   label: 'Índice potencial de suicidio', onlyT: false },
    { key: 'IPV',   abbr: 'IPV',   label: 'Índice potencial de violencia', onlyT: false },
    { key: 'IDT',   abbr: 'IDT',   label: 'Índice de dificultad de tratamiento', onlyT: false },
    { key: 'ALC_Est', abbr: 'ALC-Est', label: 'Índice est. problemas con alcohol (solo T)', onlyT: true },
    { key: 'DRO_Est', abbr: 'DRO-Est', label: 'Índice est. problemas con drogas (solo T)', onlyT: true },
  ];

  groupOf(key: string): FormGroup {
    return this.group.get(key) as FormGroup;
  }
}
