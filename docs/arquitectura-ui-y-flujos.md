# Arquitectura de UI y flujos — pruebas-ps

## 1. Propósito de la aplicación

`pruebas-ps` es una aplicación para gestionar peritajes psicológicos forenses.
Su objetivo es centralizar el expediente, los implicados, las pruebas psicológicas,
las entrevistas, las correcciones externas, las interpretaciones y los informes
periciales.

El flujo principal es:

```text
Caso
  -> Implicados
    -> Pruebas psicológicas
    -> Entrevistas
      -> Interpretaciones
        -> Consolidado del implicado
          -> Informe del caso
```

La aplicación tiene dos perfiles de uso:

| Perfil | Zona | Propósito |
|---|---|---|
| Psicóloga/perita | `/cases/**` y `/pending-tests` | Gestionar expedientes, aplicar pruebas, revisar resultados y generar informes |
| Evaluado | `/evaluate/**` | Responder pruebas mediante un código de acceso temporal |

La psicóloga trabaja con datos persistentes y procesos revisables. El evaluado
trabaja con una sesión temporal, autosalvado y reanudación.

## 2. Principios de navegación

### 2.1 Cuándo usar una URL

Una acción debe conservar una URL cuando:

- Representa una pantalla de trabajo completa.
- Tiene un formulario largo.
- Tiene datos persistentes o versionados.
- Puede necesitar reanudarse después de un refresco.
- Debe poder abrirse directamente o compartirse internamente.
- Tiene estados propios, por ejemplo `DRAFT`, `COMPLETED`, `REVIEWED` o `APPROVED`.
- Incluye texto largo, transcripciones, resultados o informes.
- El usuario necesita volver a ella con el botón atrás.

### 2.2 Cuándo usar un modal

Una acción puede resolverse mediante modal cuando:

- Es una confirmación breve.
- Es una operación destructiva o irreversible.
- Solo solicita un dato corto, como el nombre de un XML.
- No representa una ubicación de trabajo independiente.
- No necesita navegación, historial ni recuperación tras refrescar.

### 2.3 Decisión general

La aplicación debe seguir siendo principalmente orientada a páginas y URLs.
Los modales deben complementar las páginas, no sustituir los flujos largos.

## 3. Estructura global

### 3.1 Autenticación

La autenticación se muestra mediante el formulario propio del shell, conectado
a Cognito a través de `AuthService`. La ruta pública de acceso es `/login`.

| Elemento | Qué representa | Tipo |
|---|---|---|
| Título de acceso | Identidad de la aplicación | Elemento visual |
| Email y contraseña | Credenciales de la psicóloga | Formulario de autenticación |
| Cerrar sesión | Finaliza la sesión de Cognito | Acción inmediata |

La autenticación no necesita una URL de negocio independiente. Es un estado
transversal de la aplicación.

### 3.2 Cabecera autenticada

Archivo principal: `src/app/app.component.html`.

| Elemento | Qué representa | Navegación |
|---|---|---|
| Peritajes Psicológicos | Marca y contexto de trabajo | No aplica |
| Casos | Entrada al área principal de expedientes | `/cases` |
| Pruebas pendientes | Bandeja global de correcciones TEA pendientes | `/pending-tests` |
| Email del usuario | Identidad de la sesión autenticada | No aplica |
| Cerrar sesión | Salida de la aplicación | No aplica |

La cabecera debe permanecer visible en la zona autenticada. En móvil puede
convertirse en una navegación horizontal desplazable.

### 3.3 Breadcrumb y pestañas contextuales

Componente: `src/app/core/components/breadcrumb/`.

El breadcrumb indica la posición dentro del expediente:

```text
Casos -> Caso 2026-0001 -> Implicado -> Resumen / Pruebas / Entrevistas
```

| Elemento | Qué representa | Tipo |
|---|---|---|
| Casos | Regreso al listado general | URL |
| Caso | Expediente actual | URL |
| Implicado | Persona actual | URL |
| Selector de implicado | Cambio rápido entre personas del mismo caso | Menú desplegable |
| Resumen | Vista consolidada del implicado | URL |
| Pruebas | Catálogo y sesiones de pruebas | URL |
| Entrevistas | Lista y ciclo de entrevistas | URL |

