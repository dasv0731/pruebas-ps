# PAI Entry — Rediseño completo del formulario de transcripción

**Fecha:** 2026-04-24
**Componente afectado:** `src/app/features/assessments/components/pai-entry/`
**Tipo de cambio:** Rediseño completo (no migración) — el shape de datos guardado cambia y los registros con el formato anterior dejarán de leerse.

## Contexto

`PaiEntryComponent` permite al perito transcribir manualmente las puntuaciones devueltas por el informe de TEACorrige para el PAI (Inventario de Evaluación de la Personalidad). La versión actual solo captura puntuaciones T y usa una nomenclatura de subescalas que no coincide con la oficial del PAI.

El rediseño actualiza el componente para capturar el informe completo:

- Tanto puntuación directa (PD) como puntuación T por (sub)escala.
- Nomenclatura oficial corregida (INC/INF/IMN/IMP, ANS-E, DEP-E, ESQ-A, LIM-E/I/P/A, ANT-A/E/B, FAS, RTR, etc.).
- Sin subescalas para ALC y DRG.
- Diez índices complementarios nuevos (ocho con PD+T, dos solo T).
- Dos listas separadas para ítems críticos y respuestas idiosincrásicas, con código F/LV/BV/CV.

## Alcance

**En alcance:**
- Rediseño del componente `pai-entry` (template, lógica, tipos).
- Descomposición en sub-componentes presentacionales por sección.
- Wiring de la llamada a `paiInterpretService.interpret()` después del guardado, idéntico al patrón de cuida-entry.

**Fuera de alcance:**
- Implementación de las reglas de interpretación en el Lambda (`pai-interpret`); el usuario las pasará después.
- Actualización de `pai-results.component.*`.
- Actualización de `pai-xml-export.service.ts` (se evaluará por separado si es necesario).
- Migración de datos PAI guardados con el formato anterior.

## Decisiones de diseño

| # | Decisión | Razón |
|---|---|---|
| 1 | Rediseño completo, sin migración del shape anterior | Acordado con el usuario; no hay datos en producción que justifiquen el costo de mapeo. |
| 2 | PD y T son ambos `Validators.required`, sin rangos numéricos | Rangos válidos varían por escala/baremo y complican el form sin aportar valor; el perito transcribe del informe. |
| 3 | Respuestas a ítems críticos: storage numérico 0–3, UI con select F/LV/BV/CV | Mantiene consistencia con cuida (storage numérico) y refleja la notación del informe TEA en pantalla. |
| 4 | Dos `FormArray` separados (`itemsCriticos`, `idiosincrasicos`) | Refleja 1:1 las dos secciones distintas del informe TEA. |
| 5 | Después de guardar: llamar `paiInterpretService.interpret()`, error no bloquea navegación | Mismo patrón que cuida; el resultado se renderiza luego en `pai-results`. |
| 6 | Estructura: orquestador + sub-componentes presentacionales por sección | Mantiene UX monolítica de cuida pero evita un componente de 600+ líneas. |

## Arquitectura de archivos

```
src/app/features/assessments/components/pai-entry/
├── pai-entry.component.ts           Orquestador: ruta, carga, FormGroup raíz, save
├── pai-entry.component.html         Index — encabezado + <pai-section-*> + confirmación
├── pai-entry.component.scss         Layout general (cards apiladas)
├── pai-entry.types.ts               PAIManualScoring + tipos auxiliares
└── sections/
    ├── pai-section-validez.component.{ts,html}
    ├── pai-section-clinicas.component.{ts,html}
    ├── pai-section-tratamiento.component.{ts,html}
    ├── pai-section-interpersonales.component.{ts,html}
    ├── pai-section-indices.component.{ts,html}
    ├── pai-items-list.component.{ts,html}    Reutilizable: lista con +Agregar/Eliminar
    └── pai-scale-input.component.{ts,html}   Reutilizable: par PD+T (o solo T) inline
```

### Contratos de los sub-componentes

**`<pai-scale-input>`** — atómico, renderiza una (sub)escala.
- `@Input() group: FormGroup` — sub-grupo con controles `pd` y `t` (solo `t` si `onlyT`).
- `@Input() abbr: string` — sigla mostrada (p. ej. "SOM-C").
- `@Input() label: string` — nombre legible (p. ej. "Conversión").
- `@Input() onlyT: boolean = false` — oculta el input PD.
- `@Input() variant: 'main' | 'sub' = 'main'` — controla el estilo visual (sub indenta y atenúa).
- Calcula `isInvalid('pd' | 't')` desde el grupo recibido.

