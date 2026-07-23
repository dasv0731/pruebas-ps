# SPEC + Plan de implementación — Flujo de informes, interpretaciones y export TEA

**Fecha:** 2026-07-22
**Repo:** `pruebas-ps` (Angular 19 standalone + AWS Amplify Gen2, app de peritajes psicológicos forenses)
**Estado:** Diseño aprobado para implementación. No se ha tocado código.

---

## Contexto del flujo (confirmado con la usuaria)

```
Caso ──► Implicados (Subject)
            ├─ Pruebas (AssessmentSession → AssessmentScoring → AssessmentInterpretation)
            │      └─► Informe consolidado de pruebas (SubjectAssessmentReport)
            ├─ Entrevistas (Interview → InterviewAnalysis)
            │      └─► Informe consolidado de entrevistas (SubjectInterviewReport)
            └─► Informe del implicado (SubjectReport: DRAFT → REVIEWED → APPROVED)
Caso ──► Informe del caso (CaseReport) — hoy exige TODOS los SubjectReport APPROVED
```

Puntos de fricción actuales que esta spec resuelve:

1. `subject-summary` bloquea el informe del implicado si falta **cualquiera** de los dos consolidados (`canGenerateSubjectReport()`, `subject-summary.component.ts:203-205`).
2. `canGenerateCaseReport` (`subject-report.service.ts:218-226`) exige `approved === totalSubjects`: un implicado sin datos bloquea el caso entero para siempre.
3. El consolidado de pruebas solo integra pruebas con registro `AssessmentInterpretation` (`subject-summary.component.ts:72-85`), y hoy solo STAI/STAIC lo crean (vía `assessment-results.component.ts:152-203`). CUIDA/TAMAI/PAI guardan hallazgos como `AssessmentScoring` sin narrativa; CDI tiene un placeholder (`cdi-results.component.ts:222-227`). Además, el gate del botón "Generar con IA" del consolidado (`subject-summary.component.html:49`, condición `interpretations.length < totalScoredTests`) deja el consolidado permanentemente bloqueado si el implicado tiene alguna de esas 4 pruebas.
4. Los exports para TEACorrige empiezan con `<?xml version="1.0" encoding="UTF-8"?>`, pero el formato de importación de TEA exige que la **primera línea** sea `<sujetos>`. Además, el mapeo de respuestas del PAI (`(a||1)-1`) colapsa "en blanco" con una respuesta real.

---

# FASE 1 — Confirmación en informes finales

## 1.1 Informe del implicado con un solo consolidado

### Objetivo

Permitir generar el informe final del implicado con **al menos uno** de los dos consolidados (pruebas o entrevistas). Si falta uno, pedir confirmación explícita a la perito. Con ninguno, seguir bloqueando. La IA debe tratar la sección ausente con elegancia: declararla "no disponible" y no inventar contenido.

### Archivos a tocar y cambios concretos

#### a) `src/app/features/subjects/components/subject-summary/subject-summary.component.ts`

- **`canGenerateSubjectReport()` (líneas 203-205)** — cambiar AND por OR:

  ```ts
  canGenerateSubjectReport(): boolean {
    return !!this.assessmentReportContent || !!this.interviewReportContent;
  }
  ```

- **Nuevo helper** (junto al anterior) para saber qué falta:

  ```ts
  getMissingConsolidado(): 'pruebas' | 'entrevistas' | null {
    if (!this.assessmentReportContent) return 'pruebas';
    if (!this.interviewReportContent) return 'entrevistas';
    return null;
  }
  ```

- **`generateSubjectReport()` (líneas 207-234)** — tres cambios:
  1. Mensaje del guard inicial (línea 209): pasa a *"Necesita al menos un consolidado (pruebas o entrevistas) para generar el informe final."*
  2. Confirmación cuando falta uno, antes del `try` (mismo patrón `confirm()` nativo que ya usa `case-report.component.ts:146-149`):

     ```ts
     const missing = this.getMissingConsolidado();
     if (missing) {
       const ok = confirm(
         `Se generará el informe del implicado SIN el consolidado de ${missing}. ` +
         `El informe dejará constancia de que esa fuente no está disponible. ¿Continuar?`
       );
       if (!ok) return;
     }
     ```
  3. La llamada de la línea 215-218 pasa `null` en el lado ausente:

     ```ts
     const response = await this.aiService.generateSubjectReport(
       this.assessmentReportContent || null,
       this.interviewReportContent || null
     );
     ```

#### b) `src/app/core/services/ai.service.ts`

- **`generateSubjectReport()` (líneas 45-48)** — nueva firma con nulos y marcador explícito en los **datos** (defensa en profundidad: el marcador viaja en el payload y no depende de que la Lambda esté actualizada):

  ```ts
  private static readonly SECCION_NO_DISPONIBLE =
    '[SECCIÓN NO DISPONIBLE: esta fuente no fue evaluada o no se consolidó. No inventar contenido.]';

  async generateSubjectReport(
    assessmentReport: string | null,
    interviewReport: string | null
  ): Promise<AIResponse> {
    const data = JSON.stringify({
      assessmentReport: assessmentReport ?? AIService.SECCION_NO_DISPONIBLE,
      interviewReport: interviewReport ?? AIService.SECCION_NO_DISPONIBLE,
      missingSections: [
        ...(!assessmentReport ? ['pruebas'] : []),
        ...(!interviewReport ? ['entrevistas'] : []),
      ],
    });
    return this.callAI('SUBJECT_REPORT', data);
  }
  ```

  `callAI` (líneas 55-85) no cambia.