El selector de implicado puede seguir siendo un menú desplegable. Las pestañas
deben continuar cambiando la URL porque representan secciones persistentes.

## 4. Mapa de rutas

### 4.1 Zona pública

| Ruta | Pantalla | Estado recomendado |
|---|---|---|
| `/evaluate` | Portal de acceso y lista de pruebas | URL |
| `/evaluate/test/:sessionId` | Aplicación de una prueba | URL obligatoria |
| `/evaluate/thanks` | Confirmación de finalización | URL |

### 4.2 Zona de la psicóloga

| Ruta | Pantalla | Estado recomendado |
|---|---|---|
| `/cases` | Listado de casos | URL |
| `/cases/new` | Crear caso (acceso directo alternativo) | URL |
| `/cases/:caseId` | Detalle del caso | URL |
| `/cases/:caseId/edit` | Editar caso (acceso directo alternativo) | URL |
| `/cases/:caseId/report` | Informe final del caso | URL |
| `/cases/:caseId/subjects/new` | Crear implicado (acceso directo alternativo) | URL |
| `/cases/:caseId/subjects/:subjectId/edit` | Editar implicado (acceso directo alternativo) | URL |
| `/cases/:caseId/subjects/:subjectId/summary` | Resumen del implicado | URL |
| `/cases/:caseId/subjects/:subjectId/assessments` | Catálogo y sesiones | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/apply` | Aplicación privada | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results` | Resultados STAI/STAIC | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-cdi` | Resultados CDI | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/cuida-pending` | CUIDA pendiente | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/cuida-entry` | Transcripción CUIDA | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-cuida` | Resultados CUIDA | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/tamai-pending` | TAMAI pendiente | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/tamai-entry` | Transcripción TAMAI | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-tamai` | Resultados TAMAI | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/pai-pending` | PAI pendiente | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/pai-entry` | Transcripción PAI | URL |
| `/cases/:caseId/subjects/:subjectId/assessments/:sessionId/results-pai` | Resultados PAI | URL |
| `/cases/:caseId/subjects/:subjectId/interviews` | Lista de entrevistas | URL |
| `/cases/:caseId/subjects/:subjectId/interviews/new` | Nueva entrevista | URL |
| `/cases/:caseId/subjects/:subjectId/interviews/:interviewId/edit` | Editar y analizar entrevista | URL |
| `/pending-tests` | Bandeja global de pruebas TEA | URL |

## 5. Pantallas de casos

### 5.1 Listado de casos — `/cases`

Componente: `case-list.component`.

#### Propósito

Es la pantalla de entrada de la psicóloga. Permite encontrar expedientes y
acceder a su detalle o informe.

#### Secciones y elementos

| Sección | Elemento | Qué representa |
|---|---|---|
| Cabecera | Título | Área de expedientes |
| Cabecera | Nuevo caso | Inicia un expediente |
| Búsqueda | Campo de búsqueda | Filtra por número, juzgado o tipo |
| Tabla | Número de caso | Identificador principal del expediente |
| Tabla | Juzgado | Órgano judicial asociado |
| Tabla | Tipo | Tipo de proceso o juicio |
| Tabla | Estado | Situación operativa del expediente |
| Tabla | Fecha de inicio | Inicio registrado del caso |
| Tabla | Acciones | Abrir, editar, informar o eliminar |
| Estado vacío | Mensaje | Indica que aún no hay casos |
| Error | Mensaje | Explica un fallo de carga o eliminación |

#### URL o modal

- Crear, editar, abrir detalle e informe: URL.
- Eliminar: modal de confirmación.
- Búsqueda: estado local; puede reflejarse en query params en el futuro.

### 5.2 Crear y editar caso

Rutas: `/cases/new` y `/cases/:caseId/edit`.

Componente: `case-form.component`.

#### Campos

| Campo | Obligación | Qué representa |
|---|---|---|
| Número de caso | Obligatorio | Identificador del expediente |
| Juzgado | Opcional | Órgano judicial |
| Jurisdicción | Opcional | Territorio o jurisdicción |
| Tipo de juicio | Opcional | Custodia, adopción u otro proceso |
| Fecha de inicio | Opcional | Inicio del expediente |
| Fecha de fin | Automática | Se completa al cerrar el caso |
| Descripción | Opcional | Contexto general del peritaje |
| Notas | Opcional | Información interna adicional |
| Estado | Técnico | Se inicia como `ACTIVE`; no debe editarse desde el formulario |

#### Decisión URL/modal

Los botones principales de crear y editar usan un modal con el formulario. Las
rutas se mantienen como acceso directo alternativo para navegación interna.

### 5.3 Detalle del caso — `/cases/:caseId`

Componente: `case-detail.component`.

#### Propósito

Es el centro operativo del expediente.

#### Secciones y elementos

| Sección | Elemento | Qué representa |
|---|---|---|
| Estado | Aviso de caso cerrado | Indica que el expediente ya no debe editarse |
| Cabecera | Número y estado | Identificación y situación del caso |
| Datos judiciales | Juzgado, jurisdicción y tipo | Contexto legal |
| Fechas | Inicio y fin | Ciclo temporal del expediente |
| Contexto | Descripción y notas | Información de apoyo |
| Implicados | Tabla de personas | Personas relacionadas con el caso |
| Implicados | Estado de pruebas | Progreso de las evaluaciones |
| Implicados | Estado de entrevistas | Progreso de las entrevistas |
| Acciones | Editar caso | Modifica datos del expediente |
| Acciones | Nuevo implicado | Añade una persona |
| Acciones | Informe final | Abre el informe del caso |

#### URL o modal

- Detalle, resumen, pruebas, entrevistas y edición: URL.
- Eliminar implicado: modal de confirmación.
- Eliminar caso: modal de confirmación.

### 5.4 Informe final del caso — `/cases/:caseId/report`

Componente: `case-report.component`.

#### Propósito

Integra los informes aprobados de los implicados en el informe pericial final
del caso.

#### Secciones y elementos

| Sección | Elemento | Qué representa |
|---|---|---|
| Cabecera | Caso y estado | Expediente y estado del informe final |
| Cabecera | Reabrir caso | Devuelve el expediente a un estado editable |
| Implicados | Nombre y tipo | Personas consideradas en el informe |
| Implicados | Estado del informe | Pendiente, borrador, revisado, aprobado o excluido |
| Implicados | Incluir/excluir | Decide si la persona participa en el informe del caso |
| Preparación | Aprobados | Informes listos para integrar |
| Preparación | Excluidos | Personas que no se incorporarán al informe |
| Preparación | Faltantes | Informes que impiden generar el caso |
| Informe | Editor de contenido | Texto pericial del caso |
| Informe | Estado | `DRAFT`, `REVIEWED`, `APPROVED` o `STALE` |
| Aprobación | Revisar | Marca el informe como revisado |
| Aprobación | Aprobar | Cierra y bloquea el caso |
| Aprobación | Reabrir | Abre nuevamente el caso con confirmación |
| Salida | Imprimir/PDF | Genera una copia presentable |

#### URL o modal

Debe mantenerse como URL. Es una pantalla de alta relevancia, con estados,
edición, generación IA y consecuencias legales.

Usar modal para:

- Confirmar inclusión o exclusión.
- Confirmar aprobación.
- Confirmar reapertura.

La edición del texto debe permanecer inline, no en modal.

## 6. Pantallas de implicados

### 6.1 Crear y editar implicado

Rutas: `/cases/:caseId/subjects/new` y
`/cases/:caseId/subjects/:subjectId/edit`.

Componente: `subject-form.component`.

#### Campos

| Campo | Obligación | Qué representa |
|---|---|---|
| Nombre | Obligatorio | Identidad del implicado |
| Apellido | Obligatorio | Identidad y presentación del implicado |
| Tipo | Obligatorio | Madre, padre, hijo, tutor u otro rol |
| Sexo | Obligatorio | Dato necesario para baremos y TEACorrige |
| Fecha de nacimiento | Obligatorio | Dato necesario para edad y baremos |
| Documento | Obligatorio | Identificación formal del expediente |
| Estado | Técnico | Se inicializa como `PENDING` |
| Teléfono | Opcional | Contacto |
| Email | Opcional | Contacto; no implica envío automático |
| Dirección | Opcional | Dato de contacto ampliado |
| Notas | Opcional | Observaciones internas |

#### URL o modal

Los botones principales de crear y editar usan un modal con el formulario. Las
rutas se mantienen como acceso directo alternativo para navegación interna.

Los datos de contacto podrían estar en una sección plegable de “Datos
adicionales”, pero no necesitan modal.

### 6.2 Resumen del implicado — `/cases/:caseId/subjects/:subjectId/summary`

Componente: `subject-summary.component`.

#### Propósito

Es la pantalla de integración de toda la información de una persona.

#### Secciones y elementos

| Sección | Elemento | Qué representa |
|---|---|---|
| Indicadores | Pruebas interpretadas | Cobertura de resultados de pruebas |
| Indicadores | Entrevistas analizadas | Cobertura de análisis de entrevistas |
| Indicadores | Consolidado de pruebas | Si existe una síntesis vigente |
| Indicadores | Consolidado de entrevistas | Si existe una síntesis vigente |
| Pruebas | Lista de interpretaciones | Evidencia narrativa disponible |
| Pruebas | Generar consolidado | Integra resultados de pruebas |
| Pruebas | Editar consolidado | Permite revisión manual |
| Entrevistas | Análisis incluidos | Entrevistas aptas para consolidar |
| Entrevistas | Entrevistas excluidas | Borradores, sin análisis u obsoletas |
| Entrevistas | Generar consolidado | Integra entrevistas vigentes |
| Informe final | Contenido | Informe pericial del implicado |
| Informe final | Fuente y estado | Distingue IA, manual, revisión y aprobación |
| Informe final | Generar/regenerar | Produce una nueva versión |
| Informe final | Revisar/aprobar | Control humano del contenido |
| Informe final | Obsoleto | Indica que cambió una fuente dependiente |
| Salida | Imprimir/PDF | Produce una copia del informe |

#### URL o modal

Debe mantenerse como URL. Es una mesa de trabajo compleja.

Usar modal para:

- Confirmar generación con una fuente ausente.
- Confirmar desbloqueo o cambio de aprobación.

Los editores de texto deben permanecer inline.

## 7. Pantallas de entrevistas

### 7.1 Lista de entrevistas — `/cases/:caseId/subjects/:subjectId/interviews`

Componente: `interview-list.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Cabecera | Implicado actual | Contexto de la lista |
| Cabecera | Nueva entrevista | Inicia una entrevista |
| Tabla | Fecha | Momento de la entrevista |
| Tabla | Estado | Borrador, completada o analizada |
| Tabla | Vista previa | Referencia rápida de la transcripción |
| Tabla | Acciones | Editar, analizar o eliminar |
| Vacío | Mensaje | No existen entrevistas |