**`<pai-items-list>`** — gestiona un FormArray de ítems con código de respuesta.
- `@Input() arr: FormArray` — el FormArray a editar.
- `@Input() title: string` — título mostrado en el header de la card.
- `@Input() emptyText: string` — placeholder cuando la lista está vacía.
- `@Input() maxItem: number = 344` — máximo del campo `itemNumber`.
- Maneja sus propios `addItem()`/`removeItem(i)`.
- Renderiza un `<select>` con opciones `F=0`, `LV=1`, `BV=2`, `CV=3`.

**`<pai-section-*>`** — composiciones presentacionales.
- Cada uno recibe `@Input() group: FormGroup` (su sub-grupo del form raíz) y compone varios `<pai-scale-input>` con el orden y agrupación correspondientes a su sección.

El componente raíz **construye todo el FormGroup** con `FormBuilder` y solo pasa sub-grupos hacia abajo. Toda la lógica de carga, edición, save y navegación queda en el orquestador.

## Modelo de datos

```typescript
// pai-entry.types.ts

export interface PAIScore { pd: number; t: number; }
export interface PAITOnly { t: number; }

export type PAIItemResponse = 0 | 1 | 2 | 3;  // F=0, LV=1, BV=2, CV=3
export interface PAIItem { itemNumber: number; response: PAIItemResponse; }

export interface PAIManualScoring {
  source: 'TEA_MANUAL_PAI';
  baremo: string;
  enteredAt: string;

  validez: {
    INC: PAIScore; INF: PAIScore; IMN: PAIScore; IMP: PAIScore;
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
    ALC: PAIScore;   // sin subescalas
    DRG: PAIScore;   // sin subescalas
  };

  tratamiento: {
    AGR: PAIScore; AGR_A: PAIScore; AGR_V: PAIScore; AGR_F: PAIScore;
    SUI: PAIScore; EST: PAIScore; FAS: PAIScore; RTR: PAIScore;
  };

  interpersonales: {
    DOM: PAIScore; AFA: PAIScore;
  };

  indices: {
    INC_F: PAIScore; SIM: PAIScore; FDR: PAIScore; DEF: PAIScore;
    FDC: PAIScore; IPS: PAIScore; IPV: PAIScore; IDT: PAIScore;
    ALC_Est: PAITOnly;   // solo T
    DRO_Est: PAITOnly;   // solo T
  };

  itemsCriticos: PAIItem[];
  idiosincrasicos: PAIItem[];
}
```

**Notas:**
- El campo `source` cambia a `'TEA_MANUAL_PAI'` (ya está así en el código actual; lo mantenemos).
- Toda escala/subescala usa `{ pd, t }` salvo `ALC_Est` y `DRO_Est` que usan `{ t }`.
- La forma se serializa como JSON dentro del campo `scores` del registro `Scoring` (entidad existente). El nivel exterior conserva `source: 'TEA'` a nivel de entidad; el shape interno cambia.

## UI / UX

Layout idéntico al patrón actual (cuida-entry / tamai-entry): página única con scroll vertical y una `<div class="card">` por bloque temático.

**Encabezado de página:**
- Botón "← Volver" + título dinámico ("Transcribir puntuaciones PAI" o "Editar puntuaciones PAI").
- Resumen del evaluado: nombre completo, edad en años, sexo.
- Hint: "Ingrese las puntuaciones PD y T tal como las reporta TEACorrige."

**Card "Baremo":** input de texto libre, valor por defecto `'Población general adulta española'`.

**Cards de escalas** (validez, clínicas, tratamiento, interpersonales, índices):

Cada (sub)escala se renderiza como una fila de `<pai-scale-input>`:

```
SOM   Quejas Somáticas              [PD: ___]  [T: ___]
  └─ SOM-C  Conversión              [PD: ___]  [T: ___]
  └─ SOM-S  Somatización            [PD: ___]  [T: ___]
  └─ SOM-H  Hipocondría             [PD: ___]  [T: ___]
```

- Sigla en negrita y color azul para escala principal; subescalas indentadas y atenuadas.
- Inputs `type="number"` de ~80px, etiqueta "PD" / "T" adyacente.
- Borde rojo cuando inválido y tocado.

**Card "Índices Complementarios":** grid de 2 columnas con las 10 entradas. ALC-Est y DRO-Est solo muestran el input T.

**Card "Ítems críticos":** vía `<pai-items-list>`, con header que incluye "+ Agregar ítem", placeholder "Sin ítems críticos registrados." cuando vacía, y filas con número de ítem + select F/LV/BV/CV + botón Eliminar.

**Card "Respuestas idiosincrásicas":** idéntica estructura, FormArray distinto.

**Footer:**
- Botón "Volver" + botón "Revisar y guardar".
- Modal de confirmación con resumen y botones "Cancelar" / "Confirmar y guardar".