#### c) `amplify/functions/ai-generate/src/handler.ts`

- **Fallback prompt `SUBJECT_REPORT` (líneas 193-198)** — añadir al final del `system`:

  > *"Si una de las dos fuentes figura como no disponible (marcador [SECCIÓN NO DISPONIBLE] o lista missingSections), decláralo expresamente en el informe con la fórmula 'No se dispone de consolidado de pruebas/entrevistas para este implicado', NO inventes contenido para esa sección, y basa la integración clínica y las conclusiones únicamente en la fuente disponible, señalando esa limitación metodológica en las conclusiones."*

  No cambia nada más del handler: `INPUT_CHAR_LIMIT_BY_TYPE['SUBJECT_REPORT']` (línea 81) y `MAX_OUTPUT_TOKENS` (línea 86) siguen válidos.

#### d) `src/app/features/subjects/components/subject-summary/subject-summary.component.html`

- **Empty-state (líneas 147-149)**: texto pasa a *"Necesita al menos uno de los dos consolidados (pruebas o entrevistas) para generar el informe final."*
- **Nuevo aviso** (mismo bloque, clase `pending-msg` ya existente) visible cuando hay exactamente uno:

  ```html
  <div *ngIf="canGenerateSubjectReport() && getMissingConsolidado()" class="pending-msg">
    Falta el consolidado de {{ getMissingConsolidado() }}. El informe puede generarse,
    pero dejará constancia de que esa fuente no está disponible.
  </div>
  ```
- El `[disabled]` del botón (línea 141) no cambia: ya usa `canGenerateSubjectReport()`.

### Cambios de esquema Amplify

Ninguno en 1.1. El único despliegue backend es la Lambda `ai-generate` (redeploy de función, sin cambio de contrato GraphQL).

### Casos borde y guardas

| Escenario | Comportamiento |
|---|---|
| Ningún consolidado | Botón deshabilitado + empty-state. Sin cambio de fondo. |
| Solo pruebas / solo entrevistas | `confirm()` obligatorio; si cancela, no se genera. |
| Ambos consolidados | Flujo idéntico al actual, sin confirmación. |
| Front nuevo + Lambda vieja (ventana de despliegue) | El marcador `[SECCIÓN NO DISPONIBLE]` viaja en `data`, así que incluso con el prompt viejo el modelo ve el marcador; degradación aceptable. |
| Informe APPROVED | `isSubjectReportLocked()` (línea 270-272) sigue ocultando el botón; sin cambios. |
| Caso COMPLETED | `caseLocked` sigue deshabilitando (html línea 141). |
| Se genera con 1 consolidado y luego aparece el segundo | El botón "Regenerar con IA" ya existente cubre el caso; el aviso `pending-msg` desaparece solo. |

### Riesgos

- **Riesgo pericial**: un informe con una sola fuente es metodológicamente más débil. Mitigado: confirmación explícita + constancia en el texto generado + revisión humana obligatoria (flujo DRAFT→REVIEWED→APPROVED intacto).
- **Prompt injection vía consolidado**: sin cambio respecto a hoy (el contenido ya viajaba en `data`).

### Criterios de aceptación

1. Con solo consolidado de pruebas: aparece `confirm()` mencionando "entrevistas"; al aceptar se genera un informe que incluye la frase "No se dispone de consolidado de entrevistas" (o equivalente) y no contiene contenido inventado de entrevistas.
2. Simétrico con solo entrevistas.
3. Sin ninguno: botón deshabilitado, mensaje actualizado.
4. Con ambos: no aparece confirmación y el resultado es equivalente al actual.
5. `npm run build` sin errores.

---

## 1.2 Exclusión de implicados del informe del caso

### Objetivo

Que un implicado sin datos (o sin informe aprobable) pueda marcarse como **"excluido del informe del caso"** para no bloquear `canGenerateCaseReport`. El informe del caso se genera solo con los implicados con `SubjectReport` APPROVED; los excluidos se omiten y quedan documentados en la UI.

### Cambio de esquema Amplify

#### `amplify/data/resource.ts` — modelo `Subject` (líneas 115-135)

Añadir tras `notes: a.string()` (línea 128):

```ts
excludedFromCaseReport: a.boolean(),
```

**Impacto en despliegue:** cambio aditivo y opcional (no `required`). En DynamoDB no hay migración: los registros existentes devuelven `null` y **todo el código debe tratar `null`/`undefined` como `false`** (usar `!!subject.excludedFromCaseReport`). Se despliega con `npx ampx sandbox` (dev) o el pipeline de Amplify (prod); regenera `Schema` y no rompe clientes viejos (los que no envían el campo simplemente no lo tocan).

