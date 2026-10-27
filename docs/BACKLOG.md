# Backlog

Historias del préstamo de _El principito_. Cada una cabe en una iteración y se acepta solo si pasan sus escenarios de `features/`.

Definición de listo: la historia está en este formato, tiene criterios observables y el equipo puede estimarla.

Definición de terminado: hay escenario feliz y escenario de error, las pruebas de esa historia pasan, el rol se controla en el servidor y el pipeline queda en verde.

## Funcionales

| Id  | Historia                                                                                          | Criterios                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1 | Como visitante, quiero registrarme con nombre, correo y contraseña para poder pedir un libro.     | Correo nuevo crea un cliente. Correo repetido avisa y no duplica. Faltan datos no crea nada. Contraseña de menos de 6 caracteres se rechaza. La contraseña no vuelve en la respuesta. |
| US2 | Como usuario, quiero abrir y cerrar sesión para que nadie use mi cuenta.                          | Clave mal y correo inexistente dicen lo mismo. Cerrar sesión invalida ese token. La sesión de otra persona sigue.                                                                     |
| US3 | Como cliente, quiero ver el título y las copias libres para saber si puedo pedir.                 | Se ve _El principito_ y 5 copias. Sin sesión no se muestra.                                                                                                                           |
| US4 | Como cliente, quiero pedir una copia si hay stock para llevarme el libro.                         | Asigna la libre de número más bajo. Un segundo préstamo se rechaza. Sin stock no crea nada. Dos pedidos juntos sobre la última copia: solo uno gana.                                  |
| US5 | Como cliente, quiero devolver mi copia para que vuelva al estante.                                | La copia queda libre y el préstamo queda devuelto, con fecha. Sin préstamo no hace nada. Una persona no devuelve lo de otra.                                                          |
| US6 | Como administrador, quiero ver las copias y registrar una devolución para conocer el estado real. | Ve las 5 copias, activos e historial. Puede devolver un activo. No puede pedir. Un cliente no entra a esa vista.                                                                      |

## Técnicas

| Id  | Historia                                                                                                                                  | Criterios                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| US7 | Como auditor de seguridad, quiero que las contraseñas se guarden con hash y sal para que una copia de la base no muestre las claves.      | El alta no devuelve la contraseña. El almacén no contiene el texto plano.                 |
| US8 | Como auditor de seguridad, quiero que ocultar un botón no sea la única barrera para que un cliente no use las acciones del administrador. | `GET /prestamos` con token de cliente responde 403. El administrador no usa `GET /libro`. |

## Objetivo de esta iteración

Dejar las ocho historias con pruebas automáticas y un pipeline que las ejecute en cada push. La pantalla publicada y el contenedor del cliente no cambian de dirección.
