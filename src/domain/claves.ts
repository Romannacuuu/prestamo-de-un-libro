import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERACIONES = 20_000;

export function hashClave(clave: string): string {
  const sal = randomBytes(16);
  const digest = pbkdf2Sync(clave, sal, ITERACIONES, 32, "sha256");
  return `pbkdf2_sha256$${ITERACIONES}$${sal.toString("hex")}$${digest.toString("hex")}`;
}

export function verificarClave(clave: string, guardada: string): boolean {
  try {
    const [algoritmo, iteraciones, salHex, digestHex] = guardada.split("$");
    if (algoritmo !== "pbkdf2_sha256" || !iteraciones || !salHex || !digestHex) {
      return false;
    }
    const calculado = pbkdf2Sync(
      clave,
      Buffer.from(salHex, "hex"),
      Number(iteraciones),
      32,
      "sha256",
    );
    const esperado = Buffer.from(digestHex, "hex");
    if (calculado.length !== esperado.length) {
      return false;
    }
    return timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

export function nuevoToken(): string {
  return randomBytes(32).toString("base64url");
}
