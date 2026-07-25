# pruebas-ps

Aplicacion Angular para gestionar peritajes psicologicos forenses. El flujo principal es:

`Caso -> implicados -> entrevistas/pruebas -> informes -> informe del caso`

## Stack

- Angular 19 con componentes standalone y lazy loading.
- AWS Amplify Gen 2: Cognito, AppSync, DynamoDB y Lambdas.
- Correccion automatica: STAI/STAIC y CDI.
- Correccion externa en TEACorrige: CUIDA, TAMAI y PAI.

## Desarrollo local

```bash
npm install
npm start
```

La aplicacion queda disponible en `http://localhost:4200/`.

Para trabajar contra el sandbox Amplify configurado:

```bash
npx ampx sandbox --once
```

El sandbox actual es `amplify-peritajesapp-Marke-sandbox-646fa0ab84`, en `us-east-1`. No incluir credenciales ni secrets en el repositorio.

## Rutas principales

- `/cases`: zona autenticada para la psicologa.
- `/pending-tests`: bandeja global de CUIDA, TAMAI y PAI pendientes de TEACorrige.
- `/evaluate`: portal publico para que el evaluado complete una prueba mediante codigo.
- `/cases/:caseId/subjects/:subjectId/assessments`: catalogo y resultados de pruebas.
- `/cases/:caseId/report`: informe del caso.

## Correccion TEA

Las pruebas CUIDA, TAMAI y PAI se exportan como XML agrupados por tipo desde la bandeja `/pending-tests`. Tras corregirlos en TEACorrige, los resultados se transcriben en los formularios `cuida-entry`, `tamai-entry` y `pai-entry`.

CUIDA debe conservar exactamente 189 items. El item 189 oficial es:

> Con la cantidad de niños que necesitan un hogar es absurdo traer un hijo al mundo.

## Comandos de verificacion

```bash
npm run build
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run validate:baremos
```

Los tests se ejecutan con Karma:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

Actualmente Karma/ChromeHeadless puede no finalizar en este entorno. Las validaciones de runtime pendientes estan documentadas en `MEMORIA-pruebas-ps.md` y `docs/arquitectura-ui-y-flujos.md`.

## Documentacion

- `docs/arquitectura-ui-y-flujos.md`: inventario de pantallas, rutas, procesos y decisiones URL/modal.
- `docs/superpowers/specs/`: especificaciones de features.
- `docs/superpowers/plans/`: planes de implementacion.
- `MEMORIA-pruebas-ps.md`: memoria portable del proyecto, fuera del repositorio.