Debe ser URL. Eliminar debe usar modal de confirmación.

### 7.2 Nueva entrevista — `/interviews/new`

Componente: `interview-form.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Identificación | Fecha | Fecha de la entrevista |
| Registro | Transcripción | Registro de lo expresado |
| Estado | Borrador/completada | Ciclo del registro |
| Acciones | Guardar borrador | Conserva trabajo incompleto |
| Acciones | Guardar y completar | Congela la transcripción para análisis |

Debe ser URL. La transcripción no debe vivir en modal.

### 7.3 Edición y análisis de entrevista

Ruta: `/cases/:caseId/subjects/:subjectId/interviews/:interviewId/edit`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Estado | Reabrir para corregir | Permite corregir una entrevista completada |
| Focos | Solicitud de extracción | Indica qué debe destacar la IA |
| Análisis | Texto generado | Interpretación por entrevista |
| Análisis | Regenerar con IA | Crea una nueva versión IA |
| Análisis | Editar manualmente | Revisión profesional |
| Análisis | `isStale` | Indica que ya no corresponde a la transcripción |

Debe ser URL por texto largo, versionado y persistencia.

Reabrir debe usar una confirmación modal. El análisis editado debe permanecer
inline.

## 8. Pantallas de pruebas

### 8.1 Catálogo y sesiones — `/assessments`

Componente: `assessment-catalog.component`.

#### Propósito

Permite seleccionar pruebas, crear una sesión para el evaluado y consultar el
estado de las pruebas aplicadas.

| Sección | Elemento | Qué representa |
|---|---|---|
| Catálogo | Tarjeta de prueba | Prueba disponible |
| Catálogo | Número de preguntas | Tamaño del instrumento |
| Catálogo | Tipo de corrección | Local o TEACorrige |
| Sesión | Código | Código entregado al evaluado |
| Sesión | URL pública | Enlace de acceso |
| Sesión | Expiración | Vigencia del enlace |
| Sesión | Pausar/reanudar | Control temporal del acceso |
| Aplicadas | Estado | Creada, en progreso, completada o calificada |
| Aplicadas | Interpretación | Indica si existe narrativa IA |
| Acciones | Aplicar | Abrir aplicación privada |
| Acciones | Ver resultados | Abrir resultados persistentes |
| Acciones | Imprimir respuestas | Crear copia de respuestas |

Debe ser URL. Generar, pausar y reanudar pueden usar modales de confirmación.

### 8.2 Aplicación privada — `/assessments/:sessionId/apply`

Componente: `assessment-apply.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Cabecera | Nombre de la prueba | Instrumento aplicado |
| Instrucciones | Texto y leyenda | Cómo responder |
| Preguntas | Opciones | Respuestas de la psicóloga o aplicador |
| Progreso | Respondidas/total | Avance del protocolo |
| Validación | Preguntas faltantes | Impide finalizar incompletamente |
| Acción | Finalizar | Guarda y dispara corrección local o flujo TEA |

