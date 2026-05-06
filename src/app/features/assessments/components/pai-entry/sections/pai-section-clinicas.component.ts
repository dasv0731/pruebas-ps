import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { PaiScaleInputComponent } from './pai-scale-input.component';

interface ClinicalBlock {
  main: { key: string; label: string };
  subs: { key: string; label: string }[];
}

@Component({
  selector: 'pai-section-clinicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaiScaleInputComponent],
  templateUrl: './pai-section-clinicas.component.html',
  styleUrl: './pai-section-clinicas.component.scss',
})
export class PaiSectionClinicasComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly blocks: ClinicalBlock[] = [
    {
      main: { key: 'SOM', label: 'Quejas Somáticas' },
      subs: [
        { key: 'SOM_C', label: 'SOM-C Conversión' },
        { key: 'SOM_S', label: 'SOM-S Somatización' },
        { key: 'SOM_H', label: 'SOM-H Hipocondría' },
      ],
    },
    {
      main: { key: 'ANS', label: 'Ansiedad' },
      subs: [
        { key: 'ANS_C', label: 'ANS-C Cognitiva' },
        { key: 'ANS_E', label: 'ANS-E Emocional' },
        { key: 'ANS_F', label: 'ANS-F Fisiológica' },
      ],
    },
    {
      main: { key: 'TRA', label: 'Trast. Relacionados con Ansiedad' },
      subs: [
        { key: 'TRA_O', label: 'TRA-O Obsesivo-compulsivo' },
        { key: 'TRA_F', label: 'TRA-F Fobias' },
        { key: 'TRA_E', label: 'TRA-E Estrés Postraumático' },
      ],
    },
    {
      main: { key: 'DEP', label: 'Depresión' },
      subs: [
        { key: 'DEP_C', label: 'DEP-C Cognitiva' },
        { key: 'DEP_E', label: 'DEP-E Emocional' },
        { key: 'DEP_F', label: 'DEP-F Fisiológica' },
      ],
    },
    {
      main: { key: 'MAN', label: 'Manía' },
      subs: [
        { key: 'MAN_A', label: 'MAN-A Nivel de Actividad' },
        { key: 'MAN_G', label: 'MAN-G Grandiosidad' },
        { key: 'MAN_I', label: 'MAN-I Irritabilidad' },
      ],
    },
    {
      main: { key: 'PAR', label: 'Paranoia' },
      subs: [
        { key: 'PAR_H', label: 'PAR-H Hipervigilancia' },
        { key: 'PAR_P', label: 'PAR-P Persecución' },
        { key: 'PAR_R', label: 'PAR-R Resentimiento' },
      ],
    },
    {
      main: { key: 'ESQ', label: 'Esquizofrenia' },
      subs: [
        { key: 'ESQ_P', label: 'ESQ-P Exper. Psicóticas' },
        { key: 'ESQ_S', label: 'ESQ-S Indiferencia Social' },
        { key: 'ESQ_A', label: 'ESQ-A Alterac. Pensamiento' },
      ],
    },
    {
      main: { key: 'LIM', label: 'Rasgos Límite' },
      subs: [
        { key: 'LIM_E', label: 'LIM-E Inestab. Emocional' },
        { key: 'LIM_I', label: 'LIM-I Alteración Identidad' },
        { key: 'LIM_P', label: 'LIM-P Rel. Interp. Problem.' },
        { key: 'LIM_A', label: 'LIM-A Autoagresiones' },
      ],
    },
    {
      main: { key: 'ANT', label: 'Rasgos Antisociales' },
      subs: [
        { key: 'ANT_A', label: 'ANT-A Cond. Antisociales' },
        { key: 'ANT_E', label: 'ANT-E Egocentrismo' },
        { key: 'ANT_B', label: 'ANT-B Búsqueda Sensaciones' },
      ],
    },
    {
      main: { key: 'ALC', label: 'Problemas con Alcohol' },
      subs: [],
    },
    {
      main: { key: 'DRG', label: 'Problemas con Drogas' },
      subs: [],
    },
  ];

  groupOf(key: string): FormGroup {
    return this.group.get(key) as FormGroup;
  }
}
