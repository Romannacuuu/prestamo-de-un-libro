"""Ejemplos de las reglas, sin levantar la base."""

import pytest

from app import mensajes
from app.claves import hash_clave, verificar_clave
from app.reglas import Regla, numero_a_prestar, validar_registro


def test_elige_la_copia_libre_de_numero_mas_bajo():
    assert numero_a_prestar([3, 1, 5], tiene_activo=False) == 1


def test_con_una_sola_libre_asigna_esa():
    assert numero_a_prestar([4], tiene_activo=False) == 4


def test_sin_copias_libres_no_presta():
    with pytest.raises(Regla) as error:
        numero_a_prestar([], tiene_activo=False)
    assert error.value.mensaje == mensajes.SIN_STOCK
    assert error.value.codigo == 400


def test_quien_ya_tiene_copia_no_lleva_otra_aunque_haya_stock():
    with pytest.raises(Regla) as error:
        numero_a_prestar([1, 2], tiene_activo=True)
    assert error.value.mensaje == mensajes.YA_TIENE


def test_registro_limpio_pasa_el_correo_a_minusculas():
    nombre, correo = validar_registro("  Ana  ", "  ANA@Biblioteca.Local ", "clave123")
    assert nombre == "Ana"
    assert correo == "ana@biblioteca.local"


@pytest.mark.parametrize(
    "nombre, correo, clave",
    [
        ("", "ana@biblioteca.local", "clave123"),
        ("Ana", "", "clave123"),
        ("Ana", "ana@biblioteca.local", ""),
        ("   ", "ana@biblioteca.local", "clave123"),
        (None, None, None),
    ],
)
def test_registro_incompleto_no_crea_nada(nombre, correo, clave):
    with pytest.raises(Regla) as error:
        validar_registro(nombre, correo, clave)
    assert error.value.mensaje == mensajes.FALTAN_DATOS


def test_la_contrasena_de_cinco_caracteres_se_rechaza_y_la_de_seis_entra():
    with pytest.raises(Regla) as error:
        validar_registro("Ana", "ana@biblioteca.local", "12345")
    assert error.value.mensaje == mensajes.CLAVE_CORTA
    nombre, correo = validar_registro("Ana", "ana@biblioteca.local", "123456")
    assert (nombre, correo) == ("Ana", "ana@biblioteca.local")


def test_los_mensajes_de_exito_nombran_el_numero():
    assert mensajes.prestamo_creado(3) == "Te llevás la copia número 3."
    assert mensajes.devolucion_hecha(3) == "Devolviste la copia número 3."


def test_un_hash_de_otro_algoritmo_no_verifica():
    assert not verificar_clave("clave123", "otro$1$aa$bb")


def test_la_contrasena_se_guarda_como_hash_y_no_como_texto():
    guardada = hash_clave("clave123")
    assert guardada != "clave123"
    assert "clave123" not in guardada
    assert verificar_clave("clave123", guardada)
    assert not verificar_clave("otra", guardada)
    assert not verificar_clave("clave123", "texto-plano")
