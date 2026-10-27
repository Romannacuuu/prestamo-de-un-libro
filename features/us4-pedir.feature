Feature: Pedir una copia
  Como cliente
  Quiero pedir una copia si hay stock
  Para llevarme El principito

  Scenario: Asigna la copia libre de número más bajo
    Given que "Ana" inició sesión
    When "Ana" pide una copia
    Then la respuesta es exitosa
    And el mensaje es "Te llevás la copia número 1."

  Scenario: No se lleva una segunda copia
    Given que "Ana" inició sesión
    And que "Ana" ya pidió una copia
    When "Ana" pide una copia
    Then la respuesta es un rechazo
    And el mensaje es "Ya tenés una copia. Devolvela antes de pedir otra."

  Scenario: Sin stock no crea un préstamo
    Given que no quedan copias libres
    And que "Ana" inició sesión
    When "Ana" pide una copia
    Then la respuesta es un rechazo
    And el mensaje es "No hay copias libres."

  Scenario: Dos pedidos juntos sobre la última copia
    Given que queda una sola copia libre
    And que "Ana" inició sesión
    And que "Luis" inició sesión
    When "Ana" y "Luis" piden al mismo tiempo
    Then solo uno obtiene una copia
    And el otro ve "No hay copias libres."
    And no quedan copias libres