Debe ser URL. Es un formulario largo y actualmente necesita mejorar su
autoguardado antes de considerar cualquier modal o drawer.

### 8.3 Resultados STAI/STAIC — `/results`

Componente: `assessment-results.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Puntuación | Total y porcentaje | Resultado directo |
| Subescalas | Estado y rasgo | Componentes de ansiedad |
| Baremo | Centil, decatipo, percentil o S | Posición normativa |
| Fuente | Local o TEA | Origen de la corrección |
| Interpretación | Texto IA | Narrativa clínica generada |
| Acciones | Generar/regenerar | Nueva versión narrativa |

Debe ser URL por ser un resultado persistente y revisable.

### 8.4 Resultados CDI — `/results-cdi`

Componente: `cdi-results.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Resultado | Total, disforia y autoestima | Puntuaciones directas |
| Baremación | PC, T y grupo normativo | Conversión normativa |
| Clasificación | Nivel total | Lectura normativa configurada |
| Ítem 9 | Alerta | Señal que requiere atención clínica |
| Advertencias | Datos faltantes o rango | Limitaciones de interpretación |
| Interpretación | Texto IA | Narrativa del CDI |

Debe ser URL. La alerta debe mostrarse inline y no como modal bloqueante.

### 8.5 Bandeja TEA — `/pending-tests`

