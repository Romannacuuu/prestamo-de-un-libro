"""Reglas del préstamo, sin base de datos.

`pedir` en `datos.py` usa estas funciones dentro de la transacción.
"""

from app import mensajes


class Regla(Exception):
    """Una regla de negocio. No es un fallo del servidor."""

    def __init__(self, mensaje: str, codigo: int = 400) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


def validar_registro(
    nombre: str | None,
    correo: str | None,
    contrasena: str | None,
) -> tuple[str, str]:
    nombre_limpio = (nombre or "").strip()
    correo_limpio = (correo or "").strip().lower()
    if not nombre_limpio or not correo_limpio or not contrasena:
        raise Regla(mensajes.FALTAN_DATOS)
    if len(contrasena) < 6:
        raise Regla(mensajes.CLAVE_CORTA)
    return nombre_limpio, correo_limpio


def numero_a_prestar(numeros_libres: list[int], tiene_activo: bool) -> int:
    """Devuelve la copia libre de número más bajo, o corta con la regla que corresponde."""
    if tiene_activo:
        raise Regla(mensajes.YA_TIENE)
    if not numeros_libres:
        raise Regla(mensajes.SIN_STOCK)
    return min(numeros_libres)