### Archivos a tocar y cambios concretos

#### a) `src/app/core/services/subject.service.ts`

- **`SubjectInput` (líneas 11-24)**: añadir `excludedFromCaseReport?: boolean;`. `update()` (líneas 57-66) ya lo soporta al ser `Partial<SubjectInput>`.

#### b) `src/app/features/subjects/services/subject-report.service.ts`

- **`canGenerateCaseReport` (líneas 218-226)** — nueva firma: recibe los subjects (el componente ya los tiene cargados; evita otro fetch) y devuelve también `excluded`:

  ```ts
  async canGenerateCaseReport(
    caseId: string,
    subjects: { id: string; excludedFromCaseReport?: boolean | null }[]
  ): Promise<{ ready: boolean; approved: number; excluded: number; missing: number }> {
    const reports = await this.getAllSubjectReports(caseId);
    const excludedIds = new Set(subjects.filter(s => !!s.excludedFromCaseReport).map(s => s.id));
    const approved = reports.filter(
      (r: any) => r.status === 'APPROVED' && !excludedIds.has(r.subjectId)
    ).length;
    const excluded = excludedIds.size;
    const total = subjects.length;
    return {
      ready: total > 0 && approved >= 1 && approved + excluded === total,
      approved,
      excluded,
      missing: total - approved - excluded,
    };
  }
  ```

  Reglas clave: **(aprobados no excluidos) + excluidos === total** y **al menos 1 aprobado no excluido** (un caso con todos los implicados excluidos no puede generar informe).

#### c) `src/app/features/cases/components/case-report/case-report.component.ts`

- **`loadData()` (líneas 44-82)**:
  - En el armado de `subjectReports` (líneas 54-63) añadir `excluded: !!subject.excludedFromCaseReport` y guardar `subject` completo.
  - Llamada de la línea 66-69: `canGenerateCaseReport(this.caseId, this.subjects)`.
- **Nuevo método `toggleExclusion(sr)`**:

  ```ts
  async toggleExclusion(sr: any) {
    if (this.isCaseReportLocked() || this.caseData?.status === 'COMPLETED') return;
    const action = sr.excluded ? 'incluir en' : 'excluir de';
    if (!confirm(`¿Desea ${action}l informe del caso a ${sr.subjectName}?` +
        (!sr.excluded && sr.status === 'APPROVED'
          ? ' Su informe aprobado se omitirá del informe del caso.' : ''))) return;
    await this.subjectService.update(sr.subjectId, {
      excludedFromCaseReport: !sr.excluded } as any);
    // Invalidar CaseReport vigente si cambia la base de la que se generó
    if (this.caseReport && ['APPROVED', 'REVIEWED', 'DRAFT'].includes(this.caseReport.status)) {
      await this.subjectReportService.updateCaseReportStatus(this.caseReport.id, 'STALE');
    }
    await this.loadData();
  }
  ```

  (Mismo patrón de invalidación STALE que `subject-summary.component.ts:256-261`.)
- **`generateCaseReport()` (líneas 84-123)**: el filtro de la línea 94-99 pasa a excluir además a los excluidos:

  ```ts
  .filter((sr) => !sr.excluded && sr.report && sr.report.status === 'APPROVED')
  ```
- **`getSubjectStatusLabel/Class` (líneas 200-218)**: añadir entrada `EXCLUIDO: 'Excluido del informe'` / `EXCLUIDO: 'badge-archived'` y en el armado de `subjectReports` usar `status: sr.excluded ? 'EXCLUIDO' : (report?.status || 'PENDIENTE')` para el badge (manteniendo el estado real del informe en otra propiedad si se quiere mostrar).

#### d) `src/app/features/cases/components/case-report/case-report.component.html`

- **Tabla de implicados (líneas 23-42)**: nueva columna "Acciones" con botón por fila:

  ```html
  <td>
    <button class="btn btn-secondary btn-sm"
            *ngIf="!isCaseReportLocked()"
            (click)="toggleExclusion(sr)">
      {{ sr.excluded ? 'Incluir en el informe' : 'Excluir del informe' }}
    </button>
  </td>
  ```
- **Barra de readiness (líneas 44-47)**: texto no listo pasa a
  *"{{ readiness.approved }} aprobados, {{ readiness.excluded }} excluidos, faltan {{ readiness.missing }} de {{ subjects.length }} implicados."*
  y el texto listo, cuando `readiness.excluded > 0`, añade *"({{ readiness.excluded }} implicado(s) excluido(s) — no aparecerán en el informe)"*.

También se necesita inyectar `SubjectService` en `case-report.component.ts` (ya está importado el servicio hermano; añadir al constructor).

### Casos borde y guardas

