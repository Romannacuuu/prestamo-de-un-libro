"""Base de datos y reglas del préstamo.

La función `pedir` es la que resuelve el caso de la última copia.
La explicación completa está en SOLUCION.md.
"""

import logging
import os
import threading
import time

from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
from psycopg_pool import ConnectionPool

from app.claves import hash_clave, nuevo_token, verificar_clave
from app import mensajes
from app.reglas import Regla, numero_a_prestar, validar_registro

log = logging.getLogger("biblioteca")
log.setLevel(logging.INFO)
if not log.handlers:
    salida = logging.StreamHandler()
    salida.setFormatter(logging.Formatter("%(asctime)s [hilo %(thread)d] %(message)s"))
    log.addHandler(salida)
    log.propagate = False

TITULO = "El principito"
AUTOR = "Antoine de Saint-Exupéry"

DEMOS = (
    ("Ana", "ana@biblioteca.local", "ana123", "cliente"),
    ("Luis", "luis@biblioteca.local", "luis123", "cliente"),
    ("Admin", "admin@biblioteca.local", "admin123", "administrador"),
)

# Hash fijo para tardar lo mismo si el correo no existe y si la clave está mal.
_HASH_DE_RELLENO = hash_clave("relleno")

pool: ConnectionPool | None = None


def abrir() -> None:
    global pool
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("Falta la variable DATABASE_URL")

    ultimo: Exception | None = None
    for _ in range(30):
        try:
            candidato = ConnectionPool(
                url,
                min_size=2,
                max_size=10,
                open=False,
                kwargs={"row_factory": dict_row},
                configure=_configurar,
            )
            candidato.open(wait=True, timeout=5)
            with candidato.connection() as conn:
                conn.execute("SELECT 1")
            pool = candidato
            log.info("conectada la base")
            return
        except Exception as error:
            ultimo = error
            log.warning("la base todavía no responde: %s", error)
            time.sleep(1)
    raise RuntimeError(f"No se pudo conectar a la base: {ultimo}")


def cerrar() -> None:
    if pool is not None:
        pool.close()


def _configurar(conn) -> None:
    # El pool exige que la conexión vuelva libre de transacción.
    conn.execute("SET TIME ZONE 'UTC'")
    conn.commit()


