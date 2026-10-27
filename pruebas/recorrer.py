"""Recorre el pedido del cliente contra la API ya levantada.

Uso, desde la carpeta del proyecto, con los contenedores en marcha:

    python pruebas/recorrer.py
"""

import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API = "http://127.0.0.1:8000"
PANTALLA = "http://127.0.0.1:8090"
ROOT = Path(__file__).resolve().parents[1]

YA_TIENE = "Ya tenés una copia. Devolvela antes de pedir otra."
SIN_STOCK = "No hay copias libres."
PERMISO = "No podés hacer esta acción."
SESION = "Tenés que iniciar sesión."
CORREO = "Ese correo ya está registrado."
INGRESO = "Correo o contraseña incorrectos."
FALTAN = "Faltan datos."
CORTA = "La contraseña tiene que tener al menos 6 caracteres."
NADA = "No tenés una copia para devolver."

fallas: list[str] = []


def verificar(condicion: bool, mensaje: str) -> None:
    if condicion:
        print(f"  ok  {mensaje}")
    else:
        print(f"  FALLO  {mensaje}")
        fallas.append(mensaje)


def llamar(metodo: str, ruta: str, token: str | None = None, cuerpo=None):
    datos = None
    headers = {}
    if cuerpo is not None:
        datos = json.dumps(cuerpo).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    pedido = urllib.request.Request(API + ruta, data=datos, headers=headers, method=metodo)
    try:
        with urllib.request.urlopen(pedido, timeout=20) as respuesta:
            bruto = respuesta.read().decode("utf-8")
            return respuesta.status, json.loads(bruto) if bruto else {}
    except urllib.error.HTTPError as error:
        bruto = error.read().decode("utf-8")
        try:
            parsed = json.loads(bruto) if bruto else {}
        except json.JSONDecodeError:
            parsed = {"mensaje": bruto}
        return error.code, parsed


def esperar_api() -> None:
    for _ in range(90):
        try:
            codigo, cuerpo = llamar("POST", "/sesion", cuerpo={"correo": "nadie", "contrasena": "x"})
            if codigo == 400 and cuerpo.get("mensaje") == INGRESO:
                return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(1)
    raise SystemExit("La API no respondió en el puerto 8000")


def entrar(correo: str, contrasena: str) -> str:
    codigo, cuerpo = llamar("POST", "/sesion", cuerpo={"correo": correo, "contrasena": contrasena})
    verificar(codigo == 200 and "token" in cuerpo, f"ingresa {correo}")
    return cuerpo.get("token", "")


def registrar(nombre: str, correo: str, contrasena: str = "clave123") -> None:
    codigo, cuerpo = llamar(
        "POST",
        "/registro",
        cuerpo={"nombre": nombre, "correo": correo, "contrasena": contrasena},
    )
    verificar(codigo == 201, f"registra {correo} ({codigo})")
    if codigo != 201:
        print("   ", cuerpo)


def devolver_todos(token_admin: str) -> None:
    _, cuerpo = llamar("GET", "/prestamos", token=token_admin)
    for prestamo in cuerpo.get("prestamos", []):
        if prestamo["estado"] == "activo":
            llamar("POST", f"/prestamos/{prestamo['id']}/devolucion", token=token_admin)


def libro(token: str) -> dict:
    codigo, cuerpo = llamar("GET", "/libro", token=token)
    verificar(codigo == 200, "ve el libro")
    return cuerpo


def activos(token_admin: str) -> list[dict]:
    _, cuerpo = llamar("GET", "/prestamos", token=token_admin)
    return [p for p in cuerpo.get("prestamos", []) if p["estado"] == "activo"]


def coherente(token_cliente: str, token_admin: str, etiqueta: str) -> None:
    datos = libro(token_cliente)
    _, copias = llamar("GET", "/copias", token=token_admin)
    prestamos = activos(token_admin)
    numeros = [p["copia"] for p in prestamos]
    libres_por_estado = sum(1 for c in copias.get("copias", []) if c["estado"] == "libre")
    verificar(datos.get("titulo") == "El principito", f"{etiqueta}: título")
    verificar(datos.get("total") == 5, f"{etiqueta}: hay 5 copias")
    verificar(datos.get("libres") == libres_por_estado, f"{etiqueta}: libres = copias sin préstamo")
    verificar(datos.get("libres") == 5 - len(prestamos), f"{etiqueta}: libres = 5 - activos")
    verificar(len(numeros) == len(set(numeros)), f"{etiqueta}: ninguna copia está dos veces")


