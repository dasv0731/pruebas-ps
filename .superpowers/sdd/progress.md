# SDD progress — flujo de entrevistas
Plan: docs/superpowers/plans/2026-07-24-interview-flow.md
Base historica: e71fc63; cambios actuales locales sin commit
Modelos: implementador=Sonnet, revisión=Opus, revisión final=Opus

Task 1: complete (base e71fc63..ebb860c, verificado tsx 8 asserts)
Task 1: review Opus = Approved (spec ✅). Minor (para revisión final): (1) añadir caso DRAFT-con-análisis a la partición; (2) casos borde array vacío/todo-incluido/todo-excluido.
Decisión: Tasks 2-6 se ejecutan como UN despacho cohesivo (cambio acoplado). Entorno: NO usar ng test (Karma cuelga headless); verificar con tsc + ng build.
Tasks 2-6: implementadas (Sonnet, commits 1884b2f..186755b), review Opus = Approved.
  - Important corregido: isStale required()->nullable (rompía lectura de filas legacy en AppSync; contradecía constraint del plan).
  - Minor corregido: CSS de banners (.alert-warning/.notice) + doble render del análisis en interview-form.
Tasks 2-6 fix (f4044dd): verificado (isStale nullable, guard caseLocked en output, CSS). tsc+build OK. Gate de tarea superado.
Revisión final Opus (e71fc63..HEAD) = CAMBIOS NECESARIOS. Important: gate del botón consolidar bloquea regeneración cuando hay excluidos por obsolescencia (anula spec §3.3). Fix en curso + Minor CTA-bajo-caseLocked + mensaje "faltan por analizar".
Diferidos (no bloquean, para después): spec edge tests de partición; guard caseLocked server-side en reopenInterview (§4.2, ya protegido en componente); saveInterviewReport source AI en edición manual (pre-existente); reopenInterview no atómico (aceptable en sandbox).
Fix final (83b8e5d): disabled del consolidar sin term totalCompletedInterviews; pending-msg eliminado; banners con !caseLocked. tsc+build OK. Important resuelto.
FEATURE COMPLETA — lista para merge (solo quedan Minor diferidos).

## Sesion 2026-07-25 — TEA, informes y UX (commit 1595981)

- Implementada bandeja global protegida `/pending-tests` para CUIDA, TAMAI y PAI.
- Implementada descarga de XML agrupados por tipo y acceso directo a los formularios de transcripcion.
- CUIDA/TAMAI/PAI ya no ejecutan scoring local generico al finalizar; siguen el flujo TEACorrige.
- CUIDA fijado a 189 items oficiales; añadido `cuida.config.spec.ts`.
- Añadida trazabilidad `isStale` para informes de pruebas y del implicado, con invalidacion de dependencias.
- Formularios de caso e implicado simplificados segun los campos obligatorios definidos.
- Añadida documentacion en `docs/arquitectura-ui-y-flujos.md` y actualizado el README.
- Desplegado el esquema al sandbox con `npx ampx sandbox --once`.
- Verificado: `npm run build`, TypeScript de aplicacion y TypeScript de specs.
- Pendiente: validacion manual de UI, importacion real en TEACorrige y ciclo completo de obsolescencia; Karma headless sigue sin finalizar en el timeout conocido.

## Sesion 2026-07-25 — Handoff visual, acceso y modales (commit 1595981)

- Revisado el handoff de Claude Design en `Prototipo navegable de pruebas-ps-handoff`; el diseño IBM Plex es la referencia aplicada.
- Rediseñados tokens globales, shell, breadcrumb, casos, informes, pruebas, entrevistas y portal publico sin alterar logica de negocio.
- Sustituido `amplify-authenticator`, que bloqueaba la ruta autenticada en local, por login propio via `AuthService`; raiz y guard redirigen a `/login`.
- Las altas y ediciones de caso e implicado ahora se resuelven mediante modales funcionales en listado/detalle; rutas directas conservadas.
- Verificado: TypeScript y build de desarrollo pasan; queda QA manual de login y modales en sandbox.

## Sesion 2026-07-27 — Prompts trazables y datos obligatorios (commit 452b1ce)

- Catalogos de prompts cerrados en lugar de prompt libre: `assessment-prompts.ts` en el servidor
  (reglas forenses innegociables y salida JSON estructurada), `interview-prompt-catalog.ts` con
  cinco enfoques de analisis de entrevista y `report-prompt-catalog.ts` con tres enfoques por
  consolidado. `generateAIContent` acepta `assessmentCode`, `interviewPromptId` y `reportPromptId`.
- Trazabilidad pericial de toda generacion: `promptId`, `promptVersion`, `inputSnapshot` y
  `structuredContent` persistidos en interpretaciones, analisis y consolidados;
  `Interview.analysisPromptId` guarda el enfoque elegido.
- Prompts endurecidos en los seis tipos: prohibido inventar contexto judicial, diagnosticos,
  credibilidad, idoneidad parental, riesgo o recomendaciones; un relato es un relato, no un hecho
  corroborado; la ausencia de indicadores no prueba ausencia de dano.
- Datos del sujeto obligatorios y congelados al crear la sesion (sexo, fecha de nacimiento, edad),
  para que el baremo use siempre los datos del momento de aplicacion.
- La Lambda del portal distingue sus operaciones por un argumento explicito `operation`: los
  handlers de Amplify Gen 2 no reciben `event.info.fieldName`. Timeout 30 a 60 segundos.

## Sesion 2026-07-29 — Interpretacion asincrona, contrasena y leyendas (a7bf684, 59d0915, 4a489df)

- La interpretacion automatica de las pruebas autocorregibles pasa a ser asincrona: el portal crea
  la interpretacion en PENDING y encola el trabajo en SQS; la nueva funcion `assessment-interpret`
  la completa. El catalogo de la perita hace polling del estado. Motivo: la llamada sincrona a la
  IA alargaba y llegaba a expirar el envio del evaluado.
- Cola creada en `amplify/backend.ts` (stack `async-processing`), dependencia `@aws-sdk/client-sqs`.
  Pendiente: no tiene DLQ, un fallo repetido de la IA deja la interpretacion en PENDING para siempre.
- Cambio obligatorio de contrasena completo en el login propio (reto de Cognito) y comprobacion de
  la sesion persistida al arrancar el shell.
- Leyendas de opciones por prueba con `showOptionLegend`, edades minima y maxima por test.
- Desplegado a `dev` y promovido a `main`; produccion actualizada el 2026-07-29.

## Sesion 2026-09-02 — Puesta al dia de documentacion

- Sin cambios de codigo. Se documento todo lo hecho entre el 25 y el 29 de julio, que no estaba
  reflejado en esta bitacora ni en la memoria del proyecto.
- Anadidos `CLAUDE.md` y `docs/estado-del-proyecto.md` (punto de entrada con estado, riesgos
  abiertos, datos de TEA que faltan y la lista de validaciones de runtime nunca ejecutadas).
- README actualizado; memoria del proyecto reescrita y respaldada en un repositorio privado aparte,
  porque contiene identificadores de infraestructura y usuarios que no pueden ir a un repo publico.
- Verificacion local en verde: tsc de aplicacion y specs, build y `validate:baremos`. Karma sigue
  sin finalizar en este entorno.
