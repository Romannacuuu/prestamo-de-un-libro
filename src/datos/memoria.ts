import { hashClave } from "../domain/claves.js";

export type Rol = "cliente" | "administrador";
export type EstadoCopia = "libre" | "prestada";
export type EstadoPrestamo = "activo" | "devuelto";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  claveHash: string;
  rol: Rol;
}

export interface Copia {
  numero: number;
  estado: EstadoCopia;
}

export interface Prestamo {
  id: number;
  usuarioId: number;
  copia: number;
  estado: EstadoPrestamo;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
}

export class Memoria {
  readonly usuarios = new Map<number, Usuario>();
  readonly porCorreo = new Map<string, number>();
  readonly sesiones = new Map<string, number>();
  readonly copias: Copia[] = [1, 2, 3, 4, 5].map((numero) => ({ numero, estado: "libre" }));
  readonly prestamos: Prestamo[] = [];
  private siguienteUsuario = 1;
  private siguientePrestamo = 1;

  constructor() {
    this.alta("Ana", "ana@biblioteca.local", "ana123", "cliente");
    this.alta("Luis", "luis@biblioteca.local", "luis123", "cliente");
    this.alta("Admin", "admin@biblioteca.local", "admin123", "administrador");
  }

  alta(nombre: string, correo: string, clave: string, rol: Rol): Usuario {
    const usuario: Usuario = {
      id: this.siguienteUsuario,
      nombre,
      correo,
      claveHash: hashClave(clave),
      rol,
    };
    this.siguienteUsuario += 1;
    this.usuarios.set(usuario.id, usuario);
    this.porCorreo.set(correo, usuario.id);
    return usuario;
  }

  guardaTextoPlano(texto: string): boolean {
    for (const usuario of this.usuarios.values()) {
      if (usuario.claveHash.includes(texto)) {
        return true;
      }
    }
    return false;
  }

  numerosLibres(): number[] {
    return this.copias.filter((copia) => copia.estado === "libre").map((copia) => copia.numero);
  }

  prestamoActivoDe(usuarioId: number): Prestamo | undefined {
    return this.prestamos.find(
      (prestamo) => prestamo.usuarioId === usuarioId && prestamo.estado === "activo",
    );
  }

  marcarPrestada(usuarioId: number, numero: number): Prestamo {
    const copia = this.copias.find((item) => item.numero === numero);
    if (!copia || copia.estado !== "libre") {
      throw new Error("La copia elegida ya no está libre.");
    }
    copia.estado = "prestada";
    const prestamo: Prestamo = {
      id: this.siguientePrestamo,
      usuarioId,
      copia: numero,
      estado: "activo",
      fechaPrestamo: new Date().toISOString(),
      fechaDevolucion: null,
    };
    this.siguientePrestamo += 1;
    this.prestamos.push(prestamo);
    return prestamo;
  }

  marcarDevuelto(prestamoId: number): Prestamo | undefined {
    const prestamo = this.prestamos.find((item) => item.id === prestamoId);
    if (!prestamo) {
      return undefined;
    }
    prestamo.estado = "devuelto";
    prestamo.fechaDevolucion = new Date().toISOString();
    const copia = this.copias.find((item) => item.numero === prestamo.copia);
    if (copia) {
      copia.estado = "libre";
    }
    return prestamo;
  }
}
