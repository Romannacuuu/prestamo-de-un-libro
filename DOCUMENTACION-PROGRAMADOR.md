# Documentación del programador

Esta carpeta es el trabajo de quien programa. La pantalla publicada es la de Angular y Firebase. Más abajo queda la versión anterior, con Docker, por si hay que mostrarla en local.

Los documentos del cliente no están en este repositorio.

Pantalla publicada: https://prestamo-principito-rom.web.app

| Documento | Para qué |
|---|---|
| `INSTRUCTIVO.md` | Cómo se usa la pantalla y el recorrido de la demo |
| `SOLUCION.md` | Cómo se resolvió la última copia |
| Este archivo | Herramientas, piezas y cómo está armado el código |

## Herramientas

La solución que está en internet usa estas:

| Herramienta | Versión | Para qué |
|---|---|---|
| Angular | 19.2 | La pantalla. Componentes standalone, formularios y el control `@if` / `@for`. |
| TypeScript | 5.7 | El lenguaje de la pantalla. |
| Angular CLI | 19.2 | Crear el proyecto y generar `frontend/dist`. |
| CSS | — | El diseño. En el celular los botones ocupan el ancho; desde 800 px el ingreso queda en dos columnas. |
| Firebase Authentication | — | Ingreso con correo y contraseña. La sesión queda en la pestaña. |
| Cloud Firestore | — | Usuarios, las 5 copias, los préstamos y el panel del administrador. La última copia se resuelve con una transacción. |
| Firebase Hosting | — | Publica la pantalla ya compilada. |
| Firebase CLI (`firebase-tools`) | — | Sube la pantalla, las reglas de Firestore y activa el ingreso con correo. |
| Node.js y npm | Node 24 en la máquina de desarrollo | Instala Angular y Firebase y corre el build. |
| SVG | — | El logo del libro, en `frontend/public/logo-libro.svg`. |

El proyecto de Firebase se llama `prestamo-principito-rom`. El plan es el gratuito. Por eso no hay Cloud Functions: ese servicio pide el plan de pago. La transacción y las reglas de seguridad alcanzan.

La versión anterior, que no está publicada, usa estas:

| Herramienta | Versión | Para qué |
|---|---|---|
| Python | 3.12 | La API y la pantalla local. |
| FastAPI | 0.115 | Las rutas. |
| Uvicorn | 0.34 | El servidor. |
| PostgreSQL | 16 | Usuarios, copias, préstamos y sesiones. |
| psycopg | 3.2 | El acceso a PostgreSQL, con `SELECT … FOR UPDATE`. |
| Docker y Docker Compose | — | Un comando levanta la base y la API. |
| HTML, CSS y JavaScript | — | La pantalla de esa versión, en `web/`. |

## Cómo está armado

```
frontend/                  pantalla Angular
  src/app/app.component.*  lo que se ve: visitante, cliente o administrador
  src/app/biblioteca.service.ts
                             crear cuenta, entrar, pedir y devolver
  src/app/firebase.ts        conexión con el proyecto de Firebase
  public/logo-libro.svg      el logo
firestore.rules              quién puede leer y escribir
firestore.indexes.json       la consulta del préstamo activo de cada cliente
firebase.json                qué se publica: pantalla, reglas e ingreso
.firebaserc                  el proyecto prestamo-principito-rom

app/                       versión anterior, la API en Python
web/                       pantalla de esa versión
docker-compose.yml         base y API en local
pruebas/recorrer.py        recorrido automático de esa versión
```

Hay un solo libro, El principito, con 5 copias. El sistema asigna la copia libre de número más bajo. Un cliente tiene como mucho un préstamo activo. Devolver no borra el préstamo: lo pasa a devuelto. El administrador no puede pedir. Un cliente no puede usar las acciones del administrador.

Las cuentas de ejemplo son Ana, Luis y Admin. **Crear cuenta** agrega otro cliente. Nadie se registra como administrador.

## La última copia

Las cinco copias están en un solo documento de Firestore, `biblioteca/stock`, campos `c1` a `c5`. Pedir abre una transacción: lee al usuario y ese documento, elige la libre más baja y escribe juntos el stock, el usuario, el préstamo y la ficha del panel. Si dos personas escriben ese documento a la vez, Firestore confirma una y vuelve a ejecutar la otra. El detalle, con el orden de las lecturas y las escrituras, está en `SOLUCION.md`.

En la versión de PostgreSQL la misma idea está en `pedir`, dentro de `app/datos.py`, con `SELECT … FOR UPDATE`. No hay una cola que atienda de a uno.

## Publicar de nuevo la pantalla

En `frontend`:

```powershell
npm install
npx ng build
```

En la raíz de esta carpeta, con la sesión de Firebase ya iniciada:

```powershell
npx firebase-tools deploy --only "firestore,hosting" --project prestamo-principito-rom
```

El ingreso con correo ya está activo. Si hubiera que volver a declararlo, en `firebase.json` está `auth.providers.emailPassword` y se publica con `firebase deploy --only auth`.

## Versión local con Docker

```powershell
docker compose up --build
```

Pantalla: http://localhost:8090. API: http://localhost:8000. El puerto 8080 no se usa porque en la máquina de desarrollo ya lo ocupa otro programa.
