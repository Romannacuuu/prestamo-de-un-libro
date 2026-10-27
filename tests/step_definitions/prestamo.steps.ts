import assert from "node:assert/strict";
import {
  Before,
  Given,
  Then,
  When,
  World,
  setWorldConstructor,
  type IWorldOptions,
} from "@cucumber/cucumber";
import request from "supertest";
import type { Express } from "express";
import { Biblioteca } from "../../src/casos/biblioteca.js";
import { Memoria } from "../../src/datos/memoria.js";
import { crearApp } from "../../src/http/app.js";

interface PrestamoGuardado {
  id: number;
  estado: string;
  fecha_devolucion: string | null;
}

export class Mundo extends World {
  app!: Express;
  memoria!: Memoria;
  codigo = 0;
  mensaje = "";
  cuerpo: Record<string, unknown> = {};
  tokens = new Map<string, string>();
  correos = new Map<string, string>([
    ["Ana", "ana@biblioteca.local"],
    ["Luis", "luis@biblioteca.local"],
    ["Admin", "admin@biblioteca.local"],
  ]);
  claves = new Map<string, string>([
    ["Ana", "ana123"],
    ["Luis", "luis123"],
    ["Admin", "admin123"],
  ]);
  prestamos = new Map<string, PrestamoGuardado>();
  tokenCerrado = "";
  ultimaClave = "";
  paralelos: { codigo: number; mensaje: string }[] = [];

  constructor(opciones: IWorldOptions) {
    super(opciones);
  }
}

setWorldConstructor(Mundo);

Before(function (this: Mundo) {
  this.memoria = new Memoria();
  this.app = crearApp(new Biblioteca(this.memoria));
});

function guardar(mundo: Mundo, res: request.Response): void {
  const cuerpo = res.body as Record<string, unknown>;
  mundo.codigo = res.status;
  mundo.mensaje = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje : "";
  mundo.cuerpo = cuerpo;
}

async function entrar(mundo: Mundo, nombre: string): Promise<void> {
  const correo = mundo.correos.get(nombre);
  const clave = mundo.claves.get(nombre);
  assert.ok(correo && clave, `Falta la cuenta de ${nombre}`);
  const res = await request(mundo.app).post("/sesion").send({ correo, contrasena: clave });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  mundo.tokens.set(nombre, String(res.body.token));
}

async function ocupar(mundo: Mundo, cantidad: number): Promise<void> {
  for (let indice = 0; indice < cantidad; indice += 1) {
    const nombre = `Ocupa${indice}`;
    const correo = `ocupa${indice}@biblioteca.local`;
    const alta = await request(mundo.app).post("/registro").send({
      nombre,
      correo,
      contrasena: "clave123",
    });
    assert.equal(alta.status, 201, JSON.stringify(alta.body));
    mundo.correos.set(nombre, correo);
    mundo.claves.set(nombre, "clave123");
    await entrar(mundo, nombre);
    const token = mundo.tokens.get(nombre);
    const pedido = await request(mundo.app)
      .post("/prestamos")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(pedido.status, 201, JSON.stringify(pedido.body));
  }
}

Given("que no hay una sesión", function () {
  return;
});

Given(
  "que existe el cliente {string} con correo {string}",
  function (this: Mundo, nombre: string, correo: string) {
    assert.equal(this.correos.get(nombre), correo);
    assert.ok(this.memoria.porCorreo.has(correo));
  },
);

Given("que {string} inició sesión", async function (this: Mundo, nombre: string) {
  await entrar(this, nombre);
});

Given("que {string} ya pidió una copia", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token, `${nombre} no inició sesión`);
  const res = await request(this.app).post("/prestamos").set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  this.prestamos.set(nombre, res.body.prestamo as PrestamoGuardado);
});

Given("que queda una sola copia libre", async function (this: Mundo) {
  await ocupar(this, 4);
});

Given("que no quedan copias libres", async function (this: Mundo) {
  await ocupar(this, 5);
});

When(
  "se registra {string} con correo {string} y contraseña {string}",
  async function (this: Mundo, nombre: string, correo: string, contrasena: string) {
    this.ultimaClave = contrasena;
    const res = await request(this.app).post("/registro").send({ nombre, correo, contrasena });
    guardar(this, res);
    if (res.status === 201) {
      this.correos.set(nombre, correo.trim().toLowerCase());
      this.claves.set(nombre, contrasena);
    }
  },
);

When(
  "se ingresa con correo {string} y contraseña {string}",
  async function (this: Mundo, correo: string, contrasena: string) {
    const res = await request(this.app).post("/sesion").send({ correo, contrasena });
    guardar(this, res);
  },
);

When("{string} cierra la sesión", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  this.tokenCerrado = token;
  const res = await request(this.app).delete("/sesion").set("Authorization", `Bearer ${token}`);
  guardar(this, res);
  this.tokens.delete(nombre);
});

When("{string} intenta pedir con la sesión cerrada", async function (this: Mundo, _nombre: string) {
  const res = await request(this.app)
    .post("/prestamos")
    .set("Authorization", `Bearer ${this.tokenCerrado}`);
  guardar(this, res);
});

When("{string} consulta el libro", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  const res = await request(this.app).get("/libro").set("Authorization", `Bearer ${token}`);
  guardar(this, res);
});

When("alguien sin sesión consulta el libro", async function (this: Mundo) {
  const res = await request(this.app).get("/libro");
  guardar(this, res);
});

When("{string} pide una copia", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  const res = await request(this.app).post("/prestamos").set("Authorization", `Bearer ${token}`);
  guardar(this, res);
  const prestamo = res.body.prestamo as PrestamoGuardado | undefined;
  if (prestamo) {
    this.prestamos.set(nombre, prestamo);
  }
});

