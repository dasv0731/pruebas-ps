# Flujo de entrevistas coherente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer coherente el flujo de entrevistas: reabrir-para-corregir trazado, análisis por entrevista editable a mano, y cascada de obsolescencia (`isStale`) hasta el consolidado.

**Architecture:** Se extrae la lógica de decisión pura a `interview-lifecycle.ts` (unit-testable con tsx/Jasmine, como los `*.scoring.spec.ts`). Los servicios Amplify (`interview.service`, `subject-report.service`) hacen su trabajo local sobre su propio modelo; los **componentes orquestan** la cascada entre agregados (patrón ya usado en el repo). La obsolescencia se propaga por flags `isStale` en `InterviewAnalysis` y `SubjectInterviewReport`.

**Tech Stack:** Angular 19 (standalone components), AWS Amplify Gen2 Data (`generateClient<Schema>`), TypeScript. Spec de referencia: `docs/superpowers/specs/2026-07-24-interview-flow-design.md`.

## Global Constraints

- Respetar el bloqueo de caso cerrado: si `case.status === 'COMPLETED'` (`caseLocked`), NO se permite reabrir, editar transcripción/análisis ni regenerar. Copiar la lógica `caseLocked` existente.
- Estados exactos: `InterviewStatus = 'DRAFT' | 'COMPLETED' | 'ANALYZED'`; `InterpretationSource = 'AI' | 'MANUAL'`; `InterpretationStatus = 'PENDING' | 'COMPLETED' | 'REVIEWED'`.
- Registros antiguos sin `isStale` se leen como `false` (coalescencia `?? false`).
- No introducir UI de historial de versiones (fuera de alcance).
- Verificación base de cada tarea de código UI/servicio: `npx tsc -p tsconfig.app.json --noEmit` (exit 0) y, al cierre, `npx ng build --configuration development` (exit 0). El repo no tiene tests de componentes/servicios; la lógica pura sí se testea.

---

### Task 1: Lógica de ciclo de vida (módulo puro + tests)

**Files:**
- Create: `src/app/features/interviews/interview-lifecycle.ts`
- Test: `src/app/features/interviews/interview-lifecycle.spec.ts`

**Interfaces:**
- Consumes: nada (módulo puro, sin imports de Angular/Amplify).
- Produces:
  - `type AnalysisSource = 'AI' | 'MANUAL'`
  - `type InterpretationStatus = 'PENDING' | 'COMPLETED' | 'REVIEWED'`
  - `type InterviewStatus = 'DRAFT' | 'COMPLETED' | 'ANALYZED'`
  - `statusForSource(source: AnalysisSource): InterpretationStatus`
  - `canReopen(interviewStatus: InterviewStatus, caseLocked: boolean): boolean`
  - `type ExclusionReason = 'BORRADOR' | 'SIN_ANALISIS' | 'ANALISIS_OBSOLETO'`
  - `interface InterviewAnalysisPair { interviewId: string; interviewDate: string; status: InterviewStatus; analysis: { content: string; isStale: boolean } | null }`
  - `interface ConsolidationPartition { included: { interviewId: string; interviewDate: string; content: string }[]; excluded: { interviewId: string; interviewDate: string; reason: ExclusionReason }[] }`
  - `partitionForConsolidation(pairs: InterviewAnalysisPair[]): ConsolidationPartition`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/app/features/interviews/interview-lifecycle.spec.ts
import {
  statusForSource, canReopen, partitionForConsolidation, InterviewAnalysisPair,
} from './interview-lifecycle';

