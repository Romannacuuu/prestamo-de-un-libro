# Ciclo de las pruebas nuevas

El historial anterior del repositorio no muestra rojo, verde y refactor: son tres commits de la entrega. Esta nota reconstruye el ciclo de lo que se sumó, para poder explicarlo en la defensa. No reemplaza commits chicos de acá en adelante.

| Conducta                 | Rojo                                                          | Verde                                                                          | Refactor                                                            |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Elegir la copia más baja | Un ejemplo con `[3, 1, 5]` no tenía función.                  | `numero_a_prestar` devuelve 1.                                                 | La misma función la llama la transacción de `pedir`.                |
| Sin stock                | La lista vacía no tenía rechazo.                              | Lanza _No hay copias libres._                                                  | El mensaje vive en `mensajes.py` y en `src/domain/mensajes.ts`.     |
| Ya tiene una copia       | Con stock y un activo, no había corte.                        | Lanza el mensaje de devolver antes de pedir otra.                              | Se evalúa antes de elegir número.                                   |
| Registro incompleto      | Nombre, correo o clave vacíos no cortaban en un solo lugar.   | `validar_registro` rechaza los tres.                                           | También recorta y pasa el correo a minúsculas.                      |
| Clave corta              | Cinco caracteres creaban cuenta en la API.                    | Seis entran y cinco responden el mensaje de la pantalla.                       | El recorrido de Docker afirma el mismo texto.                       |
| Hash                     | La clave podía compararse con el texto guardado.              | `hash_clave` no contiene la clave y `verificar_clave` la reconoce.             | El ingreso incorrecto no dice si falló el correo o la clave.        |
| Última copia             | Dos pedidos paralelos podían confirmar los dos.               | La cadena de la API de pruebas y el `FOR UPDATE` de PostgreSQL dejan uno solo. | El perdedor ve _No hay copias libres._ y el contador queda en 0.    |
| Rol                      | Un cliente podía llamar la ruta de admin si adivinaba la URL. | La ruta responde 403 con _No podés hacer esta acción._                         | El administrador tampoco pide ni ve el libro del cliente.           |
| Pantalla                 | No había prueba de lo que se ve.                              | El visitante no tiene Pedir. El cliente sí. El administrador no.               | El recorrido de Playwright pasa por crear cuenta, pedir y devolver. |
