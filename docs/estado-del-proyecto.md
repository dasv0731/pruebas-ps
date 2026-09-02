# Estado del proyecto — pruebas-ps

> Actualizado el **2026-09-02**. Último commit de código: `4a489df` (2026-07-29).
> Este documento es el punto de entrada para retomar el trabajo. Si algo aquí contradice al código,
> gana el código: actualiza este archivo.

## 1. Situación en una línea

La aplicación está **completa en su flujo principal y desplegada en producción con usuarios reales**,
pero **ninguna de las validaciones de runtime se ha ejecutado nunca**, y quedan dos riesgos abiertos
(rotación de la clave de IA y ausencia de DLQ en la cola de interpretaciones).

## 2. Verificación local, hoy

| Comprobación | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | ✅ |
| `npx tsc -p tsconfig.spec.json --noEmit` | ✅ |
| `npm run build` | ✅ (2 avisos de presupuesto SCSS: `cuida-results`, `eval-test`) |
| `npm run validate:baremos` | ✅ baremos CDI monótonos y sin solapes |
| `npm test` (Karma/ChromeHeadless) | ⛔ no finaliza en este entorno; no es ejecutable aquí |

Árbol de trabajo limpio; `main`, `dev` y sus remotos apuntan al mismo commit.

## 3. Arquitectura, en lo que hay que tener en la cabeza

```text
Caso → Implicados → { Pruebas, Entrevistas } → Interpretaciones
     → Consolidado de pruebas + Consolidado de entrevistas
     → Informe del implicado (DRAFT → REVIEWED → APPROVED)
     → Informe del caso
```

Dos zonas por autenticación: la perita (`/cases/**`, `/pending-tests`) y el evaluado (`/evaluate/**`,
entra con un código de 6 dígitos). El detalle de pantallas está en `arquitectura-ui-y-flujos.md`.

### Las seis pruebas

- **Autocorregibles**: STAI, STAIC (ansiedad) y CDI (depresión infantil). Se puntúan **server-side**.
- **Corrección externa en TEACorrige**: CUIDA, TAMAI y PAI. Se exporta XML desde la bandeja
  `/pending-tests`, se corrige en TEA y los resultados se transcriben en los formularios `*-entry`.

Las seis persisten una interpretación de IA que alimenta el consolidado.

### Lambdas

| Lambda | Papel |
|---|---|
| `ai-generate` | Query `generateAIContent`. Enruta por tipo al catálogo de prompts del servidor y devuelve metadatos de trazabilidad. |
| `eval-portal` | Media **todas** las operaciones del portal público: valida el código, entrega la prueba, guarda progreso, puntúa y encola la interpretación. |
| `assessment-interpret` | Consumidor SQS. Llama a la IA y completa la interpretación que quedó en `PENDING`. |
| `cdi-score`, `stai-score`, `cuida-interpret` | Scoring e interpretación específicos. |

### Interpretación asíncrona (lo más nuevo y lo menos probado)

Al terminar una prueba autocorregible, el portal crea el `AssessmentInterpretation` en `PENDING`,
lo **encola en SQS** y responde de inmediato; la Lambda consumidora lo completa después y el catálogo
de la perita hace *polling* del estado. Se hizo así porque la llamada síncrona a la IA alargaba y
llegaba a expirar el envío del evaluado.

**Punto débil conocido:** la cola no tiene DLQ. Si la IA falla los tres reintentos, el mensaje se
descarta y la interpretación se queda en `PENDING` indefinidamente, sin aviso ni forma de reintentar
desde la interfaz.

### Trazabilidad pericial

Toda generación de IA persiste `promptId`, `promptVersion`, `inputSnapshot` y, en las interpretaciones
de prueba, `structuredContent` (narrativa, síntesis, hallazgos, limitaciones y banderas de revisión).
Los prompts son catálogos cerrados que la perita elige; no hay prompt libre. Los informes están
versionados (`isCurrent`) y encadenados por obsolescencia (`isStale`): reabrir una entrevista o editar
un análisis marca obsoleto lo que dependía de él, hasta la regeneración.

## 4. Lo que falta

### Riesgos abiertos

1. **Rotar la clave de la API de IA.** Una clave viajó en texto plano por un chat el 2026-07-22 y sigue
   registrada en el secret del sandbox. Se registraron secrets nuevos por entorno, pero no consta que
   el valor sea distinto. Generar una clave nueva, revocar la anterior y re-registrarla en los tres
   ámbitos.
