"""Rutas de la API. Cada ruta comprueba la sesión y el rol en el servidor."""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app import datos, mensajes
from app.datos import Regla


@asynccontextmanager
async def ciclo(_app: FastAPI):
    datos.abrir()
    try:
        datos.preparar()
        yield
    finally:
        datos.cerrar()


app = FastAPI(title="Préstamo de un libro", lifespan=ciclo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class CuentaNueva(BaseModel):
    nombre: str | None = None
    correo: str | None = None
    contrasena: str | None = None


class Ingreso(BaseModel):
    correo: str | None = None
    contrasena: str | None = None


@app.exception_handler(Regla)
def error_de_regla(_request, exc: Regla):
    return JSONResponse(status_code=exc.codigo, content={"mensaje": exc.mensaje})


@app.exception_handler(HTTPException)
def error_http(_request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"mensaje": exc.detail})


@app.exception_handler(RequestValidationError)
def error_de_datos(_request, _exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"mensaje": mensajes.FALTAN_DATOS})


def usuario_actual(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail=mensajes.SESION)
    partes = authorization.split(" ", 1)
    if len(partes) != 2 or partes[0].lower() != "bearer" or not partes[1].strip():
        raise HTTPException(status_code=401, detail=mensajes.SESION)
    token = partes[1].strip()
    usuario = datos.usuario_de_token(token)
    if not usuario:
        raise HTTPException(status_code=401, detail=mensajes.SESION)
    return {
        "id": usuario["id"],
        "nombre": usuario["nombre"],
        "rol": usuario["rol"],
        "token": token,
    }


def solo_cliente(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "cliente":
        raise HTTPException(status_code=403, detail=mensajes.PERMISO)
    return usuario


def solo_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "administrador":
        raise HTTPException(status_code=403, detail=mensajes.PERMISO)
    return usuario


@app.get("/")
def inicio():
    return {
        "mensaje": "API de préstamos. La pantalla está en el puerto 8090.",
        "libro": datos.TITULO,
    }


@app.post("/registro", status_code=201)
def registro(cuerpo: CuentaNueva):
    usuario = datos.registrar(cuerpo.nombre, cuerpo.correo, cuerpo.contrasena)
    return {"mensaje": "Cuenta creada.", "nombre": usuario["nombre"]}


@app.post("/sesion")
def abrir_sesion(cuerpo: Ingreso):
    sesion = datos.ingresar(cuerpo.correo, cuerpo.contrasena)
    return {
        "mensaje": "Sesión iniciada.",
        "token": sesion["token"],
        "nombre": sesion["nombre"],
        "rol": sesion["rol"],
    }


@app.delete("/sesion")
def cerrar_sesion(usuario: dict = Depends(usuario_actual)):
    datos.cerrar_sesion(usuario["token"])
    return {"mensaje": "Sesión cerrada.", "nombre": usuario["nombre"]}


@app.get("/libro")
def libro(_usuario: dict = Depends(solo_cliente)):
    return datos.ver_libro()


@app.post("/prestamos", status_code=201)
def crear_prestamo(usuario: dict = Depends(solo_cliente)):
    prestamo = datos.pedir(usuario["id"])
    return {
        "mensaje": mensajes.prestamo_creado(prestamo["copia"]),
        "prestamo": prestamo,
    }


@app.get("/prestamos/mio")
def ver_el_mio(usuario: dict = Depends(solo_cliente)):
    return {"prestamo": datos.mi_prestamo(usuario["id"])}


@app.post("/prestamos/mio/devolucion")
def devolver_el_mio(usuario: dict = Depends(solo_cliente)):
    prestamo = datos.devolver_mio(usuario["id"])
    return {
        "mensaje": mensajes.devolucion_hecha(prestamo["copia"]),
        "prestamo": prestamo,
    }


@app.get("/prestamos")
def ver_todos(_usuario: dict = Depends(solo_admin)):
    return {"prestamos": datos.listar_prestamos()}


@app.get("/copias")
def ver_copias(_usuario: dict = Depends(solo_admin)):
    return {"copias": datos.listar_copias()}


@app.post("/prestamos/{prestamo_id}/devolucion")
def devolver_uno(prestamo_id: int, _usuario: dict = Depends(solo_admin)):
    prestamo = datos.devolver_como_admin(prestamo_id)
    return {
        "mensaje": mensajes.devolucion_hecha(prestamo["copia"]),
        "prestamo": prestamo,
    }
