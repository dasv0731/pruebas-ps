export interface PAIScore {
  pd: number;
  t: number;
}

export interface PAITOnly {
  t: number;
}

export type PAIItemResponse = 0 | 1 | 2 | 3;

export interface PAIItem {
  itemNumber: number;
  response: PAIItemResponse;
}

export const PAI_ITEM_RESPONSE_LABELS: Record<PAIItemResponse, string> = {
  0: 'F',
  1: 'LV',
  2: 'BV',
  3: 'CV',
};

export interface PAIManualScoring {
  source: 'TEA_MANUAL_PAI';
  baremo: string;
  enteredAt: string;

  validez: {
    INC: PAIScore;
    INF: PAIScore;
    IMN: PAIScore;
    IMP: PAIScore;
  };

  clinicas: {
    SOM: PAIScore; SOM_C: PAIScore; SOM_S: PAIScore; SOM_H: PAIScore;
    ANS: PAIScore; ANS_C: PAIScore; ANS_E: PAIScore; ANS_F: PAIScore;
    TRA: PAIScore; TRA_O: PAIScore; TRA_F: PAIScore; TRA_E: PAIScore;
    DEP: PAIScore; DEP_C: PAIScore; DEP_E: PAIScore; DEP_F: PAIScore;
    MAN: PAIScore; MAN_A: PAIScore; MAN_G: PAIScore; MAN_I: PAIScore;
    PAR: PAIScore; PAR_H: PAIScore; PAR_P: PAIScore; PAR_R: PAIScore;
    ESQ: PAIScore; ESQ_P: PAIScore; ESQ_S: PAIScore; ESQ_A: PAIScore;
    LIM: PAIScore; LIM_E: PAIScore; LIM_I: PAIScore; LIM_P: PAIScore; LIM_A: PAIScore;
    ANT: PAIScore; ANT_A: PAIScore; ANT_E: PAIScore; ANT_B: PAIScore;
    ALC: PAIScore;
    DRG: PAIScore;
  };

  tratamiento: {
    AGR: PAIScore; AGR_A: PAIScore; AGR_V: PAIScore; AGR_F: PAIScore;
    SUI: PAIScore;
    EST: PAIScore;
    FAS: PAIScore;
    RTR: PAIScore;
  };

  interpersonales: {
    DOM: PAIScore;
    AFA: PAIScore;
  };

  indices: {
    INC_F: PAIScore;
    SIM: PAIScore;
    FDR: PAIScore;
    DEF: PAIScore;
    FDC: PAIScore;
    IPS: PAIScore;
    IPV: PAIScore;
    IDT: PAIScore;
    ALC_Est: PAITOnly;
    DRO_Est: PAITOnly;
  };

  itemsCriticos: PAIItem[];
  idiosincrasicos: PAIItem[];
}