describe('interview-lifecycle', () => {
  it('mapea source -> status', () => {
    expect(statusForSource('AI')).toBe('COMPLETED');
    expect(statusForSource('MANUAL')).toBe('REVIEWED');
  });

  it('permite reabrir solo COMPLETED/ANALYZED y con caso abierto', () => {
    expect(canReopen('COMPLETED', false)).toBe(true);
    expect(canReopen('ANALYZED', false)).toBe(true);
    expect(canReopen('DRAFT', false)).toBe(false);
    expect(canReopen('ANALYZED', true)).toBe(false); // caso cerrado
  });

  it('particiona entrevistas para consolidar', () => {
    const pairs: InterviewAnalysisPair[] = [
      { interviewId: 'a', interviewDate: '2026-01-01', status: 'ANALYZED', analysis: { content: 'X', isStale: false } },
      { interviewId: 'b', interviewDate: '2026-01-02', status: 'ANALYZED', analysis: { content: 'Y', isStale: true } },
      { interviewId: 'c', interviewDate: '2026-01-03', status: 'COMPLETED', analysis: null },
      { interviewId: 'd', interviewDate: '2026-01-04', status: 'DRAFT', analysis: null },
    ];
    const p = partitionForConsolidation(pairs);
    expect(p.included).toEqual([{ interviewId: 'a', interviewDate: '2026-01-01', content: 'X' }]);
    expect(p.excluded).toEqual([
      { interviewId: 'b', interviewDate: '2026-01-02', reason: 'ANALISIS_OBSOLETO' },
      { interviewId: 'c', interviewDate: '2026-01-03', reason: 'SIN_ANALISIS' },
      { interviewId: 'd', interviewDate: '2026-01-04', reason: 'BORRADOR' },
    ]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run (rápido, sin navegador): crear `scratch/lc.ts` que importe el módulo aún inexistente y ejecutar `npx tsx scratch/lc.ts`.
Expected: FAIL con "Cannot find module './interview-lifecycle'".

- [ ] **Step 3: Implementación mínima**

```ts
// src/app/features/interviews/interview-lifecycle.ts
export type AnalysisSource = 'AI' | 'MANUAL';
export type InterpretationStatus = 'PENDING' | 'COMPLETED' | 'REVIEWED';
export type InterviewStatus = 'DRAFT' | 'COMPLETED' | 'ANALYZED';

export function statusForSource(source: AnalysisSource): InterpretationStatus {
  return source === 'AI' ? 'COMPLETED' : 'REVIEWED';
}

export function canReopen(interviewStatus: InterviewStatus, caseLocked: boolean): boolean {
  if (caseLocked) return false;
  return interviewStatus === 'COMPLETED' || interviewStatus === 'ANALYZED';
}

export type ExclusionReason = 'BORRADOR' | 'SIN_ANALISIS' | 'ANALISIS_OBSOLETO';

export interface InterviewAnalysisPair {
  interviewId: string;
  interviewDate: string;
  status: InterviewStatus;
  analysis: { content: string; isStale: boolean } | null;
}

export interface ConsolidationPartition {
  included: { interviewId: string; interviewDate: string; content: string }[];
  excluded: { interviewId: string; interviewDate: string; reason: ExclusionReason }[];
}

export function partitionForConsolidation(pairs: InterviewAnalysisPair[]): ConsolidationPartition {
  const included: ConsolidationPartition['included'] = [];
  const excluded: ConsolidationPartition['excluded'] = [];
  for (const p of pairs) {
    const base = { interviewId: p.interviewId, interviewDate: p.interviewDate };
    if (p.status === 'DRAFT') { excluded.push({ ...base, reason: 'BORRADOR' }); continue; }
    if (!p.analysis) { excluded.push({ ...base, reason: 'SIN_ANALISIS' }); continue; }
    if (p.analysis.isStale) { excluded.push({ ...base, reason: 'ANALISIS_OBSOLETO' }); continue; }
    included.push({ ...base, content: p.analysis.content });
  }
  return { included, excluded };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/interview-lifecycle.spec.ts'`
Expected: PASS (3 specs). Si ChromeHeadless no está configurado, verificar la lógica con un smoke `npx tsx scratch/lc.ts` que ejecute los 3 casos y `console.log('OK')`; luego borrar `scratch/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/interviews/interview-lifecycle.ts src/app/features/interviews/interview-lifecycle.spec.ts
git commit -m "feat(interviews): lógica pura de ciclo de vida (source→status, canReopen, partición de consolidación)"
```

---

### Task 2: Campos de datos (`isStale`, `reopenedAt`)

**Files:**
- Modify: `amplify/data/resource.ts` (modelos `Interview`, `InterviewAnalysis`, `SubjectInterviewReport`)

**Interfaces:**
- Consumes: nada.
- Produces: en el tipo `Schema` generado, `InterviewAnalysis.isStale: boolean`, `SubjectInterviewReport.isStale: boolean`, `Interview.reopenedAt: string | null`.

- [ ] **Step 1: Añadir `reopenedAt` a `Interview`**

En el bloque `Interview: a.model({ ... })`, tras `extractionRequest: a.string(),`:

```ts
      reopenedAt: a.datetime(),
```

- [ ] **Step 2: Añadir `isStale` a `InterviewAnalysis`**

En `InterviewAnalysis: a.model({ ... })`, tras `isCurrent: a.boolean().required(),`:

```ts
      isStale: a.boolean().required(),
```

- [ ] **Step 3: Añadir `isStale` a `SubjectInterviewReport`**

En `SubjectInterviewReport: a.model({ ... })`, tras `isCurrent: a.boolean().required(),`:

```ts
      isStale: a.boolean().required(),
```

- [ ] **Step 4: Verificar compilación del backend**

Run: `npx tsc -p amplify/tsconfig.json --noEmit 2>/dev/null || npx tsc --noEmit amplify/data/resource.ts --skipLibCheck`
Expected: sin errores en `resource.ts` (los avisos de módulos de amplify pueden ignorarse).

- [ ] **Step 5: Commit**

```bash
git add amplify/data/resource.ts
git commit -m "feat(data): campos isStale (InterviewAnalysis, SubjectInterviewReport) y reopenedAt (Interview)"
```

---

### Task 3: Servicio de entrevistas — `saveAnalysis(source)`, `reopenInterview`

**Files:**
- Modify: `src/app/features/interviews/services/interview.service.ts`

**Interfaces:**
- Consumes: `statusForSource` de `interview-lifecycle`.
- Produces:
  - `saveAnalysis(interviewId: string, content: string, opts: { source: 'AI' | 'MANUAL'; aiModel?: string }): Promise<...>`
  - `reopenInterview(interviewId: string): Promise<{ subjectId: string }>` (devuelve el `subjectId` para que el componente propague la cascada)

- [ ] **Step 1: Importar la lógica pura**

En la cabecera de `interview.service.ts`, tras los imports existentes:

```ts
import { statusForSource } from '../interview-lifecycle';
```

- [ ] **Step 2: Reemplazar `saveAnalysis` para parametrizar la fuente**

Sustituir el método `saveAnalysis` actual por:

```ts
  async saveAnalysis(
    interviewId: string,
    content: string,
    opts: { source: 'AI' | 'MANUAL'; aiModel?: string },
  ) {
    const existing = await client.models.InterviewAnalysis.list({
      filter: { interviewId: { eq: interviewId } },
    });
    if (existing.data) {
      for (const item of existing.data) {
        await client.models.InterviewAnalysis.update({ id: item.id, isCurrent: false });
      }
    }

    const version = (existing.data?.length || 0) + 1;

    const { data, errors } = await client.models.InterviewAnalysis.create({
      interviewId,
      content,
      source: opts.source,
      status: statusForSource(opts.source),
      version,
      isCurrent: true,
      isStale: false,
      aiModel: opts.aiModel ?? null,
      generatedAt: new Date().toISOString(),
    });
    if (errors) throw new Error(errors.map((e) => e.message).join(', '));
    return data;
  }
```

- [ ] **Step 3: Añadir `reopenInterview`**

Tras `saveAnalysis`, dentro de la clase:

```ts
  /**
   * Reabre una entrevista COMPLETED/ANALYZED a DRAFT para corregir la
   * transcripción (traza `reopenedAt`) y marca su análisis vigente como obsoleto.
   * Devuelve el subjectId para que el componente marque el consolidado obsoleto.
   */
  async reopenInterview(interviewId: string): Promise<{ subjectId: string }> {
    const interview = await this.getById(interviewId);
    if (!interview) throw new Error('Entrevista no encontrada');

    await this.update(interviewId, { status: 'DRAFT' });
    await client.models.Interview.update({ id: interviewId, reopenedAt: new Date().toISOString() });

    const current = await this.getAnalysis(interviewId);
    if (current) {
      await client.models.InterviewAnalysis.update({ id: current.id, isStale: true });
    }
    return { subjectId: interview.subjectId };
  }
```

> Nota: `update()` acepta `Partial<InterviewInput>`, que no incluye `reopenedAt`; por eso `reopenedAt` se fija con una llamada directa a `client.models.Interview.update`.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: exit 0. (Fallará en Task 4 hasta actualizar el llamador de `saveAnalysis`; si se ejecuta aislado, actualizar temporalmente el llamador o continuar a Task 4 antes de compilar.)

- [ ] **Step 5: Commit**

```bash
git add src/app/features/interviews/services/interview.service.ts
git commit -m "feat(interviews): saveAnalysis con source y reopenInterview con traza + análisis obsoleto"
```

---

### Task 4: Servicio de informes — stale del consolidado

**Files:**
- Modify: `src/app/features/subjects/services/subject-report.service.ts`

**Interfaces:**
- Produces:
  - `markInterviewReportStale(subjectId: string): Promise<void>` (pone `isStale: true` en el `SubjectInterviewReport` vigente si existe)
  - `saveInterviewReport(...)`: ahora crea con `isStale: false`

- [ ] **Step 1: `saveInterviewReport` crea con `isStale: false`**

En el objeto pasado a `SubjectInterviewReport.create({ ... })` dentro de `saveInterviewReport`, añadir el campo:

```ts
      isStale: false,
```

- [ ] **Step 2: Añadir `markInterviewReportStale`**

Tras `saveInterviewReport`, en la clase:

```ts
  async markInterviewReportStale(subjectId: string): Promise<void> {
    const list = await (client.models as any).SubjectInterviewReport.list({
      filter: { subjectId: { eq: subjectId }, isCurrent: { eq: true } },
    });
    for (const item of list.data ?? []) {
      if (item.isStale !== true) {
        await (client.models as any).SubjectInterviewReport.update({ id: item.id, isStale: true });
      }
    }
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: exit 0 (o pendiente de Task 5 si algún componente aún no compila).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/subjects/services/subject-report.service.ts
git commit -m "feat(subjects): markInterviewReportStale y consolidado con isStale=false al guardar"
```

---

### Task 5: UI `interview-form` — reabrir + análisis editable + banner

**Files:**
- Modify: `src/app/features/interviews/components/interview-form/interview-form.component.ts`
- Modify: `src/app/features/interviews/components/interview-form/interview-form.component.html`

**Interfaces:**
- Consumes: `interviewService.reopenInterview`, `interviewService.saveAnalysis(…, {source})`, `subjectReportService.markInterviewReportStale`, `canReopen` de `interview-lifecycle`, y el `isStale`/`source` del análisis vigente.

- [ ] **Step 1: Inyectar el servicio de informes e importar `canReopen`**

Cabecera del `.ts`:

```ts
import { SubjectReportService } from '../../../subjects/services/subject-report.service';
import { canReopen } from '../../interview-lifecycle';
```

En el constructor, añadir el parámetro:

```ts
    private subjectReportService: SubjectReportService,
```

Añadir propiedades de estado tras `analysisWarning = '';`:

```ts
  analysisIsStale = false;
  reopening = false;
  savingAnalysis = false;
```

- [ ] **Step 2: Cargar `isStale` del análisis y exponer `canReopen`**

En `loadInterview`, donde se asigna el análisis guardado, añadir:

```ts
          this.analysisIsStale = (saved as any).isStale ?? false;
```

Añadir método público (junto a `canGenerateAnalysis`):

```ts
  canReopenInterview(): boolean {
    return canReopen(this.form.status, this.caseLocked);
  }
```

- [ ] **Step 3: Actualizar el llamador de `saveAnalysis` en `generateAnalysis`**

Reemplazar la llamada `await this.interviewService.saveAnalysis(this.interviewId, response.content, response.model || 'deepseek-chat');` por:

```ts
        await this.interviewService.saveAnalysis(this.interviewId, response.content, {
          source: 'AI',
          aiModel: response.model || 'deepseek-chat',
        });
        this.analysisIsStale = false;
        await this.subjectReportService.markInterviewReportStale(this.subjectId);
```

- [ ] **Step 4: Añadir `reopenInterview` y `saveAnalysisEdit`**

Métodos nuevos en la clase:

```ts
  async reopenInterview() {
    if (!this.canReopenInterview() || !this.interviewId) return;
    try {
      this.reopening = true;
      this.error = '';
      const { subjectId } = await this.interviewService.reopenInterview(this.interviewId);
      await this.subjectReportService.markInterviewReportStale(subjectId);
      this.form.status = 'DRAFT';
      this.analysisIsStale = true;
    } catch (err: any) {
      this.error = err.message || 'Error al reabrir la entrevista';
    } finally {
      this.reopening = false;
    }
  }

  async saveAnalysisEdit() {
    if (!this.interviewId || this.caseLocked || !this.analysis.trim()) return;
    try {
      this.savingAnalysis = true;
      this.error = '';
      await this.interviewService.saveAnalysis(this.interviewId, this.analysis, { source: 'MANUAL' });
      this.analysisVersion++;
      this.analysisDate = new Date().toISOString();
      this.analysisIsStale = false;
      await this.subjectReportService.markInterviewReportStale(this.subjectId);
    } catch (err: any) {
      this.error = err.message || 'Error al guardar el análisis';
    } finally {
      this.savingAnalysis = false;
    }
  }
```

- [ ] **Step 5: UI — botón reabrir, editor de análisis y banner**

En el `.html`, junto a los controles de estado de la entrevista, añadir el botón de reabrir:

```html
<button *ngIf="canReopenInterview()" type="button" class="btn btn-secondary"
        (click)="reopenInterview()" [disabled]="reopening">
  {{ reopening ? 'Reabriendo...' : 'Reabrir para corregir' }}
</button>
```

En la sección del análisis, añadir el banner de obsoleto y el editor manual (junto al botón de regenerar existente):

```html
<div *ngIf="analysisIsStale && analysis" class="alert-warning">
  ⚠ El análisis no corresponde a la transcripción actual. Regenérelo o revíselo.
</div>
<ng-container *ngIf="analysis && !caseLocked">
  <textarea [(ngModel)]="analysis" name="analysisEdit" rows="12" class="form-control"></textarea>
  <button type="button" class="btn btn-primary" (click)="saveAnalysisEdit()" [disabled]="savingAnalysis">
    {{ savingAnalysis ? 'Guardando...' : 'Guardar cambios (revisado)' }}
  </button>
</ng-container>
```

> Requiere que `FormsModule` esté en `imports` del componente (ya lo está).

- [ ] **Step 6: Verificar build**

Run: `npx ng build --configuration development`
Expected: "Application bundle generation complete", exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/interviews/components/interview-form/interview-form.component.ts src/app/features/interviews/components/interview-form/interview-form.component.html
git commit -m "feat(interviews): reabrir para corregir, editor manual del análisis y banner de obsoleto"
```

---

### Task 6: UI consolidado (`subject-summary`) + borrado (`interview-list`)

**Files:**
- Modify: `src/app/features/subjects/components/subject-summary/subject-summary.component.ts`
- Modify: `src/app/features/subjects/components/subject-summary/subject-summary.component.html`
- Modify: `src/app/features/interviews/components/interview-list/interview-list.component.ts`

**Interfaces:**
- Consumes: `partitionForConsolidation` de `interview-lifecycle`, `interviewReport.isStale`, `subjectReportService.markInterviewReportStale`.

- [ ] **Step 1: Usar la partición en `subject-summary`**

Importar en el `.ts`:

```ts
import { partitionForConsolidation, InterviewAnalysisPair } from '../../../interviews/interview-lifecycle';
```

Añadir propiedades tras `interviewReportContent = '';`:

```ts
  interviewReportStale = false;
  excludedInterviews: { interviewDate: string; reason: string }[] = [];
```

Donde hoy se recorren las entrevistas para construir `this.analyses` (bucle `for (const interview of interviews)`), construir en su lugar los pares y particionar:

```ts
      const pairs: InterviewAnalysisPair[] = [];
      for (const interview of interviews) {
        const analysis = (interview.status === 'COMPLETED' || interview.status === 'ANALYZED')
          ? await this.interviewService.getAnalysis(interview.id)
          : null;
        pairs.push({
          interviewId: interview.id,
          interviewDate: interview.interviewDate,
          status: interview.status,
          analysis: analysis ? { content: analysis.content, isStale: (analysis as any).isStale ?? false } : null,
        });
      }
      const partition = partitionForConsolidation(pairs);
      this.analyses = partition.included.map((i) => ({ date: i.interviewDate, content: i.content }));
      this.excludedInterviews = partition.excluded.map((e) => ({
        interviewDate: e.interviewDate,
        reason: e.reason === 'BORRADOR' ? 'en borrador'
          : e.reason === 'SIN_ANALISIS' ? 'sin análisis'
          : 'análisis obsoleto',
      }));
```

Tras cargar `this.interviewReport`, exponer el flag:

```ts
      this.interviewReportStale = (this.interviewReport as any)?.isStale ?? false;
```

En `generateInterviewReport` (éxito) y en `saveInterviewEdit`, tras guardar, poner `this.interviewReportStale = false;`.

- [ ] **Step 2: UI del consolidado**

En el `.html`, en la tarjeta del informe de entrevistas, añadir banner y excluidas:

```html
<div *ngIf="interviewReportStale" class="alert-warning">
  ⚠ El consolidado está desactualizado (cambió alguna entrevista). Regenérelo.
</div>
<div *ngIf="excludedInterviews.length > 0" class="notice">
  {{ excludedInterviews.length }} entrevista(s) excluida(s):
  <span *ngFor="let e of excludedInterviews">{{ e.interviewDate }} ({{ e.reason }}) </span>
</div>
```

- [ ] **Step 3: Borrado marca el consolidado obsoleto (`interview-list`)**

En `interview-list.component.ts`, inyectar `SubjectReportService` (import + constructor) y en `onDelete`, tras `await this.interviewService.delete(interviewId);`, añadir:

```ts
      await this.subjectReportService.markInterviewReportStale(this.subjectId);
```

Import y constructor:

```ts
import { SubjectReportService } from '../../../subjects/services/subject-report.service';
// ...
    private subjectReportService: SubjectReportService,
```

- [ ] **Step 4: Verificar build**

Run: `npx ng build --configuration development`
Expected: "Application bundle generation complete", exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/subjects/components/subject-summary/ src/app/features/interviews/components/interview-list/interview-list.component.ts
git commit -m "feat(interviews): consolidación filtra análisis obsoletos, banner de obsoleto y stale al borrar"
```

---

### Task 7: Verificación de runtime (checklist manual)

**Files:** ninguno (requiere sandbox desplegado: `npx ampx sandbox`).

- [ ] Crear entrevista → completar → generar análisis → **Reabrir para corregir**: la transcripción vuelve a ser editable y el análisis muestra banner de obsoleto.
- [ ] Editar el análisis a mano y "Guardar cambios (revisado)": queda como versión nueva; el consolidado del sujeto se marca obsoleto (banner en `subject-summary`).
- [ ] Con 2+ entrevistas (una con análisis obsoleto), "Generar informe de entrevistas": la obsoleta se excluye y aparece en el aviso de excluidas.
- [ ] Regenerar el consolidado: desaparece el banner de obsoleto.
- [ ] Con el caso cerrado (`COMPLETED`): no aparecen los botones de reabrir/editar/regenerar.

---

## Self-Review

- **Cobertura del spec:** §3.1 ciclo de vida → Tasks 3,5; §3.2 cascada obsolescencia → Tasks 3,4,5,6; §3.3 regla de consolidación → Tasks 1,6; §4.1 modelo → Task 2; §4.2 servicio → Tasks 3,4; §4.3 UI → Tasks 5,6; §6 pruebas → Task 1 (unit) + Task 7 (runtime). Sin huecos.
- **Placeholders:** ninguno; todo el código está explícito.
- **Consistencia de tipos:** `saveAnalysis(id, content, {source, aiModel?})` usado igual en Tasks 3 y 5; `markInterviewReportStale(subjectId)` definido en Task 4 y consumido en Tasks 5,6; `partitionForConsolidation` firma idéntica en Tasks 1 y 6; `reopenInterview` devuelve `{subjectId}` (Task 3) y así se consume (Task 5).
