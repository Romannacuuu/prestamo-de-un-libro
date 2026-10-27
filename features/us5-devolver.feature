Feature: Devolver
  Como cliente
  Quiero devolver mi copia
  Para que vuelva al estante

  Scenario: La copia queda libre y el préstamo queda devuelto
    Given que "Ana" inició sesión
    And que "Ana" ya pidió una copia
    When "Ana" devuelve su copia
    Then la respuesta es exitosa
    And el mensaje contiene "Devolviste la copia número"
    And el préstamo de "Ana" queda devuelto
    And quedan 5 copias libres

  Scenario: Sin préstamo no devuelve nada
    Given que "Luis" inició sesión
    When "Luis" devuelve su copia
    Then la respuesta es un rechazo
    And el mensaje es "No tenés una copia para devolver."

  Scenario: Luis no puede devolver lo de Ana
    Given que "Ana" inició sesión
    And que "Ana" ya pidió una copia
    And que "Luis" inició sesión
    When "Luis" intenta devolver el préstamo de "Ana"
    Then la respuesta es prohibida
    And el mensaje es "No podés hacer esta acción."
