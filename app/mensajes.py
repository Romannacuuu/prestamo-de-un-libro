"""Textos que ve la persona. La redacción puede cambiar; el significado no."""

SESION = "Tenés que iniciar sesión."
PERMISO = "No podés hacer esta acción."
CORREO_REPETIDO = "Ese correo ya está registrado."
INGRESO_INCORRECTO = "Correo o contraseña incorrectos."
FALTAN_DATOS = "Faltan datos."
SIN_STOCK = "No hay copias libres."
YA_TIENE = "Ya tenés una copia. Devolvela antes de pedir otra."
NADA_PARA_DEVOLVER = "No tenés una copia para devolver."
YA_DEVUELTO = "Ese préstamo ya fue devuelto."
NO_EXISTE = "No existe ese préstamo."


def prestamo_creado(numero: int) -> str:
    return f"Te llevás la copia número {numero}."


def devolucion_hecha(numero: int) -> str:
    return f"Devolviste la copia número {numero}."
