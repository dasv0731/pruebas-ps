import { Injectable } from '@angular/core';
import type { PAIManualScoring } from '../../features/assessments/components/pai-entry/pai-entry.types';

export type PAILevel = 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'NORMAL';

export interface PAIScaleResult {
  key: string;
  label: string;
  t: number;
  level: PAILevel;
}

export interface PAIFindings {
  manualScoring: PAIManualScoring;
  interpretationVersion: 1;
  profileValidity: { isValid: boolean; flags: string[] };
  reportMode: 'COMPLETE' | 'NOT_INTERPRETABLE';
  validezResults: PAIScaleResult[];
  clinicasResults: PAIScaleResult[];
  subescalasResults: PAIScaleResult[];
  tratamientoResults: PAIScaleResult[];
  interpersonalesResults: PAIScaleResult[];
  suicideRisk: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  aggressionRisk: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  clinicalFlags: string[];
  generatedAt: string;
}

const VALIDEZ_LABELS: Record<string, string> = {
  INC: 'Inconsistencia',
  INF: 'Infrecuencia',
  IMN: 'Impresión Negativa',
  IMP: 'Impresión Positiva',
};

const CLINICAS_MAIN: Record<string, string> = {
  SOM: 'Quejas Somáticas',
  ANS: 'Ansiedad',
  TRA: 'Trast. Relacionados con Ansiedad',
  DEP: 'Depresión',
  MAN: 'Manía',
  PAR: 'Paranoia',
  ESQ: 'Esquizofrenia',
  LIM: 'Rasgos Límite',
  ANT: 'Rasgos Antisociales',
  ALC: 'Prob. con el Alcohol',
  DRG: 'Prob. con las Drogas',
};

const SUBESCALAS_LABELS: Record<string, string> = {
  SOM_C: 'SOM-C Conversión', SOM_S: 'SOM-S Somatización', SOM_H: 'SOM-H Hipocondría',
  ANS_C: 'ANS-C Cognitiva', ANS_E: 'ANS-E Emocional', ANS_F: 'ANS-F Fisiológica',
  TRA_O: 'TRA-O Obsesivo-compulsivo', TRA_F: 'TRA-F Fobias', TRA_E: 'TRA-E Estrés Postraumático',
  DEP_C: 'DEP-C Cognitiva', DEP_E: 'DEP-E Emocional', DEP_F: 'DEP-F Fisiológica',
  MAN_A: 'MAN-A Nivel de Actividad', MAN_G: 'MAN-G Grandiosidad', MAN_I: 'MAN-I Irritabilidad',
  PAR_H: 'PAR-H Hipervigilancia', PAR_P: 'PAR-P Persecución', PAR_R: 'PAR-R Resentimiento',
  ESQ_P: 'ESQ-P Exper. Psicóticas', ESQ_S: 'ESQ-S Indiferencia Social', ESQ_A: 'ESQ-A Alterac. Pensamiento',
  LIM_E: 'LIM-E Inestab. Emocional', LIM_I: 'LIM-I Alteración Identidad', LIM_P: 'LIM-P Rel. Interp. Problem.', LIM_A: 'LIM-A Autoagresiones',
  ANT_A: 'ANT-A Cond. Antisociales', ANT_E: 'ANT-E Egocentrismo', ANT_B: 'ANT-B Búsqueda Sensaciones',
};

const TRATAMIENTO_LABELS: Record<string, string> = {
  AGR: 'Agresión',
  AGR_A: 'AGR-A Actitud Agresiva',
  AGR_V: 'AGR-V Agresiones Verbales',
  AGR_F: 'AGR-F Agresiones Físicas',
  SUI: 'Ideación Suicida',
  EST: 'Estrés',
  FAS: 'Falta de Apoyo Social',
  RTR: 'Rechazo al Tratamiento',
};

const INTERPERSONALES_LABELS: Record<string, string> = {
  DOM: 'Dominancia',
  AFA: 'Afabilidad',
};

function level(t: number): PAILevel {
  if (t >= 90) return 'CRITICAL';
  if (t >= 70) return 'ELEVATED';
  if (t >= 60) return 'MODERATE';
  return 'NORMAL';
}

function toResult(key: string, label: string, t: number): PAIScaleResult {
  return { key, label, t, level: level(t) };
}

