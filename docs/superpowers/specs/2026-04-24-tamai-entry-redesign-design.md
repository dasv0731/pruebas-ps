# TAMAI Entry — Rediseño completo del formulario de transcripción

**Fecha:** 2026-04-24
**Componente afectado:** `src/app/features/assessments/components/tamai-entry/`
**Componente colateral:** `src/app/features/assessments/components/tamai-results/` (reescritura mínima)
**Tipo de cambio:** Rediseño completo (no migración) — el shape de datos guardado cambia y los registros con el formato anterior dejarán de leerse.

## Contexto

`TamaiEntryComponent` permite al perito transcribir manualmente las puntuaciones devueltas por el informe de TEACorrige para el TAMAI (Test Autoevaluativo Multifactorial de Adaptación Infantil). La versión actual captura solo 10 valores agregados (AP, AE, AS, AG, SP, AF, AH, ATP, ATM, ATOTAL) como percentil único, lo que pierde toda la riqueza del informe TEA y solo cubre el "Nivel 1" parcialmente.

El rediseño actualiza el componente para capturar el informe completo del TAMAI Nivel 1:

- ~70 escalas / subescalas con jerarquía hasta cuatro niveles de profundidad (p. ej. `P → P2 → P22 → P221`).
- Tanto puntuación directa (PD) como percentil (Pc) por escala.
- Selección de baremo filtrada por sexo + nivel.
- Selección de nivel TAMAI (I, II, III) auto-derivada de la edad y editable.
- Arquitectura preparada para multinivel: solo Nivel I se implementa ahora; añadir Nivel II o III será mecánico.

## Alcance

**En alcance:**
- Rediseño completo de `tamai-entry`.
- Definición del config Nivel I (`tamai-level1.config.ts`) con la estructura jerárquica completa.
- Reescritura **mínima** de `tamai-results` para consumir el nuevo shape (lista plana de escalas con badges de categoría).
- Wiring del select de baremo y del select de nivel.

**Fuera de alcance:**
- Implementación de Nivel II y Nivel III (la arquitectura los soporta; el config se añade después).
- Reglas de interpretación clínica elaboradas (las nuevas reglas TAMAI las pasará el usuario más adelante).
- Vista jerárquica visual elaborada en `tamai-results` (tabla plana ahora).
- Rediseño de `tamai.interpretation.ts` (es del flujo de auto-scoring, no aplica al manual).
- Migración de datos TAMAI guardados con el shape anterior.

## Decisiones de diseño

| # | Decisión | Razón |
|---|---|---|
| 1 | Arquitectura multinivel preparada, solo Nivel I implementado ahora | Acordado con el usuario; permite añadir niveles sin reescribir base. |
| 2 | Baremo seleccionado vía `<select>` filtrado por sexo+nivel; código estable + label visible | Evita combinaciones imposibles (p. ej. baremo de mujeres con sujeto varón). |
| 3 | Transcribir todas las escalas (incluidas las "derivadas" como G); el sistema NO calcula | Pc no es suma simple; el perito tiene el informe TEA y transcribe lo que ve. |
| 4 | Datos planos en BD (`escalas: Record<code, {pd,pc}>`); jerarquía vive en el config | Las escalas son entidades de primer nivel; la jerarquía es atributo presentacional. |
| 5 | Pc como entero exacto (1–99), no categoría ordinal | Coherente con lo que reporta TEACorrige; la categorización es interpretación, no captura. |
| 6 | Reescritura mínima de `tamai-results` (tabla plana con categoría) | Mantiene el sistema funcional end-to-end sin invertir tiempo en visualización elaborada antes de las reglas de interpretación. |
| 7 | Nivel TAMAI auto-derivado de la edad, editable vía `<select>` | Cubre casos típicos sin clic + permite override en casos atípicos. |
| 8 | Sin migración del shape anterior | Acordado con el usuario; consistente con la decisión tomada para PAI. |
| 9 | Componente config-driven recursivo (no secciones hardcodeadas) | Una sola fuente de verdad alimenta form, UI, baremos y categorización; añadir Nivel II = añadir `tamai-level2.config.ts`. |

## Arquitectura de archivos