2. **DLQ + reintento manual** para la cola de interpretaciones (ver arriba).
3. **Código del portal**: 6 dígitos generados con `Math.random()` y sin limitación de intentos. La
   enumeración de datos ya está cerrada, pero la fuerza bruta sobre la validación sigue siendo posible.
   Ahora es un riesgo de producción. Añadir WAF, rate-limit o un token opaco.
4. **RGPD y cadena de custodia**: no hay borrado en cascada (borrar un caso deja registros huérfanos),
   ni caducidad de sesiones, ni registro de accesos.

### Datos del manual TEA que faltan

- **STAIC**: la lista de los 10 elementos inversos de la escala A-E no consta en el manual (viene en el
  ejemplar autocorregible). La lista actual está **inferida por contenido, no verificada**, así que la
  puntuación directa de A-E y su baremo son **provisionales** para uso pericial. Hay avisos en la
  interfaz y en la interpretación. No sustituir por la lista del STAI: se comprobó que no coinciden.
- **TAMAI Nivel III (15 años en adelante)**: falta el perfil de TEA para construir su configuración
  (mismo patrón que el Nivel 2, ya hecho). Faltan también los baremos de Nivel III y los colombianos.
- **CUIDA**: verificar contra el manual la dirección de la escala Agresividad.

### Validaciones de runtime pendientes

Ninguna se ha ejecutado. Todo lo de abajo está verificado solo a nivel de tipos, build y lógica pura.

- [ ] Ciclo de obsolescencia de entrevistas (checklist de la Task 7 de
      `superpowers/plans/2026-07-24-interview-flow.md`): reabrir → análisis obsoleto; editar el análisis
      a mano → consolidado obsoleto; consolidar excluyendo obsoletos; regenerar limpia el indicador.
- [ ] Interpretación asíncrona completa: envío del evaluado → `PENDING` → la Lambda la completa → el
      *polling* del catálogo lo refleja.
- [ ] Baremos STAI/STAIC en vivo con un sujeto con sexo y edad, y correcciones CDI/TAMAI/CUIDA.
- [ ] Envío completo de una prueba (40 ítems) y puntuación server-side.
- [ ] Excluir un implicado → readiness → informe del caso → obsolescencia al reincluirlo.
- [ ] Generar las interpretaciones de CDI, PAI, TAMAI y CUIDA y comprobar que el consolidado integra las seis.
- [ ] Importar los tres XML (CUIDA, TAMAI, PAI) en TEACorrige desde `/pending-tests`.
- [ ] Cambio obligatorio de contraseña de un usuario nuevo, y modales de alta y edición.

### Deuda menor

Detalles de borde de la partición para consolidación sin test; guard de caso bloqueado sin comprobación
en servidor; la edición manual del informe de entrevistas se guarda con origen `AI`; la reapertura de
entrevista no es atómica; ~46 `(client.models as any)` por tipos sin regenerar; sin recuperación de
sesiones "completadas sin puntuación"; **sin CI/CD y sin ESLint/Prettier**; dos avisos de presupuesto
SCSS; rama obsoleta `feat/auditoria-scoring-seguridad-informes` pendiente de borrar.

## 5. Historial de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-07-22 | Auditoría con agentes; scoring STAI/STAIC corregido; IA migrada a DeepSeek; flujo de informes; export PDF; portal público asegurado con Lambda mediadora. |
| 2026-07-24 | Scoring cotejado contra las guías de TEA (CDI, STAI/STAIC, TAMAI, CUIDA); flujo de entrevistas con reapertura, edición manual y cascada de obsolescencia. |
| 2026-07-25 | Bandeja global de correcciones TEA; trazabilidad de obsolescencia en informes; rediseño de interfaz; login propio; entornos `dev` y `main`. |
| 2026-07-27 | Catálogos de prompts seleccionables y trazabilidad de generación; prompts forenses endurecidos; datos del sujeto obligatorios y congelados; argumento `operation` en el portal. |
| 2026-07-29 | Interpretación asíncrona por cola; cambio obligatorio de contraseña; ajustes de leyendas y edades de las pruebas. |
| 2026-09-02 | Puesta al día de documentación y memoria; verificación local en verde. Sin cambios de código. |