@Injectable({ providedIn: 'root' })
export class PaiInterpretService {

  interpret(scoring: PAIManualScoring): PAIFindings {
    const validityFlags: string[] = [];
    let isValid = true;

    const { INC, INF, IMN, IMP } = scoring.validez;
    if (INC.t >= 73) { validityFlags.push(`INC elevada (T=${INC.t}): posibles respuestas inconsistentes.`); isValid = false; }
    if (INF.t >= 75) { validityFlags.push(`INF elevada (T=${INF.t}): posible respuesta aleatoria.`); isValid = false; }
    if (IMN.t >= 92) { validityFlags.push(`IMN muy elevada (T=${IMN.t}): posible simulación de psicopatología.`); isValid = false; }
    if (IMP.t >= 68) { validityFlags.push(`IMP elevada (T=${IMP.t}): posible negación o imagen muy favorable.`); }

    const validezResults = Object.entries(VALIDEZ_LABELS).map(([k, l]) =>
      toResult(k, l, (scoring.validez as any)[k].t));

    const c = scoring.clinicas as any;
    const clinicasResults = Object.entries(CLINICAS_MAIN).map(([k, l]) => toResult(k, l, c[k].t));
    const subescalasResults = Object.entries(SUBESCALAS_LABELS).map(([k, l]) => toResult(k, l, c[k].t));

    const tr = scoring.tratamiento as any;
    const tratamientoResults = Object.entries(TRATAMIENTO_LABELS).map(([k, l]) => toResult(k, l, tr[k].t));

    const ip = scoring.interpersonales as any;
    const interpersonalesResults = Object.entries(INTERPERSONALES_LABELS).map(([k, l]) => toResult(k, l, ip[k].t));

    const sui = tr['SUI'].t;
    const suicideRisk = sui >= 90 ? 'HIGH' : sui >= 70 ? 'MODERATE' : sui >= 60 ? 'LOW' : 'NONE';

    const agrT = tr['AGR'].t;
    const aggressionRisk = agrT >= 90 ? 'HIGH' : agrT >= 70 ? 'MODERATE' : agrT >= 60 ? 'LOW' : 'NONE';

    const clinicalFlags: string[] = [];
    if (suicideRisk === 'HIGH') clinicalFlags.push('RIESGO SUICIDA ELEVADO — requiere evaluación inmediata.');
    if (suicideRisk === 'MODERATE') clinicalFlags.push('Ideación suicida moderada — monitorizar y explorar en entrevista.');
    if (aggressionRisk === 'HIGH') clinicalFlags.push('RIESGO DE AGRESIÓN ELEVADO — explorar control de impulsos.');
    if (c['DEP'].t >= 70 && c['ANS'].t >= 70) clinicalFlags.push('Comorbilidad ansiedad-depresión significativa.');
    if (c['ESQ'].t >= 70) clinicalFlags.push('Puntuaciones en el rango esquizofrénico — evaluar síntomas psicóticos.');
    if (c['LIM'].t >= 70) clinicalFlags.push('Rasgos límite de personalidad elevados — valorar inestabilidad emocional y relacional.');
    if (c['ANT'].t >= 70) clinicalFlags.push('Rasgos antisociales elevados — considerar en contexto pericial.');
    if (c['PAR'].t >= 70) clinicalFlags.push('Paranoia elevada — desconfianza marcada hacia el entorno.');
    if (c['ALC'].t >= 70) clinicalFlags.push('Problemas con el alcohol clínicamente significativos.');
    if (c['DRG'].t >= 70) clinicalFlags.push('Problemas con las drogas clínicamente significativos.');
    if (tr['RTR'].t >= 70) clinicalFlags.push('Alto rechazo al tratamiento — posible baja adherencia terapéutica.');
    if (tr['FAS'].t >= 70) clinicalFlags.push('Escaso apoyo social percibido — factor de riesgo adicional.');

    return {
      manualScoring: scoring,
      interpretationVersion: 1,
      profileValidity: { isValid, flags: validityFlags },
      reportMode: isValid ? 'COMPLETE' : 'NOT_INTERPRETABLE',
      validezResults,
      clinicasResults,
      subescalasResults,
      tratamientoResults,
      interpersonalesResults,
      suicideRisk,
      aggressionRisk,
      clinicalFlags,
      generatedAt: new Date().toISOString(),
    };
  }
}
