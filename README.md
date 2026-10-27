# Préstamo de un libro

Trabajo del programador. La pantalla publicada está en https://prestamo-de-un-libro.web.app.

| Documento | Contenido |
|---|---|
| `DOCUMENTACION-PROGRAMADOR.md` | Herramientas, estructura y cómo está armado |
| `INSTRUCTIVO.md` | Cómo se usa y el recorrido de la demo |
| `SOLUCION.md` | Cómo se resolvió la última copia |

Es Angular, con Firebase Authentication, Cloud Firestore y Firebase Hosting. Sirve en el celular y en la computadora. Hay tres cuentas de ejemplo y se pueden crear más clientes.

La versión anterior, con Python, FastAPI, PostgreSQL y Docker, sigue en esta carpeta. Se levanta con `docker compose up --build`. La pantalla local queda en http://localhost:8090 y la API en http://localhost:8000.

## Endpoints

La pantalla publicada no expone estas rutas: habla directo con Firebase. Los endpoints están en la versión con Docker, en `app/main.py`. Con la API levantada se ven y se prueban en http://localhost:8000/docs.

Para una ruta con sesión, primero `POST /sesion`. La respuesta trae un token. En el resto se manda `Authorization: Bearer <token>`. En `/docs`, el botón **Authorize** lo guarda para las pruebas.

| Quién | Método | Ruta | Qué hace |
|---|---|---|---|
| Cualquiera | POST | `/registro` | Crea un cliente |
| Cualquiera | POST | `/sesion` | Entra y devuelve el token |
| Con sesión | DELETE | `/sesion` | Cierra la sesión |
| Cliente | GET | `/libro` | Título, autor y copias libres |
| Cliente | POST | `/prestamos` | Pide la copia libre de número más bajo |
| Cliente | GET | `/prestamos/mio` | Ve su préstamo activo |
| Cliente | POST | `/prestamos/mio/devolucion` | Devuelve su copia |
| Administrador | GET | `/copias` | Ve las cinco copias |
| Administrador | GET | `/prestamos` | Activos e historial |
| Administrador | POST | `/prestamos/{id}/devolucion` | Devuelve un préstamo activo |

`GET /` responde que la API está en marcha. El administrador no puede pedir. Un cliente no puede usar las rutas del administrador.

## Pruebas

La pantalla publicada y el contenedor no cambian. Lo que se sumó es la evidencia de la cátedra: historias, Cucumber, pruebas de la pantalla y el pipeline.

| Documento | Para qué |
|---|---|
| `docs/BACKLOG.md` | Ocho historias, criterios y definición de terminado |
| `docs/XP.md` | Capas, pareja, retrospectiva y el cambio de la contraseña corta |
| `docs/CICLO-TDD.md` | Cómo se armó cada ejemplo |
| `docs/COBERTURA.md` | Qué cubre la suite y qué deuda queda |

Desde la raíz, con Node 20:

```powershell
npm ci
npm test
npm run test:coverage
npx playwright install chromium
npm run test:browser
```

`npm test` corre las reglas y Cucumber contra la API en memoria. No usa el puerto 8000. `npm run test:browser` sí lo usa, junto con el 8090, para abrir la pantalla de `web/` y recorrer crear cuenta, pedir y devolver. No lo corras con el contenedor levantado: los dos quieren el 8000.

Python, sin base:

```powershell
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

Con el contenedor arriba, el recorrido completo sigue siendo `python pruebas/recorrer.py`.

La pantalla Angular:

```powershell
Set-Location frontend
npm ci
npx ng test --watch=false --browsers=ChromeHeadless
```

El pipeline está en `.github/workflows/ci.yml`. En cada push corre la compilación, el lint, el formato, Cucumber, la cobertura, pytest, el recorrido contra PostgreSQL, las pruebas de Angular y el recorrido del navegador.

Una contraseña nueva de menos de 6 caracteres se rechaza en la API y en la pantalla. El texto es *La contraseña tiene que tener al menos 6 caracteres.*

Para armar esta evidencia se usó un asistente en el editor. Las reglas, los mensajes y la decisión de mantener Firebase y el contenedor Python son del equipo, y hay que poder explicarlas en la defensa.
