Feature: La contraseña no se guarda en texto
  Como auditor de seguridad
  Quiero que las contraseñas se guarden con hash y sal
  Para que una copia de la base no muestre las claves

  Scenario: El alta no devuelve ni archiva la contraseña
    When se registra "Nueva" con correo "nueva@biblioteca.local" y contraseña "clave123"
    Then la respuesta es exitosa
    And la contraseña no aparece en la respuesta
    And el almacén no contiene el texto "clave123"