Componente: `pending-assessments.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Introducción | Descripción | Explica el trabajo pendiente |
| Resumen | Total | Cantidad de pruebas sin resultados TEA |
| Resumen | Seleccionadas | Cantidad preparada para exportar |
| Filtros | Búsqueda | Filtra por persona, caso o prueba |
| Filtros | Tipo | Filtra CUIDA, TAMAI o PAI |
| Tabla | Prueba | Instrumento pendiente |
| Tabla | Implicado | Persona a la que pertenece |
| Tabla | Caso | Expediente de origen |
| Tabla | Respuestas | Cantidad y validez del protocolo |
| Acciones | Descargar | Genera XML agrupado |
| Acciones | Ingresar resultados | Abre formulario de transcripción |
| Acciones | Ver caso | Regresa al contexto del expediente |

Debe ser URL porque es una bandeja de trabajo global.

### 8.6 CUIDA, TAMAI y PAI pendientes

Rutas: `cuida-pending`, `tamai-pending` y `pai-pending`.

Estas pantallas explican el proceso externo:

```text
Respuestas -> XML -> TEACorrige -> Resultados -> Formulario -> Interpretación
```

| Elemento | Qué representa | Tipo |
|---|---|---|
| Explicación | Instrucciones de uso | Contenido inline |
| Descargar XML | Exportación de respuestas | Acción |
| Nombre XML | Identificador utilizado por TEA | Modal breve |
| Transcribir resultados | Entrada al formulario TEA | URL |
| Volver a pruebas | Regreso al catálogo | URL |
| Ir al caso | Regreso al expediente | URL |

La pantalla pendiente debe seguir siendo URL. El nombre del XML está bien
resuelto como modal porque es una interacción breve.

### 8.7 Formularios CUIDA, TAMAI y PAI

Rutas: `cuida-entry`, `tamai-entry` y `pai-entry`.

Estos formularios deben seguir como URLs.

| Prueba | Secciones principales | Qué representa |
|---|---|---|
| CUIDA | Baremo, escalas, cuidado, deseabilidad, validez e ítems críticos | Perfil transcrito desde TEACorrige |
| TAMAI | Nivel, baremo y árbol de escalas | Puntuaciones PD y PC transcritas |
| PAI | Validez, clínicas, tratamiento, interpersonales, índices e ítems | Puntuaciones PD y T transcritas |

La confirmación antes de guardar puede convertirse en modal accesible. El
formulario completo no debe convertirse en modal.

### 8.8 Resultados CUIDA, TAMAI y PAI

Rutas: `results-cuida`, `results-tamai` y `results-pai`.

Estas pantallas muestran los perfiles corregidos, advertencias, hallazgos,
riesgos e interpretación IA.

Debe mantenerse una URL por cada resultado porque:

- se revisa después;
- puede tener varias versiones;
- alimenta consolidados;
- puede quedar obsoleto;
- debe poder imprimirse o consultarse de forma independiente.

## 9. Pantallas públicas del evaluado

### 9.1 Portal de acceso — `/evaluate`

Componente: `eval-portal.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Acceso | Código de seis dígitos | Identifica la sesión temporal |
| Sesión | Nombre del evaluado | Confirma el expediente correcto |
| Pruebas | Tarjetas de tests | Pruebas autorizadas |
| Pruebas | Estado | Pendiente, en progreso o completada |
| Pruebas | Continuar | Reanuda una prueba |
| Cierre | Finalizar todas | Cierra la sesión completa |

