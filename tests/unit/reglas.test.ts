import { describe, expect, it } from "vitest";
import { hashClave, verificarClave } from "../../src/domain/claves.js";
import { CLAVE_CORTA, FALTAN_DATOS, SIN_STOCK, YA_TIENE } from "../../src/domain/mensajes.js";
import { ReglaNegocio } from "../../src/domain/regla.js";
import { elegirCopia, numeroAPrestar, validarRegistro } from "../../src/domain/reglas.js";

describe("elegir copia", () => {
  it("toma la libre de número más bajo aunque la lista venga desordenada", () => {
    expect(elegirCopia([3, 1, 5])).toBe(1);
  });

  it("con una sola libre asigna esa", () => {
    expect(elegirCopia([4])).toBe(4);
  });

  it("sin libres no elige ninguna", () => {
    expect(elegirCopia([])).toBeNull();
  });
});

describe("pedir", () => {
  it("rechaza un segundo préstamo aunque haya stock", () => {
    expect(() => numeroAPrestar([1, 2], true)).toThrow(YA_TIENE);
  });

  it("rechaza cuando no hay stock y no cambia la elección", () => {
    try {
      numeroAPrestar([], false);
      expect.fail("tenía que rechazar");
    } catch (error) {
      expect(error).toBeInstanceOf(ReglaNegocio);
      expect((error as ReglaNegocio).message).toBe(SIN_STOCK);
    }
  });
});

describe("registro", () => {
  it("recorta el nombre y pasa el correo a minúsculas", () => {
    expect(validarRegistro("  Ana  ", " ANA@Biblioteca.Local ", "clave123")).toEqual({
      nombre: "Ana",
      correo: "ana@biblioteca.local",
    });
  });

  it.each([
    ["", "ana@biblioteca.local", "clave123"],
    ["Ana", "", "clave123"],
    ["Ana", "ana@biblioteca.local", ""],
    ["   ", "ana@biblioteca.local", "clave123"],
  ])("no crea nada si faltan datos (%s, %s)", (nombre, correo, clave) => {
    expect(() => validarRegistro(nombre, correo, clave)).toThrow(FALTAN_DATOS);
  });

  it("rechaza 5 caracteres y acepta 6", () => {
    expect(() => validarRegistro("Ana", "ana@biblioteca.local", "12345")).toThrow(CLAVE_CORTA);
    expect(validarRegistro("Ana", "ana@biblioteca.local", "123456")).toEqual({
      nombre: "Ana",
      correo: "ana@biblioteca.local",
    });
  });
});

describe("contraseña", () => {
  it("guarda un hash y no el texto", () => {
    const guardada = hashClave("clave123");
    expect(guardada).not.toBe("clave123");
    expect(guardada.includes("clave123")).toBe(false);
    expect(verificarClave("clave123", guardada)).toBe(true);
    expect(verificarClave("otra", guardada)).toBe(false);
    expect(verificarClave("clave123", "texto-plano")).toBe(false);
  });
});
