# Cobertura

La cobertura no es la nota. Sirve para ver qué conducta quedó sin ejemplo.

## Qué está cubierto

- Reglas puras, en Python y en TypeScript: copia más baja, sin stock, ya tiene préstamo, registro incompleto, clave de 5 y de 6 caracteres, hash.
- API en memoria: alta, sesión, libro, pedir, devolver, roles, token vencido y dos pedidos juntos sobre la última copia.
- Escenarios Gherkin de las ocho historias, felices y de error.
- Pantalla Angular: visitante, cliente y administrador, con los botones que cada rol puede ver.
- Recorrido de navegador: crear cuenta, ver _El principito_, pedir y devolver.
- Recorrido de la API con PostgreSQL: `python pruebas/recorrer.py`, con la base levantada. En el pipeline corre con `PROBAR_REINICIO=0` porque ahí no hay Docker para reiniciar el contenedor. En la máquina, con `docker compose up`, el mismo script también prueba que el historial sigue después del reinicio.

## Qué queda afuera, y por qué

- La transacción `SELECT … FOR UPDATE` no entra en el porcentaje de `pytest --cov`. Eso lo ejerce `pruebas/recorrer.py` contra PostgreSQL. Un unitario que simule el candado de la base repetiría el test de la última copia sin probar el motor.
- Las reglas de Firestore y la transacción de `biblioteca.service.ts` no están en esta suite. La pantalla publicada las usa, y el componente se prueba con el servicio reemplazado para no pegarle a Firebase desde la prueba.
- No hay un porcentaje obligatorio. Perseguir el 100 % de `datos.py` metería la base en cada ejemplo y haría la suite lenta sin cubrir una regla nueva.

## Deuda aceptada

Dos APIs implementan el mismo contrato: Python en el contenedor y TypeScript en la suite. Si una regla cambia, hay que tocarla en `app/reglas.py` y en `src/domain/reglas.ts`, y los dos juegos de pruebas tienen que fallar juntos. Está aceptado para no reescribir la entrega que ya ve el cliente.

La última corrida de `npm run test:coverage` midió, sobre la API de TypeScript, 90 % de líneas, 86 % de ramas y 97 % de funciones. El pipeline lo deja en rojo si baja de 85 % de líneas o de 70 % de ramas.
