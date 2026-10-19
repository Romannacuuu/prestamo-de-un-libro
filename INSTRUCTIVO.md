# Instructivo — Préstamo de un libro

No hay que instalar nada. La pantalla ya está en internet y anda en el celular.

## Dirección

https://prestamo-principito-rom.web.app

Abrila en el navegador. En el teléfono se acomoda sola: los botones ocupan el ancho y cada dato del administrador lleva su etiqueta.

## Cuentas de ejemplo

La primera vez que alguien abre la página, se crean solas. Si ya existen, no se pisan.

| Nombre | Correo | Contraseña | Rol |
|---|---|---|---|
| Ana | ana@biblioteca.local | ana123 | Cliente |
| Luis | luis@biblioteca.local | luis123 | Cliente |
| Admin | admin@biblioteca.local | admin123 | Administrador |

También se pueden crear más cuentas con **Crear cuenta**. La cuenta nueva siempre es de cliente. La contraseña tiene que tener al menos 6 caracteres.

## Sesión

Cada pestaña tiene su propia sesión. Para probar a Ana y a Luis juntos, abrí **otra pestaña** e ingresá con la otra cuenta. Cerrar sesión en una no cierra la otra.

## Pantalla

- **Visitante:** crear cuenta, ingresar y ver las tres cuentas de ejemplo.
- **Cliente:** título, autor, copias totales, copias libres y **Pedir**. Si tiene una copia: el número, la fecha y **Devolver**.
- **Administrador:** las 5 copias, los préstamos activos, el historial de devueltos y un botón para devolver uno. No hay botón para pedirse un libro.

## Recorrido de la demo

1. Entrá a la dirección y registrá un cliente nuevo.
2. En una pestaña entrá como Ana. En otra, como Luis. Los dos ven 5 libres.
3. Cada uno aprieta **Pedir**. Quedan 3 libres y dos números de copia distintos. El sistema asigna la libre de número más bajo.
4. Ana aprieta **Pedir** otra vez. El aviso es *Ya tenés una copia. Devolvela antes de pedir otra.* Las libres no cambian.
5. Ana aprieta **Devolver**. El aviso es *Devolviste la copia número X.* Esa copia vuelve a libre y el préstamo queda en el historial: no se borra.
6. Dejá 1 sola copia libre (el resto prestada, con cuentas distintas). Ana y Luis, cada uno en su pestaña, aprietan **Pedir** al mismo tiempo. Solo uno la obtiene. El otro ve *No hay copias libres.*
7. Entrá como Admin. Se ven las 5 copias, el préstamo activo y los devueltos. **Devolver** registra la devolución de ese activo. Admin no tiene **Pedir**.
8. **Salir** en la pestaña de Ana. Esa pestaña vuelve a la entrada. La de Luis sigue adentro.

Los usuarios y los préstamos quedan guardados en Firebase. Si se cierra el navegador y se vuelve a entrar, siguen.

## Versión anterior, con Docker

En esta misma carpeta está la primera solución, con PostgreSQL. No es la que está publicada.

```powershell
docker compose up --build
```

Pantalla local: http://localhost:8090. En esta máquina el 8080 ya lo usa otro programa, por eso quedó el 8090. Para vaciar esa base local: `docker compose down -v`.