| Escenario | Comportamiento |
|---|---|
| Registros `Subject` antiguos (`excludedFromCaseReport === null`) | Tratados como incluidos (`!!`). |
| Excluir a un implicado con informe APPROVED | Permitido con `confirm()` reforzado; su informe se omite del CaseReport. |
| Excluir/incluir con CaseReport ya generado | CaseReport vigente → STALE (aviso "Desactualizado" ya existente en la UI, html líneas 96-99). |
| Todos excluidos | `ready === false` (regla `approved >= 1`). |
| CaseReport APPROVED o caso COMPLETED | Botón de exclusión oculto/inoperante; para tocar hay que "Reabrir caso" (flujo existente `reopenCase()`, líneas 171-194). |
| Excluido que luego aporta datos | Se incluye de nuevo con el toggle; readiness se recalcula al recargar. |

### Riesgos

- **Registro pericial**: excluir a un implicado es una decisión con peso legal. Mitigación mínima viable: la exclusión queda visible en la tabla y en la barra de readiness. Mejora opcional (fuera de alcance): campo `exclusionReason: a.string()` pedido en el mismo confirm.
- **Desfase schema/cliente**: si el front se despliega antes que el schema, `update` con el campo nuevo falla. Orden obligatorio: **schema primero** (sandbox/pipeline), front después.

### Criterios de aceptación

1. Caso con 3 implicados, 2 APPROVED + 1 sin datos: al excluir al tercero, `readiness.ready === true` y el botón "Generar con IA" se habilita.
2. El informe generado no menciona al excluido (verificar payload: solo 2 informes en `subjectReports`).
3. Al incluirlo de nuevo, `ready` vuelve a `false` (2+0 ≠ 3) y el CaseReport pasa a STALE.
4. Con los 3 excluidos, `ready === false`.
5. Subjects preexistentes al despliegue del schema funcionan sin tocar (null ⇒ incluido).
6. `npm run build` sin errores.

---

# FASE 2 — Interpretaciones de CUIDA / TAMAI / PAI / CDI hacia el consolidado

## Objetivo

Que las 6 pruebas (STAI, STAIC, CUIDA, TAMAI, PAI, CDI) persistan un `AssessmentInterpretation` (narrativa clínica) ligado al `AssessmentScoring` vigente, de modo que el bucle de `subject-summary.component.ts:72-85` las integre todas y el gate `interpretations.length < totalScoredTests` (`subject-summary.component.html:49`) deje de bloquear el consolidado.

**Decisión global (por defecto): IA.** Las 4 pruebas generan la narrativa con `AIService.generateAssessmentInterpretation(data, systemPrompt, maxTokens)` (ya existente, `ai.service.ts:23-29`; la Lambda `ai-generate` acepta `systemPrompt` custom, `handler.ts:219-221`) y la persisten con `AssessmentService.saveInterpretation(scoringId, content, aiModel)` (`assessment.service.ts:183-210`), que ya gestiona versionado: invalida `isCurrent` previos y hace `version = count + 1`. **No hay cambios de esquema en esta fase.**

Cambio transversal menor:

- **`assessment.service.ts` `saveInterpretation` (línea 183)**: añadir parámetro opcional `source: 'AI' | 'MANUAL' = 'AI'` y usarlo en la línea 201 (hoy hardcodea `'AI'`). Permite que una edición manual futura de la narrativa quede correctamente etiquetada. Los callers actuales no cambian.

El patrón de referencia es el flujo STAI/STAIC de `assessment-results.component.ts:152-203`: construir `AIInput` → `generateAssessmentInterpretation` → `saveInterpretation` → mostrar. Cada componente de resultados replica ese patrón con su propia fuente de hallazgos.

## 2.1 CUIDA

**De dónde sale la narrativa:** la Lambda `cuida-interpret` ya calcula y persiste `CuidaFindings` completos dentro de `AssessmentScoring.scores` (`amplify/functions/cuida-interpret/src/handler.ts:90-161`, persistencia en `persistFindings`, líneas 170-200): niveles cualitativos, deseabilidad, patrones de lectura conjunta, ítems críticos, estilo de crianza y warnings. **No se toca la Lambda.** La narrativa se genera en el front a partir de esos findings ya persistidos, y el `AssessmentInterpretation` se crea desde `cuida-results.component.ts`.

### Cambios

- **`src/app/features/assessments/tests/cuida/cuida.interpretation.ts`** — reescribir el placeholder actual (líneas 1-35, que aún dice "pendiente de integración con TEA Corrige"):
  - Nuevo `systemPrompt`: psicólogo forense; interpretar perfil CUIDA de capacidades parentales usando SOLO los datos; citar escalas con nivel MUY_BAJO/BAJO/ALTO/MUY_ALTO; comentar deseabilidad social y su riesgo de contaminación; incorporar patrones de lectura conjunta y estilo de crianza inferido; si `reportMode === 'NOT_INTERPRETABLE'` limitarse a documentar la invalidez del protocolo; máx. 300 palabras, párrafos narrativos; contexto pericial. `maxTokens: 600`.
  - Nueva función exportada `buildCuidaAIInputFromFindings(findings: CuidaFindings, meta: { edad?: number; sexo?: string })` que serializa: `reportMode`, `profileValidity`, escalas con nivel no-MEDIO (con sus etiquetas legibles, reutilizando los catálogos `ESCALAS_PERSONALIDAD`/`ESCALAS_CUIDADO` de `cuida-results.component.ts:59-81` — moverlos o duplicar labels aquí), `deseabilidadInterpretation`, `jointReadingFlags`, `criticalItemsToClarify` (número de ítem + escala + razón), `parentingStyleInference` y `warnings`. (La firma `buildAIInput(ScoringResult)` del placeholder no sirve: CUIDA no pasa por `testLoader.score`.)