**Estados:**
- `loading=true` → "Cargando...".
- `error` y no en confirmación → banner rojo arriba.
- `saving=true` → texto del botón muestra fase: "Guardando transcripción..." → "Calculando interpretación...".

## Validación, carga y guardado

### Validación

- Cada control `pd` y `t`: `Validators.required`, sin rangos.
- `baremo`: `Validators.required`.
- Cada ítem en los FormArrays: `itemNumber` requerido, entero entre 1 y 344; `response` requerido entre 0 y 3.
- Trigger: `requestConfirm()` chequea `form.invalid`, marca todo como `touched`, muestra "Complete todos los campos requeridos antes de continuar." y no avanza al modal.
- Cada `<pai-scale-input>` calcula su propio `isInvalid('pd' | 't')` desde el grupo recibido (no atraviesa paths string desde el raíz).

### Carga (`loadData`)

1. Cargar `session` desde `assessmentService.getSession(sessionId)` y `subject` desde `subjectService.getById(session.subjectId)`.
2. Llamar `assessmentService.getScoring(sessionId)`.
3. Si existe y `source === 'TEA'`, parsear el JSON de `scores`:
   - Si el shape interno es `{ source: 'TEA_MANUAL_PAI' }`, llamar `prefillForm()` y activar `isEditMode = true`.
   - Si es del formato anterior u otro shape no parseable, **iniciar formulario en blanco silenciosamente** (no error visible).
4. Si no hay scoring, formulario vacío.

### Guardado (`save`)

1. Validar form. Si inválido: marcar `touched`, mostrar error, abortar.
2. Construir `PAIManualScoring` desde `form.value`, con `enteredAt = new Date().toISOString()`.
3. **Fase 1 — `savingPhase = 'Guardando transcripción...'`**: `await assessmentService.savePAIScoring(sessionId, scoring)`. Si falla: `error = err.message`, `showConfirm = false`, `saving = false`. La transcripción no se guardó; el usuario puede reintentar.
4. **Fase 2 — `savingPhase = 'Calculando interpretación...'`**: `await paiInterpretService.interpret(sessionId)` envuelto en `try/catch`. Si falla: `console.warn` y continúa (no bloquea).
5. Navegar a `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-pai`.

Botones del footer y de confirmación bloqueados con `[disabled]="saving"` durante todo el guardado.

Botón "Volver" navega a `pai-pending` (sin cambios respecto a hoy).

## Servicios y archivos a tocar fuera del componente

- `assessmentService.savePAIScoring(sessionId, scoring)` — **ya existe**, no requiere cambios. Sigue serializando como JSON en el campo `scores`. Solo cambia la forma del payload interno.
- `assessmentService.getScoring(sessionId)` — **ya existe**, no requiere cambios.
- `pai-interpret.service.ts` — ya creado en el árbol. Confirmar que expone `interpret(sessionId): Promise<unknown>`. Si la firma difiere, ajustar al ejecutar.
- `app.routes.ts` — verificar que `pai-entry` y `results-pai` están registradas. Si falta alguna, añadirla.
- `pai-pending`, `pai.config.ts`, `pai.scoring.ts`, `pai-results.component.*`, `pai-xml-export.service.ts` — **no se tocan**.

## Tests

Spec mínimo del orquestador (`pai-entry.component.spec.ts`):
- Monta el componente con servicios mock.
- Verifica que el FormGroup se construye con todos los grupos esperados (validez, clínicas, tratamiento, interpersonales, índices, itemsCriticos, idiosincrasicos).
- `requestConfirm` con form vacío marca `touched` y no abre el modal.
- `save` con form válido invoca `savePAIScoring` con el shape correcto y navega.

Sub-componentes presentacionales sin tests propios mientras sean tontos (solo `@Input() group` + render). Si después gana lógica alguno, se añade test entonces.

## Riesgos / suposiciones

| Riesgo | Mitigación |
|---|---|
| `savePAIScoring` o el backend Amplify pueden validar el JSON con un esquema fijo y rechazar campos nuevos | **Verificar al ejecutar:** revisar `amplify/data/resource.ts` (campo `scores` debería ser `string` o `json` libre) y `amplify/functions/ai-generate/src/handler.ts` para ver si parsea con un shape específico. |
| `paiInterpretService.interpret()` puede no existir o tener firma distinta | Verificar al ejecutar; si difiere, ajustar sólo el call site del componente. |
| Datos PAI guardados con el formato anterior se pierden visualmente al editar | Aceptado por decisión del usuario (opción A: rediseño completo sin migración). |

## Próximos pasos

1. Aprobación del usuario de este spec.
2. Pasar al `writing-plans` skill para desglosar la implementación en pasos verificables.
