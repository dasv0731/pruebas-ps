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

## Sesion 2026-07-24 — TEA, informes y UX

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

## Sesion 2026-07-24 — Handoff visual, acceso y modales

- Revisado el handoff de Claude Design en `Prototipo navegable de pruebas-ps-handoff`; el diseño IBM Plex es la referencia aplicada.
- Rediseñados tokens globales, shell, breadcrumb, casos, informes, pruebas, entrevistas y portal publico sin alterar logica de negocio.
- Sustituido `amplify-authenticator`, que bloqueaba la ruta autenticada en local, por login propio via `AuthService`; raiz y guard redirigen a `/login`.
- Las altas y ediciones de caso e implicado ahora se resuelven mediante modales funcionales en listado/detalle; rutas directas conservadas.
- Verificado: TypeScript y build de desarrollo pasan; queda QA manual de login y modales en sandbox.
