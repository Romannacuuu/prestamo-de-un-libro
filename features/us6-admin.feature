Feature: Administrador
  Como administrador
  Quiero ver las copias y registrar una devolución
  Para conocer el estado real

  Scenario: Ve las cinco copias y no tiene cómo pedirse un libro
    Given que "Admin" inició sesión
    When "Admin" consulta las copias
    Then la respuesta es exitosa
    And hay 5 copias en la respuesta
    When "Admin" pide una copia
    Then la respuesta es prohibida

  Scenario: Un cliente no entra a la vista de administrador
    Given que "Ana" inició sesión
    When "Ana" consulta todos los préstamos
    Then la respuesta es prohibida
    And el mensaje es "No podés hacer esta acción."

  Scenario: Registra la devolución de un préstamo activo
    Given que "Ana" inició sesión
    And que "Ana" ya pidió una copia
    And que "Admin" inició sesión
    When "Admin" devuelve el préstamo de "Ana"
    Then la respuesta es exitosa
    And el préstamo de "Ana" queda devuelto
