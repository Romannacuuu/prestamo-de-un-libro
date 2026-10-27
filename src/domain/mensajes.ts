export const SESION = "Tenés que iniciar sesión.";
export const PERMISO = "No podés hacer esta acción.";
export const CORREO_REPETIDO = "Ese correo ya está registrado.";
export const INGRESO_INCORRECTO = "Correo o contraseña incorrectos.";
export const FALTAN_DATOS = "Faltan datos.";
export const CLAVE_CORTA = "La contraseña tiene que tener al menos 6 caracteres.";
export const SIN_STOCK = "No hay copias libres.";
export const YA_TIENE = "Ya tenés una copia. Devolvela antes de pedir otra.";
export const NADA_PARA_DEVOLVER = "No tenés una copia para devolver.";
export const YA_DEVUELTO = "Ese préstamo ya fue devuelto.";
export const NO_EXISTE = "No existe ese préstamo.";

export const TITULO = "El principito";
export const AUTOR = "Antoine de Saint-Exupéry";

export function prestamoCreado(numero: number): string {
  return `Te llevás la copia número ${numero}.`;
}

export function devolucionHecha(numero: number): string {
  return `Devolviste la copia número ${numero}.`;
}
