import { CLAVE_CORTA, FALTAN_DATOS, SIN_STOCK, YA_TIENE } from "./mensajes.js";
import { ReglaNegocio } from "./regla.js";

export function validarRegistro(
  nombre: string | null | undefined,
  correo: string | null | undefined,
  contrasena: string | null | undefined,
): { nombre: string; correo: string } {
  const nombreLimpio = (nombre ?? "").trim();
  const correoLimpio = (correo ?? "").trim().toLowerCase();
  if (!nombreLimpio || !correoLimpio || !contrasena) {
    throw new ReglaNegocio(FALTAN_DATOS);
  }
  if (contrasena.length < 6) {
    throw new ReglaNegocio(CLAVE_CORTA);
  }
  return { nombre: nombreLimpio, correo: correoLimpio };
}

/** Copia libre de número más bajo. Null si no queda ninguna. */
export function elegirCopia(numerosLibres: readonly number[]): number | null {
  if (numerosLibres.length === 0) {
    return null;
  }
  return Math.min(...numerosLibres);
}

export function numeroAPrestar(numerosLibres: readonly number[], tieneActivo: boolean): number {
  if (tieneActivo) {
    throw new ReglaNegocio(YA_TIENE);
  }
  const copia = elegirCopia(numerosLibres);
  if (copia === null) {
    throw new ReglaNegocio(SIN_STOCK);
  }
  return copia;
}