```
src/app/features/assessments/components/tamai-entry/
├── tamai-entry.component.ts           Orquestador: ruta, carga, FormGroup, save
├── tamai-entry.component.html         Encabezado + configuración + cards de bloques + confirmación
├── tamai-entry.component.scss         Layout general (cards apiladas)
├── tamai-entry.types.ts               TamaiScore, TAMAIManualScoring
├── tamai-level-config.ts              Tipos del config: TamaiLevel, ScaleType, ScaleNode, SectionBlock, BaremoOption, TamaiLevelConfig
├── tamai-level1.config.ts             Definición completa del Nivel I
├── tamai-level-registry.ts            Map TamaiLevel → TamaiLevelConfig | null + deriveLevelFromAge() + flattenScaleNodes()
└── sections/
    ├── tamai-scale-input.component.{ts,html,scss}    Atómico: par PD+Pc inline con indentación según depth
    ├── tamai-scale-tree.component.{ts,html,scss}     Recursivo: walk del árbol de ScaleNode
    ├── tamai-section-block.component.{ts,html}       Card + título + invoca <tamai-scale-tree>
    └── tamai-baremo-select.component.{ts,html}       <select> filtrado por sexo+nivel

src/app/features/assessments/components/tamai-results/
├── tamai-results.component.ts         Reescrito: lee config para etiquetas/categorías
├── tamai-results.component.html       Header + tabla plana de escalas con badges
└── tamai-results.component.scss       Sin cambios mayores
```

### Contratos de los sub-componentes

**`<tamai-scale-input>`**
- `@Input() group: FormGroup` — sub-grupo con controles `pd` y `pc`.
- `@Input() abbr: string` — código mostrado (ej. `'P221'`).
- `@Input() label: string` — etiqueta legible (ej. `'Intrapunición'`).
- `@Input() depth: number = 0` — profundidad para indentación visual (16px × depth).
- Calcula `isInvalid('pd' | 'pc')` desde el grupo recibido.

**`<tamai-scale-tree>`**
- `@Input() nodes: ScaleNode[]`.
- `@Input() escalasGroup: FormGroup` — el FormGroup `escalas` raíz; busca cada control por `node.code`.
- Itera nodos: por cada uno, renderiza un `<tamai-scale-input>` y recursivamente otro `<tamai-scale-tree>` con `node.children`.

**`<tamai-section-block>`**
- `@Input() title: string`, `@Input() nodes: ScaleNode[]`, `@Input() escalasGroup: FormGroup`.
- Renderiza una card `<div class="card">` con `<h3>{{title}}</h3>` y `<tamai-scale-tree>` dentro.

**`<tamai-baremo-select>`**
- `@Input() options: BaremoOption[]` — ya filtradas por sexo+nivel.
- `@Input() control: FormControl`.
- Renderiza un `<select>` con `<option>` por cada `BaremoOption`.

El componente raíz **construye el FormGroup completo** iterando `config.allCodes` y solo pasa sub-grupos hacia abajo. Toda la lógica de carga, edición, save y navegación queda en el orquestador.

## Tipos del config

```typescript
// tamai-level-config.ts

export type TamaiLevel = 'I' | 'II' | 'III';
export type TamaiSex = 'MALE' | 'FEMALE';

export type ScaleType =
  | 'control'        // Contradicciones, Pro-imagen
  | 'inadaptacion'   // mayor Pc = peor (G, P, P1, P2, ...)
  | 'satisfaccion'   // mayor Pc = mejor
  | 'parental'       // educación de padres — sin categoría inadaptación/satisfacción
  | 'discrepancia';  // Discrepancia educativa

export interface ScaleNode {
  code: string;
  label: string;
  depth: number;
  type: ScaleType;
  children?: ScaleNode[];
}

export interface SectionBlock {
  title: string;
  nodes: ScaleNode[];
}

export interface BaremoOption {
  code: string;
  label: string;
  validForSex: TamaiSex[];
}

export interface TamaiLevelConfig {
  level: TamaiLevel;
  ageRange: { min: number; max: number };
  blocks: SectionBlock[];
  baremos: BaremoOption[];
  /** Lista plana de TODOS los `code` del árbol — derivada via flattenScaleNodes() */
  allCodes: string[];
}
```

```typescript
// tamai-level-registry.ts

export const TAMAI_LEVEL_REGISTRY: Record<TamaiLevel, TamaiLevelConfig | null> = {
  'I':   TAMAI_LEVEL1_CONFIG,
  'II':  null,
  'III': null,
};

export function deriveLevelFromAge(age: number | null | undefined): TamaiLevel {
  if (age == null) return 'I';
  if (age <= 11) return 'I';
  if (age <= 14) return 'II';
  return 'III';
}

export function flattenScaleNodes(blocks: SectionBlock[]): string[] {
  const out: string[] = [];
  function walk(nodes: ScaleNode[]) {
    for (const n of nodes) {
      out.push(n.code);
      if (n.children?.length) walk(n.children);
    }
  }
  for (const b of blocks) walk(b.nodes);
  return out;
}
```

`tamai-level1.config.ts` exporta `TAMAI_LEVEL1_CONFIG` con todos los bloques (Control · Inadaptación general · Inadaptación personal · Inadaptación escolar · Inadaptación social · Insatisfacción familiar · Educación padre · Educación madre · Discrepancia) y nodos jerárquicos. `allCodes` se calcula con `flattenScaleNodes(blocks)` al final del archivo. Baremos iniciales:

```typescript
baremos: [
  { code: 'N-I-V', label: 'N-I Varones (8-11 años)', validForSex: ['MALE'] },
  { code: 'N-I-M', label: 'N-I Mujeres (8-11 años)', validForSex: ['FEMALE'] },
],
```

(Si TEA publica un baremo mixto adicional, se añade.)

## Modelo de datos

```typescript
// tamai-entry.types.ts

import type { TamaiLevel } from './tamai-level-config';

export interface TamaiScore {
  pd: number;
  pc: number;
}

export interface TAMAIManualScoring {
  source: 'TEA_MANUAL_TAMAI';
  level: TamaiLevel;
  baremo: string;            // código estable, p. ej. 'N-I-V'
  enteredAt: string;
  escalas: Record<string, TamaiScore>;  // key = ScaleNode.code
}
```

**Notas:**
- `escalas` es plano. La jerarquía se reconstruye en runtime leyendo `TAMAI_LEVEL_REGISTRY[level]`.
- `level` y `baremo` se persisten para que cualquier consumidor (results, exports, futuras reglas de interpretación) pueda re-renderizar sin ambigüedad.
- Sin migración de shape anterior.

## UI / UX

Layout idéntico al patrón PAI: página única con scroll vertical, una `<div class="card">` por bloque temático.

**Encabezado:**
- Botón "← Volver" + título dinámico ("Transcribir TAMAI" / "Editar TAMAI").
- Resumen del evaluado: nombre, edad, sexo.
- Hint: "Ingrese las puntuaciones PD y Pc tal como las reporta TEACorrige."

**Card "Configuración":**
```
Nivel TAMAI       [▼ Nivel I (8-11)]   ← derivado de edad, editable
Baremo            [▼ N-I Varones]      ← filtrado por sexo+nivel
```

Cuando solo hay una opción válida de baremo para el sexo+nivel actuales, el `<select>` se autocompleta con esa opción.

**Cards de bloques** (uno por entry en `config.blocks`):

Cada card renderiza `<h3>{{block.title}}</h3>` y debajo un `<tamai-scale-tree>`. El árbol indenta cada nodo según `node.depth`:

```
Inadaptación personal
─────────────────────────────────────────────────
P     Inadaptación personal           [PD ___] [Pc ___]
  P1    Desajuste disociativo          [PD ___] [Pc ___]
  P2    Autodesajuste                  [PD ___] [Pc ___]
    P21   Cogniafección                 [PD ___] [Pc ___]
    P22   Cognipunición                 [PD ___] [Pc ___]
      P221  Intrapunición                [PD ___] [Pc ___]
      P222  Depresión                    [PD ___] [Pc ___]
      P223  Somatización                 [PD ___] [Pc ___]
```

- Indentación: `padding-left: depth * 16px` y `border-left` sutil para sugerir jerarquía.
- Sigla en negrita azul (depth 0) o atenuada (depth ≥ 1).
- Inputs `type="number"` de ~70px, etiquetas "PD" / "Pc" adyacentes.
- Borde rojo si inválido y tocado.

**Bloques previstos en Nivel 1:** Escalas de Control · Inadaptación general · Inadaptación personal · Inadaptación escolar · Inadaptación social · Insatisfacción familiar · Educación padre · Educación madre · Discrepancia.

**Footer:**
- Botón "Volver" + botón "Revisar y guardar".
- Modal de confirmación con resumen y botones "Cancelar" / "Confirmar y guardar".

**Estados:**
- `loading=true` → "Cargando...".
- `error` y no en confirmación → banner rojo arriba.
- `saving=true` → texto del botón "Guardando...".

**Sin sección de ítems críticos** (TAMAI no los tiene en la estructura del Nivel 1).

**`tamai-results` minimal viable:**
- Header: nombre, edad, sexo, nivel TAMAI, baremo aplicado.
- Card con tabla plana: una fila por escala iterando `config.allCodes`. Columnas: `[Sigla] [Etiqueta] [PD] [Pc] [Categoría]`.
- Categorización: para `node.type === 'inadaptacion'`, mayor Pc = peor (`Pc ≥ 85` muy alta, `≥ 75` alta, `≥ 50` media-alta, `≥ 25` media, `< 25` baja). Para `'satisfaccion'`, invertido. Para `'control'`, `'parental'`, `'discrepancia'`: solo se muestra el valor sin categoría.
- Sin árbol indentado, sin gráfico, sin flags clínicos elaborados.

## Validación, carga y guardado

### Validación

- Cada control `pd` y `pc` por escala: `Validators.required`, sin rangos.
- `level`: `Validators.required`. El select muestra solo niveles con config disponible (hoy: solo `'I'`).
- `baremo`: `Validators.required`. Al cambiar el `level` o cuando se renderiza por primera vez con un sexo conocido, las opciones se recalculan filtrando por sexo+nivel; si el valor actual ya no es válido, se resetea a la primera opción válida (o `null`).
- `requestConfirm()` chequea `form.invalid`, marca todo como `touched`, muestra "Complete todos los campos requeridos antes de continuar.", no avanza al modal.