def preparar() -> None:
    """Crea las tablas y, si es el primer arranque, el libro y las cuentas demo."""
    sentencias = [
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id BIGSERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            correo TEXT NOT NULL UNIQUE,
            clave_hash TEXT NOT NULL,
            rol TEXT NOT NULL CHECK (rol IN ('cliente', 'administrador'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS sesiones (
            token TEXT PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES usuarios (id),
            creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS copias (
            numero INTEGER PRIMARY KEY CHECK (numero BETWEEN 1 AND 5),
            estado TEXT NOT NULL CHECK (estado IN ('libre', 'prestada'))
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS prestamos (
            id BIGSERIAL PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES usuarios (id),
            copia_numero INTEGER NOT NULL REFERENCES copias (numero),
            estado TEXT NOT NULL CHECK (estado IN ('activo', 'devuelto')),
            fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            fecha_devolucion TIMESTAMPTZ
        )
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS un_prestamo_activo_usuario
            ON prestamos (usuario_id) WHERE estado = 'activo'
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS un_prestamo_activo_copia
            ON prestamos (copia_numero) WHERE estado = 'activo'
        """,
        """
        INSERT INTO copias (numero, estado)
        VALUES (1, 'libre'), (2, 'libre'), (3, 'libre'), (4, 'libre'), (5, 'libre')
        ON CONFLICT (numero) DO NOTHING
        """,
    ]
    with pool.connection() as conn:
        with conn.transaction():
            for sql in sentencias:
                conn.execute(sql)
            for nombre, correo, clave, rol in DEMOS:
                existe = conn.execute(
                    "SELECT 1 FROM usuarios WHERE correo = %s",
                    (correo,),
                ).fetchone()
                if existe:
                    continue
                conn.execute(
                    """
                    INSERT INTO usuarios (nombre, correo, clave_hash, rol)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (nombre, correo, hash_clave(clave), rol),
                )
    log.info("base lista: %s, 5 copias", TITULO)


def registrar(nombre: str | None, correo: str | None, contrasena: str | None) -> dict:
    nombre_limpio, correo_limpio = validar_registro(nombre, correo, contrasena)
    clave_hash = hash_clave(contrasena)
    try:
        with pool.connection() as conn:
            with conn.transaction():
                fila = conn.execute(
                    """
                    INSERT INTO usuarios (nombre, correo, clave_hash, rol)
                    VALUES (%s, %s, %s, 'cliente')
                    RETURNING nombre
                    """,
                    (nombre_limpio, correo_limpio, clave_hash),
                ).fetchone()
    except UniqueViolation:
        raise Regla(mensajes.CORREO_REPETIDO) from None
    return fila


def ingresar(correo: str | None, contrasena: str | None) -> dict:
    correo_limpio = (correo or "").strip().lower()
    if not correo_limpio or not contrasena:
        raise Regla(mensajes.FALTAN_DATOS)

    with pool.connection() as conn:
        with conn.transaction():
            usuario = conn.execute(
                """
                SELECT id, nombre, rol, clave_hash
                FROM usuarios WHERE correo = %s
                """,
                (correo_limpio,),
            ).fetchone()
    # Misma respuesta si el correo no existe o si la clave no coincide.
    # La verificación va afuera de la transacción: el hash tarda y no hace falta trabar la base.
    hash_guardado = usuario["clave_hash"] if usuario else _HASH_DE_RELLENO
    if not usuario or not verificar_clave(contrasena, hash_guardado):
        raise Regla(mensajes.INGRESO_INCORRECTO)

    token = nuevo_token()
    with pool.connection() as conn:
        with conn.transaction():
            conn.execute(
                "INSERT INTO sesiones (token, usuario_id) VALUES (%s, %s)",
                (token, usuario["id"]),
            )
    return {"token": token, "nombre": usuario["nombre"], "rol": usuario["rol"]}


def cerrar_sesion(token: str) -> None:
    with pool.connection() as conn:
        with conn.transaction():
            borrada = conn.execute("DELETE FROM sesiones WHERE token = %s", (token,))
            if borrada.rowcount == 0:
                raise Regla(mensajes.SESION, 401)


def usuario_de_token(token: str) -> dict | None:
    with pool.connection() as conn:
        return conn.execute(
            """
            SELECT u.id, u.nombre, u.rol
            FROM sesiones s
            JOIN usuarios u ON u.id = s.usuario_id
            WHERE s.token = %s
            """,
            (token,),
        ).fetchone()


def ver_libro() -> dict:
    with pool.connection() as conn:
        fila = conn.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM copias) AS total,
                (
                    SELECT COUNT(*) FROM copias c
                    WHERE NOT EXISTS (
                        SELECT 1 FROM prestamos p
                        WHERE p.copia_numero = c.numero
                          AND p.estado = 'activo'
                    )
                ) AS libres
            """
        ).fetchone()
    return {
        "titulo": TITULO,
        "autor": AUTOR,
        "total": fila["total"],
        "libres": fila["libres"],
    }


def pedir(usuario_id: int) -> dict:
    """Asigna una copia libre.

    Dos pedidos a la vez no pueden llevarse la misma copia. Cada pedido
    corre en su hilo y abre su transacción:

    1. Bloquea la fila del usuario, para que dos clics suyos no creen dos préstamos.
    2. Si ya tiene uno activo, rechaza.
    3. Bloquea las copias libres. `numero_a_prestar` elige la de número más bajo.
    4. Si otro hilo se llevó la última, esta transacción espera y después la rechaza.
    5. Marca la copia y crea el préstamo. Las dos cosas se confirman juntas.

    No hay un candado de todo el servidor: el resto de los pedidos sigue en paralelo.
    """
    hilo = threading.get_ident()
    log.info("pedir: empieza usuario=%s", usuario_id)
    try:
        with pool.connection() as conn:
            with conn.transaction():
                conn.execute(
                    "SELECT id FROM usuarios WHERE id = %s FOR UPDATE",
                    (usuario_id,),
                )
                activo = conn.execute(
                    """
                    SELECT id FROM prestamos
                    WHERE usuario_id = %s AND estado = 'activo'
                    """,
                    (usuario_id,),
                ).fetchone()
                libres = conn.execute(
                    """
                    SELECT numero FROM copias
                    WHERE estado = 'libre'
                    ORDER BY numero
                    FOR UPDATE
                    """
                ).fetchall()
                if activo:
                    log.info("pedir: usuario=%s ya tiene un préstamo (%s)", usuario_id, hilo)
                if not libres:
                    log.info("pedir: usuario=%s sin copia libre (%s)", usuario_id, hilo)
                numero = numero_a_prestar(
                    [fila["numero"] for fila in libres],
                    activo is not None,
                )
                conn.execute(
                    "UPDATE copias SET estado = 'prestada' WHERE numero = %s",
                    (numero,),
                )
                try:
                    fila = conn.execute(
                        """
                        INSERT INTO prestamos
                            (usuario_id, copia_numero, estado, fecha_prestamo)
                        VALUES (%s, %s, 'activo', NOW())
                        RETURNING id, copia_numero, estado, fecha_prestamo, fecha_devolucion
                        """,
                        (usuario_id, numero),
                    ).fetchone()
                except UniqueViolation as error:
                    # Segunda red de seguridad: la base no deja dos activos
                    # del mismo cliente ni dos activos de la misma copia.
                    log.info(
                        "pedir: la base rechazó un duplicado usuario=%s (%s)",
                        usuario_id,
                        hilo,
                    )
                    if getattr(error.diag, "constraint_name", "") == "un_prestamo_activo_usuario":
                        raise Regla(mensajes.YA_TIENE) from None
                    raise Regla(mensajes.SIN_STOCK) from None
        log.info("pedir: usuario=%s se lleva la copia %s (%s)", usuario_id, numero, hilo)
        return _forma_prestamo(fila)
    except Regla:
        raise


def mi_prestamo(usuario_id: int) -> dict | None:
    with pool.connection() as conn:
        fila = conn.execute(
            """
            SELECT id, copia_numero, estado, fecha_prestamo, fecha_devolucion
            FROM prestamos
            WHERE usuario_id = %s AND estado = 'activo'
            """,
            (usuario_id,),
        ).fetchone()
    if not fila:
        return None
    return _forma_prestamo(fila)


def devolver_mio(usuario_id: int) -> dict:
    with pool.connection() as conn:
        with conn.transaction():
            conn.execute(
                "SELECT id FROM usuarios WHERE id = %s FOR UPDATE",
                (usuario_id,),
            )
            prestamo = conn.execute(
                """
                SELECT id, copia_numero
                FROM prestamos
                WHERE usuario_id = %s AND estado = 'activo'
                FOR UPDATE
                """,
                (usuario_id,),
            ).fetchone()
            if not prestamo:
                raise Regla(mensajes.NADA_PARA_DEVOLVER)
            fila = _marcar_devuelto(conn, prestamo["id"], prestamo["copia_numero"])
    return _forma_prestamo(fila)


def listar_prestamos() -> list[dict]:
    with pool.connection() as conn:
        filas = conn.execute(
            """
            SELECT p.id, u.nombre, p.copia_numero, p.estado,
                   p.fecha_prestamo, p.fecha_devolucion
            FROM prestamos p
            JOIN usuarios u ON u.id = p.usuario_id
            ORDER BY p.fecha_prestamo DESC, p.id DESC
            """
        ).fetchall()
    return [_forma_prestamo(fila, con_cliente=True) for fila in filas]


def listar_copias() -> list[dict]:
    with pool.connection() as conn:
        filas = conn.execute(
            """
            SELECT c.numero, c.estado, u.nombre AS cliente, p.fecha_prestamo
            FROM copias c
            LEFT JOIN prestamos p
              ON p.copia_numero = c.numero AND p.estado = 'activo'
            LEFT JOIN usuarios u ON u.id = p.usuario_id
            ORDER BY c.numero
            """
        ).fetchall()
    return [
        {
            "numero": fila["numero"],
            "estado": fila["estado"],
            "cliente": fila["cliente"],
            "fecha_prestamo": _instante(fila["fecha_prestamo"]),
        }
        for fila in filas
    ]


def devolver_como_admin(prestamo_id: int) -> dict:
    with pool.connection() as conn:
        with conn.transaction():
            prestamo = conn.execute(
                """
                SELECT id, copia_numero, estado
                FROM prestamos
                WHERE id = %s
                FOR UPDATE
                """,
                (prestamo_id,),
            ).fetchone()
            if not prestamo:
                raise Regla(mensajes.NO_EXISTE, 404)
            if prestamo["estado"] != "activo":
                raise Regla(mensajes.YA_DEVUELTO)
            fila = _marcar_devuelto(conn, prestamo["id"], prestamo["copia_numero"])
    return _forma_prestamo(fila)


def _marcar_devuelto(conn, prestamo_id: int, copia_numero: int) -> dict:
    fila = conn.execute(
        """
        UPDATE prestamos
        SET estado = 'devuelto', fecha_devolucion = NOW()
        WHERE id = %s
        RETURNING id, copia_numero, estado, fecha_prestamo, fecha_devolucion
        """,
        (prestamo_id,),
    ).fetchone()
    conn.execute(
        "UPDATE copias SET estado = 'libre' WHERE numero = %s",
        (copia_numero,),
    )
    return fila


def _forma_prestamo(fila: dict, con_cliente: bool = False) -> dict:
    prestamo = {
        "id": fila["id"],
        "copia": fila["copia_numero"],
        "estado": fila["estado"],
        "fecha_prestamo": _instante(fila["fecha_prestamo"]),
        "fecha_devolucion": _instante(fila["fecha_devolucion"]),
    }
    if con_cliente:
        prestamo["cliente"] = fila["nombre"]
    return prestamo


def _instante(valor):
    if valor is None:
        return None
    return valor.isoformat()