La validación del código puede permanecer en la misma URL. Las pruebas y la
confirmación final necesitan URLs independientes.

### 9.2 Aplicación pública — `/evaluate/test/:sessionId`

Componente: `eval-test.component`.

| Sección | Elemento | Qué representa |
|---|---|---|
| Instrucciones | Texto global o por sección | Instrucciones del instrumento |
| Preguntas | Opciones de respuesta | Protocolo contestado |
| Condicionales | Puertas Sí/No | Determinan preguntas aplicables |
| Navegación | Anterior/siguiente | Recorrido del cuestionario |
| Progreso | Página o sección | Avance del evaluado |
| Autosave | Guardado silencioso | Recuperación ante salida o cierre |
| Envío | Finalizar | Completa y corrige server-side |

Debe ser URL obligatoria. Convertirla en modal dañaría autosave, recuperación,
navegación móvil y accesibilidad.

### 9.3 Confirmación final — `/evaluate/thanks`

Representa que la sesión se cerró correctamente. Debe seguir siendo una URL
para evitar reenvíos accidentales y ofrecer un estado final claro.

## 10. Modales recomendados

### 10.1 Sustituir `confirm()` nativo

Conviene crear un componente modal común para estas acciones:

| Acción | Motivo del modal |
|---|---|
| Eliminar caso | Acción destructiva |
| Eliminar implicado | Acción destructiva |
| Eliminar entrevista | Acción destructiva |
| Excluir implicado | Decisión con impacto pericial |
| Incluir implicado | Cambia la composición del informe |
| Aprobar informe | Bloquea el caso |
| Reabrir caso | Revierte el cierre |
| Reabrir entrevista | Invalida análisis derivados |
| Regenerar IA | Sustituye una versión narrativa |
| Guardar transcripción TEA | Confirma una corrección externa |

El modal debe incluir título, consecuencia, cancelar y acción principal. Las
acciones de impacto pericial deben incluir una explicación explícita.

### 10.2 Modales que ya tienen sentido

Los modales de nombre XML en CUIDA, TAMAI y PAI son adecuados porque solo
solicitan un dato breve antes de descargar.

### 10.3 No convertir en modal