- **`src/app/features/assessments/components/cuida-results/cuida-results.component.ts`**:
  - Quitar `readonly aiEnabled = false` (línea 57) o pasarlo a `true`.
  - Inyectar `AIService`.
  - Nuevo estado: `interpretation = ''`, `interpretationVersion = 0`, `interpretationDate = ''`, `generating = false` (mismo shape que `cdi-results.component.ts:66-68`).
  - En `loadData()` (tras línea 108, donde ya queda `this.scoring`): cargar la interpretación vigente con `assessmentService.getInterpretation(this.scoring.id)`.
  - Nuevo `generateInterpretation()`: guard `this.findings && this.scoring`; construir input con `buildCuidaAIInputFromFindings`; llamar `aiService.generateAssessmentInterpretation(JSON.stringify(input), CUIDA_INTERPRETATION.systemPrompt, CUIDA_INTERPRETATION.maxTokens)`; en éxito `assessmentService.saveInterpretation(this.scoring.id, content, model)`.
- **`cuida-results.component.html`**: nueva sección "Interpretación clínica (IA)" con botón Generar/Regenerar, spinner y texto, calcada de la sección equivalente de `assessment-results`.

**Caso borde específico:** `recalculate()` (líneas 134-145) invoca la Lambda, que **crea un `AssessmentScoring` nuevo** (`persistFindings` crea registro con `isCurrent: true`). La interpretación previa queda ligada al scoring viejo ⇒ `getInterpretation(nuevoScoring.id)` devuelve null y `subject-summary` deja de contar esa prueba hasta regenerar la narrativa. Es el comportamiento deseado (la narrativa vieja no describe la corrección nueva), pero la UI debe mostrar tras recalcular: *"La corrección cambió: vuelva a generar la interpretación."*

## 2.2 TAMAI

**De dónde sale la narrativa:** `tamai-results.component.ts` ya computa filas PD/PC con categoría por escala (`loadData()` líneas 72-119 + `categorize()` líneas 24-39) a partir del `TAMAIManualScoring` transcrito (`assessment.service.ts:245-269` `saveTAMAIScoring`). **Decisión: IA con prompt específico** (no plantilla): el catálogo de escalas TAMAI es jerárquico y la lectura cruzada (personal/escolar/social/familiar + actitudes educadoras) se beneficia de redacción integradora; la plantilla determinista queda descartada por rigidez, y el riesgo de invención se controla igual que en STAI (prompt "usa solo los datos").

### Cambios

- **`src/app/features/assessments/tests/tamai/tamai.interpretation.ts`**: conservar el `systemPrompt` (líneas 49-57, ya correcto en tono; añadirle la regla *"Las puntuaciones son percentiles (PC) baremados por TEA; >=75 alto, >=85 muy alto en inadaptación"*). Añadir función exportada `buildTamaiAIInputFromRows(rows: ScaleRow[], meta: { level: number; baremo: string; edad?: number; sexo?: string })` que serializa por escala: código, etiqueta, PD, PC y categoría, marcando las de categoría Alta/Muy alta. (El `buildAIInput(ScoringResult)` viejo, basado en sumas locales sin baremo, queda sin uso para TAMAI transcrito; no borrarlo si STAI-style scoring local lo usa — hoy no lo usa nadie porque `assessment-results` redirige TAMAI en las líneas 89-97.)
- **`src/app/features/assessments/components/tamai-results/tamai-results.component.ts`**:
  - Promover el `scoring` local de `loadData()` (línea 80) a campo `this.scoring` (necesario para `saveInterpretation`).
  - Inyectar `AIService`; añadir el mismo estado (`interpretation`, `generating`, …), carga de interpretación vigente en `loadData()`, y `generateInterpretation()` que usa `buildTamaiAIInputFromRows(this.rows, { level: this.manual.level, baremo: this.baremoLabel, ... })` y persiste con `saveInterpretation(this.scoring.id, …)`.
- **`tamai-results.component.html`**: sección "Interpretación clínica (IA)" idéntica al patrón.

**Caso borde:** re-transcripción (`saveTAMAIScoring`) crea scoring nuevo ⇒ misma semántica que CUIDA: la interpretación anterior queda huérfana y hay que regenerar. Correcto por diseño; documentar en UI.

## 2.3 PAI

**De dónde sale la narrativa:** `pai-results.component.ts:53-58` computa `PAIFindings` en cliente con `PaiInterpretService.interpret()` (`pai-interpret.service.ts:92-150`): validez del perfil, escalas por nivel T, riesgos de suicidio/agresión y `clinicalFlags`. **Decisión: IA con prompt específico**, mismo razonamiento que TAMAI. Los `clinicalFlags` deterministas van dentro del input como hallazgos ya validados.

