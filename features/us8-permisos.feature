Feature: El rol se controla en el servidor
  Como auditor de seguridad
  Quiero que ocultar un botón no sea la única barrera
  Para que un cliente no use las acciones del administrador

  Scenario: El cliente recibe prohibido al pedir el listado
    Given que "Ana" inició sesión
    When "Ana" consulta todos los préstamos
    Then la respuesta es prohibida
    And el mensaje es "No podés hacer esta acción."

  Scenario: El administrador no usa la vista del cliente
    Given que "Admin" inició sesión
    When "Admin" consulta el libro
    Then la respuesta es prohibida
