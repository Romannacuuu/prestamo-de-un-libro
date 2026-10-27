# Prácticas XP

## Definition of Done

Una historia está terminada cuando:

1. Está escrita en `docs/BACKLOG.md` como "como / quiero / para".
2. Tiene un archivo `.feature` con camino feliz y caso de error o de límite.
3. Los pasos de Cucumber y las pruebas unitarias pasan.
4. El código de producción que usa la regla está en `app/reglas.py` o en `src/domain/reglas.ts`, y la API solo lo llama.
5. `npm run build`, `npm run lint`, `npm run format:check` y `pytest` pasan.
6. El pipeline de `.github/workflows/ci.yml` queda en verde.

## Diseño simple

Hay un solo libro y cinco copias. La pantalla no elige el número: lo elige `numero_a_prestar` / `numeroAPrestar`, la libre más baja. No hay lista de espera, multas ni más roles.

La última copia no se resuelve con una cola de a uno en el servidor de Python. La transacción de PostgreSQL bloquea las copias libres y llama a la misma función que prueban los tests. En la suite de TypeScript, los pedidos concurrentes entran a una cadena para que dos `POST /prestamos` no confirmen la misma copia. Las dos implementaciones rechazan al segundo con _No hay copias libres._

## Capas de la API de pruebas

```text
features/                         historias en Gherkin
tests/step_definitions/           pasos de Cucumber
src/http/app.ts                   rutas
src/casos/biblioteca.ts           casos de uso
src/domain/                       reglas y contraseñas
src/datos/memoria.ts              almacén en memoria, el fake de la suite
app/main.py                       rutas del contenedor
app/datos.py                      PostgreSQL
app/reglas.py                     las mismas reglas, usadas por el contenedor
```

La pantalla publicada sigue en Firebase. El contenedor del cliente sigue siendo Python. La API de TypeScript existe para correr Cucumber, la cobertura y el recorrido del navegador sin levantar PostgreSQL. El contrato de rutas y de mensajes es el mismo.

## Cambio de requisito

La pantalla de Firebase ya rechazaba una contraseña de menos de 6 caracteres. La API del contenedor no. El cambio acotado fue alinear las dos: menos de 6 caracteres responde _La contraseña tiene que tener al menos 6 caracteres._ y no crea la cuenta.

Lo cubren `test_la_contrasena_de_cinco_caracteres_se_rechaza_y_la_de_seis_entra`, el escenario de `features/us1-cuenta.feature` y el paso nuevo de `pruebas/recorrer.py`.

## Pareja

La evidencia de conductor y navegador es esta tabla. El nombre que está en los commits del repositorio es Roman Acuña. Falta el nombre de la otra persona del equipo: no se inventa acá.

| Fecha      | Conductor   | Navegador                          | Objetivo                                            | Commit              |
| ---------- | ----------- | ---------------------------------- | --------------------------------------------------- | ------------------- |
| 2026-10-27 | Roman Acuña | Completar con el nombre del equipo | Historias, Cucumber, pruebas de pantalla y pipeline | Pendiente de commit |

## Retrospectiva

Qué ayudó: las reglas quedaron en funciones chicas, así el caso de la última copia se puede leer sin abrir la base.

Qué costó: el producto ya estaba entregado en Firebase y en Python, y la cátedra pide además TypeScript, Cucumber y CI. Quedaron dos APIs con el mismo contrato. La que se muestra al cliente no cambió.

Próxima práctica: el próximo cambio de una regla entra primero como escenario que falla, y después el código. Los commits de esa historia se parten en rojo, verde y refactor. Esta entrega junta las pruebas y el código porque el historial anterior eran tres commits grandes y no se reescribió.
