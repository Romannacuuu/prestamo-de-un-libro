Feature: Crear cuenta
  Como visitante
  Quiero registrarme con nombre, correo y contraseña
  Para poder pedir un libro

  Scenario: Un correo nuevo crea un cliente
    When se registra "Visita" con correo "visita@biblioteca.local" y contraseña "clave123"
    Then la respuesta es exitosa
    And el mensaje es "Cuenta creada."
    And la contraseña no aparece en la respuesta
    And el almacén no contiene el texto "clave123"

  Scenario: Un correo repetido no duplica la cuenta
    Given que existe el cliente "Ana" con correo "ana@biblioteca.local"
    When se registra "Otra" con correo "ana@biblioteca.local" y contraseña "clave123"
    Then la respuesta es un rechazo
    And el mensaje es "Ese correo ya está registrado."

  Scenario: Faltan datos
    When se registra "Sin clave" con correo "sin@biblioteca.local" y contraseña ""
    Then la respuesta es un rechazo
    And el mensaje es "Faltan datos."

  Scenario: La contraseña de cinco caracteres se rechaza
    When se registra "Corta" con correo "corta@biblioteca.local" y contraseña "12345"
    Then la respuesta es un rechazo
    And el mensaje es "La contraseña tiene que tener al menos 6 caracteres."
