"""Levanta la pantalla en el puerto 8090 y la API en el puerto 8000."""

import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import uvicorn

WEB = "/app/web"


class Pantalla(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, formato: str, *args) -> None:
        print(f"[pantalla] {self.address_string()} {formato % args}")


def servir_pantalla() -> None:
    handler = partial(Pantalla, directory=WEB)
    ThreadingHTTPServer(("0.0.0.0", 8090), handler).serve_forever()


def main() -> None:
    hilo = threading.Thread(target=servir_pantalla, name="pantalla", daemon=True)
    hilo.start()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    main()