### Cambios

- **Nuevo archivo `src/app/features/assessments/tests/pai/pai.interpretation.ts`** (hoy no existe): `PAI_INTERPRETATION` con `systemPrompt` (forense adulto; comentar primero validez del perfil — INC/INF/IMN/IMP — y si `reportMode === 'NOT_INTERPRETABLE'` limitarse a documentar la invalidez; después clínicas con T>=70, riesgos SUI/AGR de forma destacada, tratamiento e interpersonales; máx. 350 palabras; `maxTokens: 700`) y `buildPaiAIInputFromFindings(findings: PAIFindings, meta)` que serializa: `profileValidity`, escalas con `level !== 'NORMAL'` de los 5 bloques (`validezResults`, `clinicasResults`, `subescalasResults`, `tratamientoResults`, `interpersonalesResults`), `suicideRisk`, `aggressionRisk` y `clinicalFlags`.
- **`src/app/features/assessments/components/pai-results/pai-results.component.ts`**:
  - Promover `scoring` (variable local en `loadData()`, línea 49) a campo `this.scoring`.
  - Inyectar `AIService`; estado + carga de interpretación vigente + `generateInterpretation()` con persistencia vía `saveInterpretation(this.scoring.id, …)`.
- **`pai-results.component.html`**: sección de interpretación, mismo patrón.

**Caso borde:** perfil inválido (`reportMode: 'NOT_INTERPRETABLE'`, `pai-interpret.service.ts:139`) — se permite generar narrativa, pero el prompt fuerza que documente la invalidez sin interpretar escalas clínicas. Riesgo SUI alto debe aparecer siempre en la narrativa (el flag ya viene en `clinicalFlags`, línea 122).

## 2.4 CDI

**Decisión (por defecto): IA**, reemplazando el placeholder `generateInterpretation()` de `cdi-results.component.ts:222-227` con el flujo STAI/STAIC.

### Cambios

- **`src/app/features/assessments/tests/cdi/cdi.interpretation.ts`**: el `systemPrompt` (líneas 34-42) sirve casi tal cual; añadirle: *"Si se aporta puntuación baremada (PC/T), priorízala sobre la directa; comenta el ítem 9 (ideación suicida) SIEMPRE que item9Alert sea true; si reportMode es parcial o no interpretable, declara la limitación."* El `buildAIInput(ScoringResult)` actual (líneas 44-65) **no encaja** con el scoring real: el CDI se corrige en la Lambda `cdi-score` con `scoringVersion: 2` y un shape distinto (`CdiScoringData` en `cdi-results.component.ts:15-46`, con `rawScores`, `normedScores` PC/T, `totalClassification`, `itemAnalysis`, `reportMode`). Añadir función exportada `buildCdiAIInputFromScoring(cdi: CdiScoringData)` que serializa esos campos (incluyendo `item9Alert`, `cutoffExceeded` y `warnings`); mantener las `CLINICAL_RULES` existentes solo como referencia de cortes ya cubiertos por la Lambda.
- **`src/app/features/assessments/components/cdi-results/cdi-results.component.ts`**:
  - `aiEnabled` (línea 74) a `true` (o eliminar el flag).
  - Inyectar `AIService`.
  - **`generateInterpretation()` (líneas 222-227)** — reemplazo completo:

    ```ts
    async generateInterpretation() {
      if (!this.cdiData || !this.scoring) return;
      this.generating = true;
      try {
        const input = buildCdiAIInputFromScoring(this.cdiData);
        const r = await this.aiService.generateAssessmentInterpretation(
          JSON.stringify(input), CDI_INTERPRETATION.systemPrompt, CDI_INTERPRETATION.maxTokens);
        if (r.success && r.content) {
          await this.assessmentService.saveInterpretation(this.scoring.id, r.content, r.model || 'deepseek-chat');
          this.interpretation = r.content;
          this.interpretationVersion++;
          this.interpretationDate = new Date().toISOString();
        } else { this.error = r.error || 'Error al generar interpretación'; }
      } finally { this.generating = false; }
    }
    ```

    (La carga de la interpretación guardada ya existe: líneas 134-143.)
- **`cdi-results.component.html`**: habilitar el botón (hoy condicionado a `aiEnabled`).

### Impacto en `subject-summary` (todas las sub-fases)

**Cero cambios de código**: el bucle de `subject-summary.component.ts:72-85` ya recoge la interpretación vigente de cada sesión SCORED, y el gate de `subject-summary.component.html:49` empieza a comportarse como se diseñó (bloquea solo mientras falten narrativas por generar, con el contador de la línea 58-60 indicando cuántas).

### Casos borde y guardas comunes (Fase 2)

