# Cómo se resolvió

El cliente pidió el resultado. Esta nota dice cómo quedó la pantalla publicada y, sobre todo, cómo se resuelve el caso de la última copia.

## Lectura de un minuto

La pantalla es Angular y está en https://prestamo-de-un-libro.web.app. Los datos están en Firestore, en el proyecto `prestamo-principito-rom`. El ingreso es el de Firebase, con correo y contraseña. No hay un servidor propio: el plan gratuito de Firebase no incluye Cloud Functions, así que la regla de la última copia corre como una transacción de la base, en el documento donde están las cinco copias.

La pantalla no decide el número de copia. Pide la transacción, y la base acepta una sola escritura de ese documento. Si Ana y Luis aprietan **Pedir** juntos sobre la última copia, uno confirma y el otro se vuelve a ejecutar cuando el primero ya guardó. El segundo ve que no queda ninguna libre.

## Piezas

| Pieza | Para qué |
|---|---|
| `frontend/` | Pantalla Angular. Visitante, cliente o administrador. En el celular los botones son anchos y cada dato tiene su etiqueta. |
| `frontend/src/app/biblioteca.service.ts` | Crear cuenta, entrar, pedir y devolver. Ahí está la transacción. |
| `firestore.rules` | Quién puede leer y escribir. Un cliente no lee los préstamos de otro. El administrador no puede crear un préstamo. |
| `firebase.json` | Publica la pantalla, las reglas y el ingreso con correo y contraseña. |
| Firestore | Usuarios, el stock de las 5 copias, los préstamos y el panel del administrador. |

Las cuentas de ejemplo se crean la primera vez que se abre la página. **Crear cuenta** agrega otro cliente. Nadie se registra como administrador: esa cuenta es solo `admin@biblioteca.local`.

Crear una cuenta usa una sesión aparte, en memoria, para no sacar de la pestaña a quien ya había entrado.

## Dónde está cada historia

| Historia | Dónde |
|---|---|
| 1. Crear cuenta | `registrar` en `biblioteca.service.ts` |
| 2. Entrar y salir | `ingresar` y `salir`. La sesión vive en la pestaña. |
| 3. Ver el libro | La pantalla escucha el documento `biblioteca/stock`. |
| 4. Pedir, incluida la última copia | `pedir`, una transacción sobre ese documento. |
| 5. Devolver | `devolverMio`. El préstamo pasa a devuelto. |
| 6. Administrador | Lee la colección `panel` y devuelve con `devolverAdmin`. |

Ocultar un botón no alcanza. Las reglas rechazan un préstamo si quien escribe no es cliente, y rechazan el panel si quien lee no es administrador. El mensaje es *No podés hacer esta acción.*

## La última copia

Las cinco copias no son cinco documentos. Son cinco campos de uno solo: `biblioteca/stock`, con `c1` … `c5` en `libre` o `prestada`. Pedir escribe un solo campo, de `libre` a `prestada`. Las reglas exigen que los otros cuatro queden igual. Así no se pueden marcar dos copias en el mismo pedido.

`pedir` abre una transacción y, en este orden:

1. Lee al usuario. Si ya tiene `prestamoActivoId`, corta con *Ya tenés una copia. Devolvela antes de pedir otra.*
2. Lee `biblioteca/stock` y elige el número más bajo que esté `libre`. Si no hay, corta con *No hay copias libres.*
3. En la misma transacción escribe las cuatro cosas: esa copia pasa a `prestada`, el usuario queda con el id del préstamo, y se crean el préstamo y la ficha del panel.

Firestore no hace fila con todos los pedidos. Si dos transacciones tocan `biblioteca/stock` a la vez, una confirma y la otra se vuelve a correr desde el paso 1, ya con el documento nuevo. La copia que se llevó el primero ya no está libre. Si era la última, el segundo recibe *No hay copias libres.* y no escribe nada.

El cliente no elige el número. Lo elige el paso 2.

Al devolver se hace la misma clase de transacción al revés: esa copia vuelve a `libre`, el usuario queda sin préstamo activo, y el préstamo y el panel pasan a `devuelto` con la fecha. No se borra el préstamo.

## Sesión, rol y contraseña

La sesión de Firebase queda en la pestaña (`browserSessionPersistence`). Otra pestaña entra de cero. Por eso Ana y Luis pueden estar los dos adentro.

Firebase guarda la contraseña. En Firestore solo están el nombre, el correo, el rol y el préstamo activo. Un correo o una contraseña que no coinciden responden *Correo o contraseña incorrectos.*

El rol se lee del documento del usuario. La pantalla de administrador no tiene **Pedir**, y las reglas tampoco dejan crear un préstamo si el rol no es cliente.

## Qué no hicimos

No hay un candado en el navegador que atienda de a uno. Las dos pestañas disparan su transacción al mismo tiempo y compiten por el mismo documento.

Tampoco se publicaron Cloud Functions. Ese servicio pide el plan de pago. La transacción y las reglas alcanzan para el pedido, en el plan gratuito.

## Versión anterior

Antes de publicarla, la misma regla se escribió con PostgreSQL: `SELECT … FOR UPDATE` sobre la fila del usuario y sobre la copia libre más baja, en `app/datos.py`. Sigue en el repositorio, con Docker. La que se muestra es la de Firebase, porque es la que está en la dirección de arriba.

## Mapa de archivos

```
frontend/                  pantalla Angular
firestore.rules            permisos de la base
firestore.indexes.json     consulta del préstamo activo de cada cliente
firebase.json              publicación: pantalla, reglas e ingreso
INSTRUCTIVO.md             cómo se usa la dirección publicada
docker-compose.yml         versión anterior, local
app/datos.py               la transacción de esa versión anterior
```