When(
  "{string} y {string} piden al mismo tiempo",
  async function (this: Mundo, una: string, otra: string) {
    const tokenUna = this.tokens.get(una);
    const tokenOtra = this.tokens.get(otra);
    assert.ok(tokenUna && tokenOtra);
    const [primera, segunda] = await Promise.all([
      request(this.app).post("/prestamos").set("Authorization", `Bearer ${tokenUna}`),
      request(this.app).post("/prestamos").set("Authorization", `Bearer ${tokenOtra}`),
    ]);
    this.paralelos = [primera, segunda].map((res) => ({
      codigo: res.status,
      mensaje: typeof res.body.mensaje === "string" ? res.body.mensaje : "",
    }));
    guardar(this, primera);
  },
);

When("{string} devuelve su copia", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  const res = await request(this.app)
    .post("/prestamos/mio/devolucion")
    .set("Authorization", `Bearer ${token}`);
  guardar(this, res);
  const prestamo = res.body.prestamo as PrestamoGuardado | undefined;
  if (prestamo) {
    this.prestamos.set(nombre, prestamo);
  }
});

When(
  "{string} intenta devolver el préstamo de {string}",
  async function (this: Mundo, quien: string, dueno: string) {
    const token = this.tokens.get(quien);
    const prestamo = this.prestamos.get(dueno);
    assert.ok(token && prestamo);
    const res = await request(this.app)
      .post(`/prestamos/${prestamo.id}/devolucion`)
      .set("Authorization", `Bearer ${token}`);
    guardar(this, res);
  },
);

When("{string} consulta todos los préstamos", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  const res = await request(this.app).get("/prestamos").set("Authorization", `Bearer ${token}`);
  guardar(this, res);
});

When("{string} consulta las copias", async function (this: Mundo, nombre: string) {
  const token = this.tokens.get(nombre);
  assert.ok(token);
  const res = await request(this.app).get("/copias").set("Authorization", `Bearer ${token}`);
  guardar(this, res);
});

When(
  "{string} devuelve el préstamo de {string}",
  async function (this: Mundo, quien: string, dueno: string) {
    const token = this.tokens.get(quien);
    const prestamo = this.prestamos.get(dueno);
    assert.ok(token && prestamo);
    const res = await request(this.app)
      .post(`/prestamos/${prestamo.id}/devolucion`)
      .set("Authorization", `Bearer ${token}`);
    guardar(this, res);
    const actualizado = res.body.prestamo as PrestamoGuardado | undefined;
    if (actualizado) {
      this.prestamos.set(dueno, actualizado);
    }
  },
);

Then("la respuesta es exitosa", function (this: Mundo) {
  assert.ok(this.codigo === 200 || this.codigo === 201, `código ${this.codigo}: ${this.mensaje}`);
});

Then("la respuesta es un rechazo", function (this: Mundo) {
  assert.equal(this.codigo, 400, this.mensaje);
});

Then("la respuesta es prohibida", function (this: Mundo) {
  assert.equal(this.codigo, 403, this.mensaje);
});

Then("la respuesta pide iniciar sesión", function (this: Mundo) {
  assert.equal(this.codigo, 401, this.mensaje);
});

Then("el mensaje es {string}", function (this: Mundo, esperado: string) {
  assert.equal(this.mensaje, esperado);
});

Then("el mensaje contiene {string}", function (this: Mundo, parte: string) {
  assert.ok(this.mensaje.includes(parte), this.mensaje);
});

Then("la contraseña no aparece en la respuesta", function (this: Mundo) {
  assert.equal(JSON.stringify(this.cuerpo).includes(this.ultimaClave), false);
});

Then("el almacén no contiene el texto {string}", function (this: Mundo, texto: string) {
  assert.equal(this.memoria.guardaTextoPlano(texto), false);
});

Then("el cuerpo incluye el título {string}", function (this: Mundo, titulo: string) {
  assert.equal(this.cuerpo.titulo, titulo);
});

Then("quedan {int} copias libres", async function (this: Mundo, esperadas: number) {
  let libres = this.cuerpo.libres;
  if (typeof libres !== "number") {
    const token = this.tokens.get("Ana") ?? this.tokens.get("Luis");
    assert.ok(token);
    const res = await request(this.app).get("/libro").set("Authorization", `Bearer ${token}`);
    libres = res.body.libres;
  }
  assert.equal(libres, esperadas);
});

Then("no quedan copias libres", async function (this: Mundo) {
  const token = this.tokens.get("Ana") ?? this.tokens.get("Luis");
  assert.ok(token);
  const res = await request(this.app).get("/libro").set("Authorization", `Bearer ${token}`);
  assert.equal(res.body.libres, 0);
});

Then("solo uno obtiene una copia", function (this: Mundo) {
  const ganaron = this.paralelos.filter((item) => item.codigo === 201);
  assert.equal(ganaron.length, 1, JSON.stringify(this.paralelos));
});

Then("el otro ve {string}", function (this: Mundo, mensaje: string) {
  const perdedor = this.paralelos.find((item) => item.codigo !== 201);
  assert.ok(perdedor, JSON.stringify(this.paralelos));
  assert.equal(perdedor.mensaje, mensaje);
});

Then("hay {int} copias en la respuesta", function (this: Mundo, cantidad: number) {
  const copias = this.cuerpo.copias;
  assert.ok(Array.isArray(copias));
  assert.equal(copias.length, cantidad);
});

Then("el préstamo de {string} queda devuelto", function (this: Mundo, nombre: string) {
  const prestamo = this.prestamos.get(nombre);
  assert.ok(prestamo, `No hay préstamo de ${nombre}`);
  assert.equal(prestamo.estado, "devuelto");
  assert.ok(prestamo.fecha_devolucion);
});