### Carga (`loadData`)

1. Cargar `session` y `subject`.
2. Auto-derivar `defaultLevel = deriveLevelFromAge(session.subjectAgeYears)`.
3. Construir el FormGroup vacío usando `TAMAI_LEVEL_REGISTRY['I'].allCodes` (por ahora siempre Nivel I; cuando haya II/III, el FormGroup se reconstruye al cambiar el `level` en el select).
4. Llamar `assessmentService.getScoring(sessionId)`.
5. Si existe y `source === 'TEA_MANUAL_TAMAI'`:
   - Si el `level` guardado no es `'I'` → mostrar error `'Esta evaluación se guardó con Nivel {X}, todavía no soportado.'` y dejar el form deshabilitado.
   - Si es `'I'` → `prefillForm()` (`patchValue` sobre baremo, level, y cada entry de `escalas`), `isEditMode = true`.
6. Cualquier shape antiguo (`adaptacion: { AP, ... }`) o JSON corrupto → formulario vacío silenciosamente.

### Guardado (`save`)

1. Validar form. Si inválido: marcar `touched`, mostrar error, abortar.
2. Construir `TAMAIManualScoring`:
   - `source: 'TEA_MANUAL_TAMAI'`, `level`, `baremo`, `enteredAt = new Date().toISOString()`.
   - `escalas`: iterar `config.allCodes` y para cada `code` extraer `{ pd: Number(g.pd), pc: Number(g.pc) }` desde `form.get(['escalas', code]).value`.
3. `await assessmentService.saveTAMAIScoring(sessionId, scoring)`.
4. Si éxito: navegar a `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-tamai`.
5. Si falla: `error = err.message`, `showConfirm = false`, `saving = false`.

Botones bloqueados con `[disabled]="saving"` durante el guardado. "Volver" navega a `tamai-pending`.

## Servicios y archivos a tocar fuera del componente

- `assessmentService.saveTAMAIScoring(sessionId, scoring)` — **ya existe**, no requiere cambios.
- `assessmentService.getScoring(sessionId)` — **ya existe**, no requiere cambios.
- `tamai-results.component.ts` — **reescritura mínima**: import `TAMAIManualScoring` y `TAMAI_LEVEL_REGISTRY` desde `tamai-entry`; lista plana con categorización por `node.type`; mensaje claro si `level` no soportado o shape antiguo.
- `app.routes.ts` — verificar que `tamai-entry` y `results-tamai` ya están registradas. (Sí lo están según el código actual.)
- `tamai-pending`, `tamai.config.ts`, `tamai.scoring.ts`, `tamai.interpretation.ts` — **no se tocan** (auto-scoring path independiente del manual).
- `pai-xml-export.service.ts` patrón equivalente (`tamai-xml-export.service.ts`) — verificar si referencia `TAMAIManualScoring` o keys viejas; si no, sin cambios.

## Tests

Spec mínimo del orquestador:
- Monta el componente con servicios mock.
- Verifica que el FormGroup se construye con un control por cada `code` de `TAMAI_LEVEL1_CONFIG.allCodes`, cada uno con sub-controles `pd` y `pc`.
- `requestConfirm` con form vacío marca `touched` y no abre el modal.
- `save` con form válido invoca `saveTAMAIScoring` con el shape correcto (claves planas en `escalas`).

Sub-componentes presentacionales sin tests propios mientras sean tontos.

## Riesgos / suposiciones

| Riesgo | Mitigación |
|---|---|
| `allCodes` se desincroniza del árbol al editar el config a mano | Helper `flattenScaleNodes(blocks)` deriva `allCodes`; no se mantiene a mano. |
| Edad desconocida o fuera de Nivel I al editar una sesión vieja | `deriveLevelFromAge(null)` devuelve `'I'`; sesiones con `level !== 'I'` muestran mensaje claro. |
| Códigos exactos y validez por sexo de los baremos del Nivel 1 son suposición del diseñador | Usar `'N-I-V'` y `'N-I-M'` como placeholders; ajustar al implementar si TEA publica códigos canónicos. |
| `tamai-xml-export.service.ts` puede consumir el shape antiguo y romperse | Verificar al ejecutar; si hace falta, plan adicional para actualizarlo. |
| `tamai.interpretation.ts` referencia subscale names tipo `'Adaptación Personal'` que ya no existen | Es del flujo auto-scoring, no del manual; no se invoca desde `save`. Si algún día se integra, requerirá su propio plan. |

## Próximos pasos

1. Aprobación del usuario de este spec.
2. Pasar al `writing-plans` skill para desglosar la implementación en pasos verificables.