No deben convertirse en modal:

- Aplicación de cuestionarios.
- Transcripciones TEA completas.
- Entrevistas.
- Resultados.
- Consolidados.
- Informes.
- Portal público del evaluado.

## 11. Procesos principales

### 11.1 Crear expediente

```text
Crear caso
  -> Añadir implicado
    -> Completar datos operativos
      -> Seleccionar pruebas
        -> Aplicar o enviar al evaluado
```

### 11.2 Aplicar prueba local

```text
Catálogo
  -> Aplicar
    -> Responder
      -> Finalizar
        -> Scoring local/server-side
          -> Resultados
            -> Interpretación IA
```

### 11.3 Corrección TEA

```text
Catálogo o bandeja global
  -> Prueba completada
    -> Descargar XML
      -> TEACorrige
        -> Transcribir resultados
          -> Interpretación
            -> Consolidado
```

### 11.4 Entrevista

```text
Nueva entrevista
  -> Borrador
    -> Completar transcripción
      -> Analizar con IA
        -> Revisar manualmente
          -> Consolidar entrevistas
```

Si se reabre o modifica una fuente, los análisis y consolidados dependientes
deben marcarse como obsoletos.

### 11.5 Informe del implicado

```text
Interpretaciones de pruebas + consolidado de entrevistas
  -> Informe del implicado
    -> Borrador
      -> Revisado
        -> Aprobado
```

El informe puede generarse con un solo consolidado, pero debe dejar constancia
de la fuente ausente.

### 11.6 Informe del caso

```text
Informes de implicados aprobados o excluidos
  -> Informe del caso
    -> Revisado
      -> Aprobado
        -> Caso completado y bloqueado
```

## 12. Recomendaciones UX pendientes

### Prioridad alta

- Añadir `CanDeactivate` a entrevistas, pruebas, transcripciones y editores de informes.
- Reemplazar `confirm()` por un modal accesible y consistente.
- Validar en backend el bloqueo de casos cerrados.
- Validar que `caseId`, `subjectId` y `sessionId` pertenecen a la misma cadena.
- Mantener la bandeja TEA como una URL global.

### Prioridad media

- Añadir autosave a la aplicación privada de pruebas.
- Mostrar un contador de pruebas pendientes en la navegación global.
- Hacer que los filtros de la bandeja puedan reflejarse en query params.
- Añadir vista rápida tipo drawer para datos breves de caso o implicado.
- Mostrar historial de versiones de informes.

### Prioridad baja

- Añadir un motivo obligatorio al excluir implicados.
- Añadir audit log visible para acciones periciales.
- Añadir pruebas end-to-end de rutas y estados de navegación.
- Permitir restaurar borradores desde el listado.

## 13. Decisión final URL/modal

| Tipo de proceso | Decisión |
|---|---|
| Listados | URL |
| Detalles de caso e implicado | URL |
| Formularios de caso e implicado | URL |
| Aplicación de pruebas | URL |
| Entrevistas y transcripciones | URL |
| Correcciones CUIDA/TAMAI/PAI | URL |
| Resultados e informes | URL |
| Evaluación pública | URL |
| Bandeja de pendientes TEA | URL |
| Confirmaciones destructivas | Modal |
| Confirmaciones de aprobación/reapertura | Modal |
| Nombre de archivo XML | Modal |
| Vista rápida de información | Drawer o modal |
| Edición de texto largo | Inline dentro de una URL |

## 14. Referencias de implementación

| Área | Archivos principales |
|---|---|
| Rutas | `src/app/app.routes.ts` |
| Shell | `src/app/app.component.*` |
| Breadcrumb | `src/app/core/components/breadcrumb/*` |
| Casos | `src/app/features/cases/components/*` |
| Implicados | `src/app/features/subjects/components/*` |
| Pruebas | `src/app/features/assessments/components/*` |
| Entrevistas | `src/app/features/interviews/components/*` |
| Evaluación pública | `src/app/features/evaluation/components/*` |
| Bandeja TEA | `src/app/features/assessments/components/pending-assessments/*` |
| Informes | `src/app/features/subjects/services/subject-report.service.ts` y componentes de resumen/caso |
| Modelo backend | `amplify/data/resource.ts` |
