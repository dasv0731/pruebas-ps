# Rediseño coherente del flujo de entrevistas — pruebas-ps

**Fecha:** 2026-07-24
**Ámbito:** subsistema de entrevistas (`src/app/features/interviews/*`, `subject-summary`, modelos `Interview` / `InterviewAnalysis` / `SubjectInterviewReport`).
**Objetivo:** hacer coherente el flujo de borrador → modificación → análisis → consolidado de múltiples entrevistas, sin rediseñar el modelo desde cero.

---

## 1. Motivación

El modelo de datos es sólido (entrevistas versionadas, consolidado por sujeto, estados), pero el flujo tiene tres incoherencias detectadas:

1. **Asimetría de edición.** El informe consolidado (`SubjectInterviewReport`) se edita a mano (`source: MANUAL`), pero el análisis de cada entrevista (`InterviewAnalysis`) solo se puede **regenerar con IA**; no es editable. El modelo ya define `source: AI|MANUAL` y `status: PENDING|COMPLETED|REVIEWED`, pero el flujo por entrevista no los usa.
2. **Bloqueo destructivo de la transcripción.** Al pasar a `COMPLETED`, la transcripción se congela sin vía de corrección. Un error obliga a **borrar y rehacer** la entrevista (perdiendo el análisis) — peor para la integridad que una corrección trazada.
3. **Sin propagación de obsolescencia.** El estado `STALE` solo existe en `CaseReport` (informe final). Si cambia una entrevista o su análisis tras generar el consolidado, ni el análisis ni el consolidado se marcan como desactualizados, y el informe del sujeto/caso puede apoyarse en datos viejos sin avisar.

**Principio rector:** separar **el registro** (transcripción = qué se dijo, dato) de **la interpretación** (análisis = juicio pericial, editable), y dar a los dos niveles de interpretación (por-entrevista y consolidado) el **mismo ciclo de vida**, con propagación explícita de obsolescencia hacia arriba en la cadena.

---

## 2. Estado actual (para referencia)

**Entrevista** (`interview-form`): se crea como `DRAFT` (fecha, transcripción, `extractionRequest` = "focos a resaltar"). Editable solo en `DRAFT` y si el caso no está cerrado. "Guardar y completar" → `COMPLETED` (exige transcripción; a partir de ahí la transcripción se bloquea, solo los focos siguen editables). "Generar análisis" (exige `COMPLETED`) → `InterviewAnalysis` versionado (`version`+`isCurrent`, `source: AI`), entrevista → `ANALYZED`. Regenerar crea versión nueva.

**Varias entrevistas** (`subject-summary`): el sujeto tiene N entrevistas; "Generar informe de entrevistas" consolida los análisis vigentes de las entrevistas `COMPLETED`/`ANALYZED` en un `SubjectInterviewReport` versionado, que **sí** es editable a mano.

---

## 3. Flujo objetivo

### 3.1 Ciclo de vida

| Nivel | Qué es | Estados | Edición |
|---|---|---|---|
| **Interview** (transcripción) | El registro | `DRAFT` → `COMPLETED` → `ANALYZED` | Editable en `DRAFT`. Botón **"Reabrir para corregir"** desde `COMPLETED`/`ANALYZED` la devuelve a `DRAFT` (trazado con `reopenedAt`) |
| **InterviewAnalysis** (análisis por entrevista) | Interpretación de una entrevista | `source: AI` + `status: COMPLETED` (recién generado) → `source: MANUAL` + `status: REVIEWED` (editado por la perita) | IA genera → **editable a mano** o regenerable. Versionado |
| **SubjectInterviewReport** (consolidado) | Interpretación de todas las entrevistas del sujeto | Igual (AI → MANUAL/REVIEWED) | Editable (ya lo es). Versionado |

**Corrección de simetría:** el análisis por entrevista pasa a ser **editable a mano**, exactamente igual que el consolidado.

### 3.2 Cascada de obsolescencia (nuevo)

Un cambio se propaga hacia arriba marcando `isStale = true` en lo que dependía de él:

- **Reabrir** una entrevista (o editar su transcripción tras reabrir) → su `InterviewAnalysis` vigente queda `isStale = true`.
- **Cambiar** un `InterviewAnalysis` (nueva versión IA, edición manual, o quedar obsoleto) → el `SubjectInterviewReport` vigente queda `isStale = true`.
- **Borrar** una entrevista → el `SubjectInterviewReport` vigente queda `isStale = true`.
- Un `SubjectInterviewReport` obsoleto se enlaza con el mecanismo `STALE` ya existente de `SubjectReport` / `CaseReport` (fuera del alcance de cambios de este spec, pero la señal queda disponible).

**Limpiar el flag:** regenerar con IA o guardar una edición manual del artefacto pone su `isStale = false`.

### 3.3 Regla de consolidación de múltiples entrevistas

