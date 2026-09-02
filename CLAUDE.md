# CLAUDE.md — instrucciones para agentes en este repositorio

Contexto imprescindible antes de tocar nada. Léelo entero; es corto.

## Qué es esto

`pruebas-ps` (paquete `peritajes-app`) es una aplicación de **peritajes psicológicos forenses** para un
contexto judicial de familia/custodia. Los datos que maneja son **datos de salud de personas reales,
incluidos menores**, dentro de procedimientos judiciales abiertos. La aplicación **está en producción
con usuarios reales**.

Consecuencias prácticas:

- Nunca inventes baremos, claves de corrección, puntos de corte ni escalas. Si un dato no consta en el
  manual de TEA, el programa **no debe fabricarlo**: debe fallar o declarar la limitación.
- Nunca conviertas una salida de IA en un diagnóstico, un juicio de idoneidad parental, una valoración
  de credibilidad o una recomendación al juzgado. La IA produce **ayudas técnicas para revisión humana**.
- Un cambio en el esquema de datos o en el scoring afecta a peritajes vivos. Propón antes de desplegar.

## Stack

Angular 19 (standalone, lazy loading, SCSS) + AWS Amplify Gen 2 (Cognito, AppSync/DynamoDB, Lambdas, SQS).
IA vía DeepSeek sobre su endpoint compatible con la Messages API de Anthropic.

## Documentación de referencia

| Archivo | Para qué |
|---|---|
| `docs/estado-del-proyecto.md` | Punto de entrada: qué está hecho, qué falta, qué validar. **Empieza aquí.** |
| `docs/arquitectura-ui-y-flujos.md` | Inventario de pantallas, rutas, procesos y criterio URL vs. modal. |
| `docs/superpowers/specs/` y `plans/` | Especificaciones y planes de las features grandes. |
| `.superpowers/sdd/progress.md` | Bitácora de sesiones de desarrollo. |
| `README.md` | Arranque, entornos y comandos. |

## Reglas del repositorio

1. **El repositorio es PÚBLICO.** No commitees identificadores de infraestructura (IDs de Cognito o
   AppSync, URLs de colas, cuenta AWS), emails de usuarios, contraseñas ni secrets. Esos datos viven
   en la memoria privada del proyecto, fuera de aquí.
2. `amplify_outputs.json` está en `.gitignore` y debe seguir estándolo. El repositorio solo versiona
   el stub `amplify_outputs.example.json`.
3. La rama de trabajo es `dev`; `main` es producción. Se promociona el mismo commit, nunca se
   desarrolla directo sobre `main`.

## Verificación antes de dar algo por terminado

Karma/ChromeHeadless **no termina** en este entorno, así que los tests unitarios no son ejecutables
aquí. La verificación real es:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run validate:baremos
```

Las cuatro deben pasar. El build emite dos avisos conocidos de presupuesto SCSS
(`cuida-results`, `eval-test`) que no son un fallo.

Las validaciones que solo se pueden hacer con la aplicación corriendo están listadas en
`docs/estado-del-proyecto.md`; no las declares hechas sin haberlas ejecutado.

## Convenciones del código

- Los tests psicológicos son **config-driven**: `src/app/features/assessments/tests/<test>/`.
- Pagina siempre las consultas con `listAll()` (`src/app/core/utils/paginate.ts`); un `list()` pelado
  se queda en la primera página y provoca fallos silenciosos.
- Hay ~46 `(client.models as any)` por tipos sin regenerar. No añadas más de los necesarios.
- Los prompts de IA son **catálogos cerrados** que la perita selecciona, no texto libre:
  `amplify/functions/ai-generate/src/assessment-prompts.ts`,
  `src/app/features/interviews/interview-prompt-catalog.ts`,
  `src/app/features/subjects/report-prompt-catalog.ts`.
  Toda generación persiste `promptId`, `promptVersion` e `inputSnapshot` para trazabilidad pericial.
- **Gotcha de Amplify Gen 2:** los handlers de función no reciben `event.info.fieldName`. La Lambda
  `eval-portal` distingue sus operaciones por un argumento explícito `operation`
  (`VALIDATE`, `GET_TEST`, `SAVE_PROGRESS`, `COMPLETE`). Si añades una operación, añade también el caso.
- Los datos del sujeto (`sexo`, `fecha de nacimiento`, edad) se **congelan al crear la sesión** de prueba,
  para que el baremo use siempre los datos del momento de aplicación.

## Idioma

El usuario trabaja en español. Código y comentarios en español; los mensajes de la interfaz y de la IA,
también.
