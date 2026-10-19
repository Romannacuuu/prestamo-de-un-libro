"""La contraseña no se guarda. Se guarda un hash que no se puede mostrar."""

import hashlib
import secrets

ITERACIONES = 200_000


def hash_clave(clave: str) -> str:
    sal = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", clave.encode("utf-8"), sal, ITERACIONES)
    return f"pbkdf2_sha256${ITERACIONES}${sal.hex()}${digest.hex()}"


def verificar_clave(clave: str, guardada: str) -> bool:
    try:
        algoritmo, iteraciones, sal_hex, digest_hex = guardada.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        calculado = hashlib.pbkdf2_hmac(
            "sha256",
            clave.encode("utf-8"),
            bytes.fromhex(sal_hex),
            int(iteraciones),
        )
        return secrets.compare_digest(calculado.hex(), digest_hex)
    except (TypeError, ValueError):
        return False


def nuevo_token() -> str:
    return secrets.token_urlsafe(32)