- **Versionado**: `saveInterpretation` ya invalida `isCurrent` y aumenta `version`; regenerar es idempotente.
- **Re-corrección** (CUIDA recalculate / TAMAI-PAI re-entry): scoring nuevo ⇒ interpretación huérfana ⇒ hay que regenerar. Cada results-component debe mostrar el aviso cuando `scoring` vigente no tiene interpretación pero antes existía una.
- **Fallo de IA**: mostrar `response.error`; no se persiste nada (el flujo actual STAI ya se comporta así).
- **`AssessmentInterpretation` es `allow.owner()`** (`resource.ts:228-230`): todas las generaciones ocurren en el flujo privado autenticado de la perito; ninguno de los 4 components corre en el portal público. Sin cambios de autorización.
- **No romper el flujo actual**: STAI/STAIC (`assessment-results`) no se tocan; las redirecciones de `assessment-results.component.ts:59-108` tampoco.

### Riesgos

- **Calidad/invención de la IA**: mitigado con prompts "usa solo los datos" + los hallazgos deterministas viajan como datos (patrón STAI ya en producción) + revisión humana antes de consolidar.
- **Coste/latencia**: 4 llamadas IA más por implicado como máximo; DeepSeek con `MAX_OUTPUT_TOKENS = 2000` server-side (`ai-generate/src/handler.ts:86`) acota el coste.
- **Payload > límite**: los 4 inputs son JSON compactos (< 8 000 chars, `DEFAULT_INPUT_CHAR_LIMIT`, handler.ts:83); PAI es el mayor — verificar que serializar solo escalas no-NORMAL lo mantiene bajo el límite (si no, subir `ASSESSMENT_INTERPRETATION` en `INPUT_CHAR_LIMIT_BY_TYPE`).

### Criterios de aceptación

1. Para cada prueba (CUIDA, TAMAI, PAI, CDI) con corrección vigente: el botón genera y persiste un `AssessmentInterpretation` con `isCurrent: true`, `source: 'AI'`, `version` incremental; al recargar la vista, la narrativa reaparece.
2. En `subject-summary`, un implicado con las 6 pruebas SCORED e interpretadas muestra `6 / 6` y habilita "Generar con IA" del consolidado de pruebas.
3. Tras re-corregir una prueba, esa prueba vuelve a contar como no interpretada hasta regenerar.
4. CDI con `item9Alert: true` produce narrativa que menciona ideación suicida; PAI con perfil inválido produce narrativa que se limita a documentar invalidez.
5. STAI/STAIC siguen funcionando sin cambios.
6. `npm run build` sin errores.

---

# FASE 3 — Corregir el fichero de importación TEA

## Objetivo

Que los ficheros exportados para TEACorrige cumplan el formato de importación: **primera línea `<sujetos>`** (fichero plano, sin declaración XML) y respuestas en blanco/dobles marcas codificadas como `0`.

## Archivos a tocar y cambios concretos

Los tres servicios generan hoy la misma plantilla con declaración XML:

- `src/app/features/assessments/services/cuida-xml-export.service.ts:53`
- `src/app/features/assessments/services/tamai-xml-export.service.ts:46`
- `src/app/features/assessments/services/pai-xml-export.service.ts:48`

### a) Quitar la declaración XML (los 3 servicios)

En cada `buildXml()`, el template literal pasa de:

```ts
return `<?xml version="1.0" encoding="UTF-8"?>\n<sujetos>\n  <sujeto ... />\n</sujetos>`;
```

a:

```ts
return `<sujetos>\n  <sujeto ... />\n</sujetos>`;
```

**Nada más cambia**: mismos atributos con comillas simples (`idSujeto='1' nombre='...' edad='...' sexo='...' respuestas='...'`), mismo `\n`, mismos `downloadXml()` (Blob/filename intactos; el `type: 'application/xml'` del Blob solo afecta al MIME de descarga, no al contenido — se mantiene).

### b) Verificación del mapeo de `respuestas`

**Origen de los datos:** las respuestas se guardan como array `1..N` por opción marcada y **`0` para ítems sin responder**, tanto en el flujo público (`eval-test.component.ts:349`, `answersArray.push(this.answers[i] || 0)`) como en el privado (`assessment-apply.component.ts:159`). Las "dobles marcas" no existen en la aplicación digital (la UI solo permite una opción); el `0` cubre blanco/omitido.

- **CUIDA** (`cuida-xml-export.service.ts:51`): `answers.join('')` ⇒ blancos salen como `0` y respuestas como `1..4`. **Correcto, sin cambios.**
- **TAMAI** (`tamai-xml-export.service.ts:44`): `answers.join('')` ⇒ blancos `0`, respuestas `1..2` (Sí/No). **Correcto, sin cambios.**
- **PAI** (`pai-xml-export.service.ts:46`): **DEFECTO CONFIRMADO.**

  ```ts
  const respuestas = answers.map((a) => Math.max(0, (a || 1) - 1)).join('');
  ```

  Con el desplazamiento `(a||1)-1`, un blanco (`0`) produce `(0||1)-1 = 0` y una respuesta "Falso" (`1`) produce `1-1 = 0`: **blanco y "Falso" son indistinguibles**, y si la convención TEA es `0 = blanco`, todas las respuestas "Falso" se importan como omitidas (o, leído al revés, los blancos se importan como "Falso"). Corrupción de datos en ambas lecturas.

  **Cambio especificado** — eliminar el desplazamiento y alinear PAI con CUIDA/TAMAI (`0` = blanco, `1..4` = F/LV/BV/CV):

  ```ts
  // PAI: opciones almacenadas 1-4; 0 = ítem en blanco. TEA usa 0 para blancos/dobles marcas.
  const respuestas = answers.join('');
  ```

  y eliminar/actualizar el comentario de la línea 45 ("TEA espera 0-3"), que queda invalidado.

  **Cláusula de verificación obligatoria** (ver criterios): el comentario original sugiere que alguien creyó que TEA espera `0-3` para el PAI. Antes de dar la fase por cerrada hay que validar con **una importación real en TEACorrige** de un fichero PAI con: (a) un ítem deliberadamente en blanco, (b) ítems con las 4 opciones. Si TEACorrige rechazara `1-4` y exigiera `0-3`, el fallback es mantener el desplazamiento solo para ítems respondidos y averiguar el símbolo real de blanco de TEA para el PAI — pero la hipótesis de trabajo, coherente con CUIDA/TAMAI y con la directriz "0 = blanco/doble marca", es `answers.join('')`.

