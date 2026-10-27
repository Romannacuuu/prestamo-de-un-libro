Feature: Ver el libro
  Como cliente
  Quiero ver el título y las copias libres
  Para saber si puedo pedir

  Scenario: El cliente ve El principito y cinco copias
    Given que "Ana" inició sesión
    When "Ana" consulta el libro
    Then la respuesta es exitosa
    And el cuerpo incluye el título "El principito"
    And quedan 5 copias libres

  Scenario: Sin sesión no se muestra el libro
    When alguien sin sesión consulta el libro
    Then la respuesta pide iniciar sesión
    And el mensaje es "Tenés que iniciar sesión."
