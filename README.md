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
