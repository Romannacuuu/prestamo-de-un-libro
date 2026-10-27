import cors from "cors";
import express, { type Request, type Response } from "express";
import { Biblioteca } from "../casos/biblioteca.js";
import { SESION } from "../domain/mensajes.js";
import { ReglaNegocio } from "../domain/regla.js";
import { Memoria } from "../datos/memoria.js";

export function crearApp(biblioteca = new Biblioteca(new Memoria())): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ mensaje: "API de préstamos.", libro: "El principito" });
  });

  app.post("/registro", (req, res) => {
    atender(res, async () => {
      const cuerpo = leer(req);
      const usuario = await biblioteca.registrar(cuerpo.nombre, cuerpo.correo, cuerpo.contrasena);
      res.status(201).json({ mensaje: "Cuenta creada.", nombre: usuario.nombre });
    });
  });

  app.post("/sesion", (req, res) => {
    atender(res, async () => {
      const cuerpo = leer(req);
      const sesion = await biblioteca.ingresar(cuerpo.correo, cuerpo.contrasena);
      res.json({ mensaje: "Sesión iniciada.", ...sesion });
    });
  });

  app.delete("/sesion", (req, res) => {
    atender(res, async () => {
      const usuario = await biblioteca.cerrar(tokenDe(req));
      res.json({ mensaje: "Sesión cerrada.", nombre: usuario.nombre });
    });
  });

  app.get("/libro", (req, res) => {
    atender(res, async () => {
      res.json(await biblioteca.verLibro(tokenDe(req)));
    });
  });

  app.post("/prestamos", (req, res) => {
    atender(res, async () => {
      const resultado = await biblioteca.pedir(tokenDe(req));
      res.status(201).json(resultado);
    });
  });

  app.get("/prestamos/mio", (req, res) => {
    atender(res, async () => {
      res.json(await biblioteca.miPrestamo(tokenDe(req)));
    });
  });

  app.post("/prestamos/mio/devolucion", (req, res) => {
    atender(res, async () => {
      res.json(await biblioteca.devolverMio(tokenDe(req)));
    });
  });

  app.get("/prestamos", (req, res) => {
    atender(res, async () => {
      res.json(await biblioteca.listarPrestamos(tokenDe(req)));
    });
  });

  app.get("/copias", (req, res) => {
    atender(res, async () => {
      res.json(await biblioteca.listarCopias(tokenDe(req)));
    });
  });

  app.post("/prestamos/:id/devolucion", (req, res) => {
    atender(res, async () => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw new ReglaNegocio("No existe ese préstamo.", 404);
      }
      res.json(await biblioteca.devolverComoAdmin(tokenDe(req), id));
    });
  });

  return app;
}

function leer(req: Request): { nombre?: string; correo?: string; contrasena?: string } {
  const cuerpo = req.body as
    { nombre?: unknown; correo?: unknown; contrasena?: unknown } | undefined;
  return {
    nombre: typeof cuerpo?.nombre === "string" ? cuerpo.nombre : undefined,
    correo: typeof cuerpo?.correo === "string" ? cuerpo.correo : undefined,
    contrasena: typeof cuerpo?.contrasena === "string" ? cuerpo.contrasena : undefined,
  };
}

function tokenDe(req: Request): string | undefined {
  const encabezado = req.header("authorization");
  if (!encabezado) {
    return undefined;
  }
  const [esquema, token] = encabezado.split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !token?.trim()) {
    throw new ReglaNegocio(SESION, 401);
  }
  return token.trim();
}

function atender(res: Response, tarea: () => Promise<void>): void {
  void tarea().catch((error: unknown) => {
    if (res.headersSent) {
      return;
    }
    if (error instanceof ReglaNegocio) {
      res.status(error.codigo).json({ mensaje: error.message });
      return;
    }
    res.status(500).json({ mensaje: "No se pudo completar." });
  });
}