## Cambios de esquema Amplify

Ninguno. Fase 100% front-end.

## Casos borde

- `answers` no parseable ⇒ `respuestas=''` (comportamiento actual, se mantiene).
- Sesión sin `subjectAgeYears`/`subjectSex` ⇒ `edad='0'`, `sexo='1'` (comportamiento actual; fuera de alcance, aunque conviene anotar como deuda: exportar sin edad real puede baremar mal en TEA).
- Nombres con apóstrofes: el atributo va entre comillas simples; un apellido tipo "O'Hara" rompería el atributo. Ya existe hoy; anotar como deuda menor (escapar `'` o usar comillas dobles), no bloquear esta fase.

## Riesgos

- Riesgo casi nulo en (a). En (b), el único riesgo es la convención PAI de TEA — cubierto por la verificación con importación real. Ficheros ya exportados con el formato viejo deben regenerarse (botón de export ya existente en `*-pending`).

## Criterios de aceptación

1. Los 3 ficheros descargados empiezan **exactamente** con `<sujetos>` en la primera línea (verificable abriendo el fichero en un editor).
2. TEACorrige importa sin error un fichero de cada prueba (verificación manual con la aplicación real de TEA).
3. En el fichero PAI, un ítem sin responder aparece como `0` y los ítems respondidos como `1..4`; TEACorrige refleja el blanco como omitido y las respuestas con su valor correcto.
4. Longitud de la cadena `respuestas` == nº total de ítems de la prueba (sin huecos por `join` de nulls).
5. `npm run build` sin errores.

---

# Orden de implementación recomendado

| # | Bloque | Motivo | Dependencias |
|---|---|---|---|
| 1 | **Fase 3** (export TEA) | Aislada, sin backend, riesgo mínimo, desbloquea el trabajo diario de corrección | Ninguna |
| 2 | **Fase 1.1** (informe implicado con 1 consolidado) | Solo front + redeploy de la Lambda `ai-generate`; quick win | Ninguna |
| 3 | **Fase 1.2** (exclusión de implicados) | Requiere despliegue de schema **antes** que el front | Schema primero |
| 4 | **Fase 2** (interpretaciones) | El bloque más grande; sin cambios de schema; las 4 pruebas son independientes entre sí y pueden implementarse/mergearse por separado. Orden interno sugerido: CDI (calca el patrón STAI existente) → PAI → TAMAI → CUIDA | Ninguna (independiente de F1/F3) |

Las fases 2 y 3 no dependen de la 1; si urge el consolidado, la Fase 2 puede adelantarse.

# Qué se verifica con `npm run build` vs. qué requiere sandbox/runtime

**`npm run build` (estático) cubre:**
- Compilación TS/Angular de todos los cambios de componentes, servicios y templates (firmas nuevas de `generateSubjectReport`, `canGenerateCaseReport`, campos promovidos `this.scoring`, nuevos helpers de interpretación).
- Errores de tipos por el campo nuevo `excludedFromCaseReport` (una vez regenerado el `Schema` tras `ampx sandbox`; hasta entonces el front debe castear o esperar al schema — otro motivo del orden schema→front).
- Los templates modificados (columna de exclusión, avisos, secciones de interpretación).

**Requiere sandbox (`npx ampx sandbox`) / runtime:**
- Despliegue y prueba del campo `excludedFromCaseReport` (crear/toggle/lectura con registros viejos null).
- Redeploy y prueba del prompt `SUBJECT_REPORT` de la Lambda `ai-generate` (necesita `DEEPSEEK_API_KEY`): verificar que con una fuente ausente el texto declara la falta y no inventa.
- Generación real de las 4 interpretaciones nuevas (calidad de narrativa, límites de payload, persistencia `AssessmentInterpretation` y su recuento en `subject-summary`).
- Ciclo completo: excluir implicado → readiness → generar CaseReport → STALE al re-incluir.
- **Fuera de todo entorno del repo:** importación manual en TEACorrige de los 3 ficheros (criterios F3.2-F3.3).