def pedir_juntos(token_a: str, token_b: str):
    barrera = threading.Barrier(2)

    def uno(token: str):
        barrera.wait(timeout=15)
        return llamar("POST", "/prestamos", token=token)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futuro_a = pool.submit(uno, token_a)
        futuro_b = pool.submit(uno, token_b)
        return futuro_a.result(), futuro_b.result()


def main() -> None:
    print("Esperando la API...")
    esperar_api()

    print("\n1. Cuenta")
    correo = f"visita.{uuid.uuid4().hex[:8]}@biblioteca.local"
    registrar("Visita", correo)
    codigo, cuerpo = llamar(
        "POST",
        "/registro",
        cuerpo={"nombre": "Otra", "correo": correo, "contrasena": "clave123"},
    )
    verificar(codigo == 400 and cuerpo.get("mensaje") == CORREO, "correo repetido no duplica")
    codigo, cuerpo = llamar("POST", "/registro", cuerpo={"nombre": "Sin clave", "correo": correo})
    verificar(codigo == 400 and cuerpo.get("mensaje") == FALTAN, "faltan datos no crea nada")
    codigo, cuerpo = llamar(
        "POST",
        "/registro",
        cuerpo={
            "nombre": "Corta",
            "correo": f"corta.{uuid.uuid4().hex[:6]}@biblioteca.local",
            "contrasena": "12345",
        },
    )
    verificar(codigo == 400 and cuerpo.get("mensaje") == CORTA, "la contraseña corta no crea la cuenta")
    codigo, cuerpo = llamar("POST", "/registro", cuerpo={"nombre": "X", "correo": f"nuevo.{uuid.uuid4().hex[:6]}@biblioteca.local", "contrasena": "clave123"})
    verificar("clave123" not in json.dumps(cuerpo) and "pbkdf2" not in json.dumps(cuerpo), "la contraseña no se muestra")

    print("\n2. Sesión")
    codigo, cuerpo = llamar("POST", "/sesion", cuerpo={"correo": "ana@biblioteca.local", "contrasena": "mal"})
    verificar(codigo == 400 and cuerpo.get("mensaje") == INGRESO, "clave mal, sin decir qué falló")
    codigo, cuerpo = llamar("POST", "/sesion", cuerpo={"correo": "no-existe@biblioteca.local", "contrasena": "ana123"})
    verificar(codigo == 400 and cuerpo.get("mensaje") == INGRESO, "correo inexistente, el mismo mensaje")
    codigo, _ = llamar("GET", "/libro")
    verificar(codigo == 401, "sin sesión no muestra el libro")
    codigo, cuerpo = llamar("POST", "/prestamos")
    verificar(codigo == 401 and cuerpo.get("mensaje") == SESION, "sin sesión no pide")

    token_ana = entrar("ana@biblioteca.local", "ana123")
    token_luis = entrar("luis@biblioteca.local", "luis123")
    token_admin = entrar("admin@biblioteca.local", "admin123")
    codigo, cuerpo = llamar("GET", "/prestamos", token=token_ana)
    verificar(codigo == 403 and cuerpo.get("mensaje") == PERMISO, "un cliente no lista como admin")
    codigo, _ = llamar("POST", "/prestamos", token=token_admin)
    verificar(codigo == 403, "el admin no pide un libro")
    codigo, _ = llamar("GET", "/libro", token=token_admin)
    verificar(codigo == 403, "el admin no usa la vista del cliente")

    print("\n3. Dejar la biblioteca en 5 libres")
    devolver_todos(token_admin)
    datos = libro(token_ana)
    verificar(datos.get("libres") == 5, "arranque de la prueba con 5 libres")

    print("\n4. Dos clics del mismo cliente")
    correo_doble = f"doble.{uuid.uuid4().hex[:8]}@biblioteca.local"
    registrar("Doble", correo_doble)
    token_doble = entrar(correo_doble, "clave123")
    (c1, p1), (c2, p2) = pedir_juntos(token_doble, token_doble)
    codigos = sorted([c1, c2])
    mensajes = {p1.get("mensaje"), p2.get("mensaje")}
    verificar(codigos == [201, 400], f"un clic gana y el otro no: {codigos}")
    verificar(YA_TIENE in mensajes, "el segundo aviso es que ya tiene una copia")
    coherente(token_ana, token_admin, "después del doble clic")
    devolver_todos(token_admin)

    print("\n5. Ana y Luis piden, y cada uno solo toca lo suyo")
    codigo, ana = llamar("POST", "/prestamos", token=token_ana)
    codigo_luis, luis = llamar("POST", "/prestamos", token=token_luis)
    verificar(codigo == 201 and codigo_luis == 201, "los dos obtienen una copia")
    verificar(ana.get("prestamo", {}).get("copia") != luis.get("prestamo", {}).get("copia"), "son copias distintas")
    verificar(libro(token_ana).get("libres") == 3, "quedan 3 libres")
    codigo, cuerpo = llamar("POST", "/prestamos", token=token_ana)
    verificar(codigo == 400 and cuerpo.get("mensaje") == YA_TIENE, "Ana no se lleva una segunda")
    prestamo_ana = next(p for p in activos(token_admin) if p["cliente"] == "Ana")
    antes = len(activos(token_admin))
    codigo, cuerpo = llamar("POST", f"/prestamos/{prestamo_ana['id']}/devolucion", token=token_luis)
    verificar(codigo == 403 and cuerpo.get("mensaje") == PERMISO, "Luis no devuelve lo de Ana")
    verificar(len(activos(token_admin)) == antes, "el préstamo de Ana sigue activo")
    codigo, cuerpo = llamar("POST", "/prestamos/mio/devolucion", token=token_ana)
    verificar(codigo == 200 and str(cuerpo.get("mensaje", "")).startswith("Devolviste la copia número"), "Ana devuelve la suya")
    verificar(libro(token_ana).get("libres") == 4, "las libres pasan de 3 a 4")
    _, historial = llamar("GET", "/prestamos", token=token_admin)
    devuelto = next(p for p in historial["prestamos"] if p["id"] == prestamo_ana["id"])
    verificar(devuelto["estado"] == "devuelto" and devuelto["fecha_devolucion"], "el préstamo queda devuelto, no se borra")
    codigo, cuerpo = llamar("POST", "/prestamos/mio/devolucion", token=token_ana)
    verificar(codigo == 400 and cuerpo.get("mensaje") == NADA, "sin préstamo no devuelve nada")
    llamar("POST", "/prestamos/mio/devolucion", token=token_luis)
    verificar(libro(token_ana).get("libres") == 5, "Luis también devuelve y vuelven a 5")

    print("\n6. La última copia, los dos juntos")
    ocupantes = []
    for indice in range(4):
        correo_ocupa = f"ocupa.{indice}.{uuid.uuid4().hex[:6]}@biblioteca.local"
        registrar(f"Ocupa{indice}", correo_ocupa)
        token_ocupa = entrar(correo_ocupa, "clave123")
        codigo, _ = llamar("POST", "/prestamos", token=token_ocupa)
        verificar(codigo == 201, f"ocupa la copia {indice + 1}")
        ocupantes.append(token_ocupa)
    verificar(libro(token_ana).get("libres") == 1, "queda 1 libre")
    _, mio_ana = llamar("GET", "/prestamos/mio", token=token_ana)
    _, mio_luis = llamar("GET", "/prestamos/mio", token=token_luis)
    verificar(mio_ana.get("prestamo") is None and mio_luis.get("prestamo") is None, "Ana y Luis están libres para pedir")
    (c1, p1), (c2, p2) = pedir_juntos(token_ana, token_luis)
    ganadores = [c for c in (c1, c2) if c == 201]
    perdedores = [p for c, p in ((c1, p1), (c2, p2)) if c != 201]
    print(f"   respuestas: {c1} {p1.get('mensaje')} | {c2} {p2.get('mensaje')}")
    verificar(ganadores == [201] and len(perdedores) == 1, "solo uno se lleva la última copia")
    verificar(perdedores[0].get("mensaje") == SIN_STOCK, "el otro ve que no hay copias libres")
    verificar(libro(token_ana).get("libres") == 0, "el contador queda en 0")
    prestamos = activos(token_admin)
    verificar(len(prestamos) == 5, "hay 5 préstamos activos y ninguno de más")
    verificar(len({p["copia"] for p in prestamos}) == 5, "cada copia tiene un solo préstamo")
    correo_tarde = f"tarde.{uuid.uuid4().hex[:6]}@biblioteca.local"
    registrar("Tarde", correo_tarde)
    token_tarde = entrar(correo_tarde, "clave123")
    codigo, cuerpo = llamar("POST", "/prestamos", token=token_tarde)
    verificar(codigo == 400 and cuerpo.get("mensaje") == SIN_STOCK, "sin stock no crea un préstamo")
    verificar(len(activos(token_admin)) == 5, "sin stock no cambia los datos")
    id_ganador = next(p["id"] for p in prestamos if p["cliente"] in ("Ana", "Luis"))
    codigo, cuerpo = llamar("POST", f"/prestamos/{id_ganador}/devolucion", token=token_admin)
    verificar(codigo == 200, "el admin registra esa devolución")
    _, copias = llamar("GET", "/copias", token=token_admin)
    verificar(len(copias.get("copias", [])) == 5, "el admin ve las 5 copias")
    devolver_todos(token_admin)
    verificar(libro(token_ana).get("libres") == 5, "al cerrar la prueba vuelven a quedar 5 libres")

    print("\n7. Cerrar la sesión de Ana no toca la de Luis")
    codigo, _ = llamar("DELETE", "/sesion", token=token_ana)
    verificar(codigo == 200, "Ana cierra sesión")
    codigo, cuerpo = llamar("POST", "/prestamos", token=token_ana)
    verificar(codigo == 401 and cuerpo.get("mensaje") == SESION, "el token viejo de Ana ya no pide")
    codigo, _ = llamar("GET", "/libro", token=token_luis)
    verificar(codigo == 200, "Luis sigue con su propia sesión")

    print("\n8. La pantalla está publicada")
    try:
        with urllib.request.urlopen(PANTALLA, timeout=10) as respuesta:
            html = respuesta.read().decode("utf-8")
            verificar(respuesta.status == 200 and "Pedir" in html and "Devolver" in html, "la pantalla tiene Pedir y Devolver")
    except urllib.error.URLError as error:
        verificar(False, f"la pantalla no abrió: {error}")

    print("\n9. Reinicio: los usuarios y los préstamos siguen")
    if os.environ.get("PROBAR_REINICIO", "1") != "1":
        print("   omitido en este entorno")
    else:
        token_admin = entrar("admin@biblioteca.local", "admin123")
        _, antes = llamar("GET", "/prestamos", token=token_admin)
        cantidad = len(antes.get("prestamos", []))
        verificar(cantidad > 0, "hay historial para comprobar después del reinicio")
        print("   reiniciando contenedores...")
        subprocess.run(["docker", "compose", "restart"], cwd=ROOT, check=True)
        esperar_api()
        token_admin = entrar("admin@biblioteca.local", "admin123")
        _, despues = llamar("GET", "/prestamos", token=token_admin)
        verificar(len(despues.get("prestamos", [])) == cantidad, "después de reiniciar el historial sigue")
        codigo, _ = llamar("GET", "/libro", token=entrar("ana@biblioteca.local", "ana123"))
        verificar(codigo == 200, "Ana sigue existiendo después del reinicio")

    print()
    if fallas:
        print(f"Fallaron {len(fallas)} comprobaciones:")
        for falla in fallas:
            print(f" - {falla}")
        raise SystemExit(1)
    print("Todo el recorrido pasó.")


if __name__ == "__main__":
    main()