Al generar el `SubjectInterviewReport`, se incluyen **solo** las entrevistas cuyo `InterviewAnalysis` vigente cumpla `isStale = false` (es decir, análisis al día). Las entrevistas excluidas — `DRAFT`, `COMPLETED` sin análisis, o con análisis obsoleto — se listan como aviso en la UI ("N entrevistas excluidas: …") para que la perita decida antes de consolidar.

---

## 4. Cambios técnicos

### 4.1 Modelo de datos (`amplify/data/resource.ts`)

- `InterviewAnalysis`: añadir `isStale: a.boolean().required()` (las creaciones existentes se tratan como `false`).
- `SubjectInterviewReport`: añadir `isStale: a.boolean().required()`.
- `Interview`: añadir `reopenedAt: a.datetime()` (opcional; traza la última reapertura para cadena de custodia).

> Nota de migración: al ser entorno sandbox, el redepliegue regenera las tablas. Aun así, los registros existentes sin `isStale` deben leerse como `false` en el servicio (coalescencia defensiva `?? false`) para robustez.

### 4.2 Servicio (`interview.service.ts`)

- `saveAnalysis(interviewId, content, opts: { source: 'AI'|'MANUAL', aiModel?: string })`: parametrizar la fuente; `status = source === 'AI' ? 'COMPLETED' : 'REVIEWED'`; crear versión nueva con `isStale: false`; tras crear, **marcar el `SubjectInterviewReport` del sujeto como `isStale`**.
- `reopenInterview(interviewId)`: `Interview.status = 'DRAFT'`, fijar `reopenedAt`; marcar el `InterviewAnalysis` vigente `isStale = true`; marcar el `SubjectInterviewReport` del sujeto `isStale = true`. Rechazar si el caso está cerrado.
- `markSubjectInterviewReportStale(subjectId)`: helper reutilizable (usado por `saveAnalysis`, `reopenInterview`, `delete`).
- `delete(id)`: además de borrar, marcar el consolidado del sujeto `isStale`.
- `getAnalysis` ya devuelve el vigente; exponer también su `isStale` y `source`.

### 4.3 UI

- **`interview-form`**:
  - Botón **"Reabrir para corregir"** visible cuando `status ∈ {COMPLETED, ANALYZED}` y el caso no está cerrado → llama `reopenInterview`, recarga en `DRAFT`.
  - Sección de análisis **editable**: `textarea` con el contenido del análisis vigente + botón **"Guardar cambios (revisado)"** (`saveAnalysis` con `source: 'MANUAL'`) junto al existente **"Regenerar con IA"** (`source: 'AI'`).
  - **Banner de obsoleto** en el análisis cuando el `InterviewAnalysis` vigente tiene `isStale = true` ("El análisis no corresponde a la transcripción actual — regenerar o revisar").
- **`subject-summary`**:
  - **Banner de obsoleto** en el consolidado cuando `SubjectInterviewReport.isStale = true`, con CTA de regenerar.
  - Aviso de **entrevistas excluidas** de la consolidación (draft / sin análisis / análisis obsoleto), con su fecha.

---

## 5. Casos borde

- **Caso cerrado (`COMPLETED`)**: no se permite reabrir, editar transcripción, editar/regenerar análisis ni regenerar consolidado (respeta el bloqueo existente `caseLocked`).
- **Reabrir y no reanalizar**: el análisis queda `isStale`; la consolidación lo excluye con aviso; la entrevista permanece en `DRAFT` hasta recompletarse.
- **Varios `isCurrent`** por fallo a media escritura: ya cubierto (se toma el de mayor versión); mantener esa red de seguridad.
- **Edición manual del análisis sobre uno obsoleto**: guardar la edición limpia `isStale` (la perita asume la interpretación como vigente).

---

## 6. Pruebas

- **Lógica de servicio** (donde sea aislable de la red): incremento de `version`, mapeo `source → status` (`AI→COMPLETED`, `MANUAL→REVIEWED`), y que `reopenInterview` / `saveAnalysis` / `delete` fijan los `isStale` esperados.
- **Checklist de runtime en la app** (requiere sandbox desplegado):
  1. Crear entrevista, completar, generar análisis, reabrir → transcripción editable, análisis marcado obsoleto.
  2. Editar el análisis a mano → queda `REVIEWED/MANUAL`, versión +1, consolidado marcado obsoleto.
  3. Con 2+ entrevistas, consolidar → excluye la que tiene análisis obsoleto y lo avisa.
  4. Regenerar consolidado → `isStale` limpio.

---

## 7. Fuera de alcance (YAGNI, posible futuro)

- **UI de historial de versiones** (ver/revertir versiones anteriores de análisis o consolidado). Se siguen guardando; solo no se expone navegación.
- Cambios en la cascada `SubjectReport` / `CaseReport` más allá de dejar disponible la señal de obsolescencia del consolidado.
- Correcciones con nota fechada sobre transcripción inmutable (se descartó a favor de "reabrir a borrador trazado").
