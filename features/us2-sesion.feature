Feature: Entrar y salir
  Como usuario
  Quiero abrir y cerrar sesión
  Para que nadie use mi cuenta

  Scenario: Datos incorrectos no dicen qué falló
    When se ingresa con correo "ana@biblioteca.local" y contraseña "malclave"
    Then la respuesta es un rechazo
    And el mensaje es "Correo o contraseña incorrectos."

  Scenario: Un correo que no existe usa el mismo mensaje
    When se ingresa con correo "no-existe@biblioteca.local" y contraseña "ana123"
    Then la respuesta es un rechazo
    And el mensaje es "Correo o contraseña incorrectos."

  Scenario: Cerrar la sesión invalida ese token y no el de otra persona
    Given que "Ana" inició sesión
    And que "Luis" inició sesión
    When "Ana" cierra la sesión
    And "Ana" intenta pedir con la sesión cerrada
    Then la respuesta pide iniciar sesión
    When "Luis" consulta el libro
    Then la respuesta es exitosa
