import { nuevoToken, verificarClave } from "../domain/claves.js";
import {
  AUTOR,
  CORREO_REPETIDO,
  FALTAN_DATOS,
  INGRESO_INCORRECTO,
  NADA_PARA_DEVOLVER,
  NO_EXISTE,
  PERMISO,
  SESION,
  TITULO,
  YA_DEVUELTO,
  devolucionHecha,
  prestamoCreado,
} from "../domain/mensajes.js";
import { ReglaNegocio } from "../domain/regla.js";
import { numeroAPrestar, validarRegistro } from "../domain/reglas.js";
import { Memoria, type Prestamo, type Rol, type Usuario } from "../datos/memoria.js";

export interface PrestamoVista {
  id: number;
  copia: number;
  estado: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  cliente?: string;
}

export interface CopiaVista {
  numero: number;
  estado: string;
  cliente: string | null;
  fecha_prestamo: string | null;
}

export class Biblioteca {
  private cola: Promise<void> = Promise.resolve();

  constructor(readonly datos: Memoria) {}

  registrar(
    nombre: string | null | undefined,
    correo: string | null | undefined,
    contrasena: string | null | undefined,
  ) {
    return this.exclusivo(() => {
      const limpio = validarRegistro(nombre, correo, contrasena);
      if (this.datos.porCorreo.has(limpio.correo)) {
        throw new ReglaNegocio(CORREO_REPETIDO);
      }
      const usuario = this.datos.alta(
        limpio.nombre,
        limpio.correo,
        contrasena as string,
        "cliente",
      );
      return { nombre: usuario.nombre };
    });
  }

  ingresar(correo: string | null | undefined, contrasena: string | null | undefined) {
    return this.exclusivo(() => {
      const correoLimpio = (correo ?? "").trim().toLowerCase();
      if (!correoLimpio || !contrasena) {
        throw new ReglaNegocio(FALTAN_DATOS);
      }
      const id = this.datos.porCorreo.get(correoLimpio);
      const usuario = id === undefined ? undefined : this.datos.usuarios.get(id);
      const relleno = this.datos.usuarios.values().next().value;
      const hash = usuario?.claveHash ?? relleno?.claveHash ?? "";
      const coincide = hash !== "" && verificarClave(contrasena, hash);
      if (!usuario || !coincide) {
        throw new ReglaNegocio(INGRESO_INCORRECTO);
      }
      const token = nuevoToken();
      this.datos.sesiones.set(token, usuario.id);
      return { token, nombre: usuario.nombre, rol: usuario.rol };
    });
  }

  cerrar(token: string | undefined) {
    return this.exclusivo(() => {
      const usuario = this.usuarioDe(token);
      this.datos.sesiones.delete(token as string);
      return { nombre: usuario.nombre };
    });
  }

  verLibro(token: string | undefined) {
    return this.exclusivo(() => {
      this.exigirRol(token, "cliente");
      return {
        titulo: TITULO,
        autor: AUTOR,
        total: this.datos.copias.length,
        libres: this.datos.numerosLibres().length,
      };
    });
  }

  pedir(token: string | undefined) {
    return this.exclusivo(() => {
      const usuario = this.exigirRol(token, "cliente");
      const tiene = this.datos.prestamoActivoDe(usuario.id) !== undefined;
      const numero = numeroAPrestar(this.datos.numerosLibres(), tiene);
      const prestamo = this.datos.marcarPrestada(usuario.id, numero);
      return {
        mensaje: prestamoCreado(numero),
        prestamo: this.vista(prestamo),
      };
    });
  }

  miPrestamo(token: string | undefined) {
    return this.exclusivo(() => {
      const usuario = this.exigirRol(token, "cliente");
      const activo = this.datos.prestamoActivoDe(usuario.id);
      return { prestamo: activo ? this.vista(activo) : null };
    });
  }

  devolverMio(token: string | undefined) {
    return this.exclusivo(() => {
      const usuario = this.exigirRol(token, "cliente");
      const activo = this.datos.prestamoActivoDe(usuario.id);
      if (!activo) {
        throw new ReglaNegocio(NADA_PARA_DEVOLVER);
      }
      const prestamo = this.datos.marcarDevuelto(activo.id);
      if (!prestamo) {
        throw new ReglaNegocio(NADA_PARA_DEVOLVER);
      }
      return {
        mensaje: devolucionHecha(prestamo.copia),
        prestamo: this.vista(prestamo),
      };
    });
  }

  listarPrestamos(token: string | undefined) {
    return this.exclusivo(() => {
      this.exigirRol(token, "administrador");
      const prestamos = [...this.datos.prestamos]
        .reverse()
        .map((prestamo) => this.vista(prestamo, true));
      return { prestamos };
    });
  }

  listarCopias(token: string | undefined) {
    return this.exclusivo(() => {
      this.exigirRol(token, "administrador");
      const copias: CopiaVista[] = this.datos.copias.map((copia) => {
        const activo = this.datos.prestamos.find(
          (prestamo) => prestamo.copia === copia.numero && prestamo.estado === "activo",
        );
        const dueno = activo ? this.datos.usuarios.get(activo.usuarioId) : undefined;
        return {
          numero: copia.numero,
          estado: copia.estado,
          cliente: dueno?.nombre ?? null,
          fecha_prestamo: activo?.fechaPrestamo ?? null,
        };
      });
      return { copias };
    });
  }

  devolverComoAdmin(token: string | undefined, prestamoId: number) {
    return this.exclusivo(() => {
      this.exigirRol(token, "administrador");
      const prestamo = this.datos.prestamos.find((item) => item.id === prestamoId);
      if (!prestamo) {
        throw new ReglaNegocio(NO_EXISTE, 404);
      }
      if (prestamo.estado !== "activo") {
        throw new ReglaNegocio(YA_DEVUELTO);
      }
      const devuelto = this.datos.marcarDevuelto(prestamo.id);
      if (!devuelto) {
        throw new ReglaNegocio(NO_EXISTE, 404);
      }
      return {
        mensaje: devolucionHecha(devuelto.copia),
        prestamo: this.vista(devuelto, true),
      };
    });
  }

  private vista(prestamo: Prestamo, conCliente = false): PrestamoVista {
    const vista: PrestamoVista = {
      id: prestamo.id,
      copia: prestamo.copia,
      estado: prestamo.estado,
      fecha_prestamo: prestamo.fechaPrestamo,
      fecha_devolucion: prestamo.fechaDevolucion,
    };
    if (conCliente) {
      vista.cliente = this.datos.usuarios.get(prestamo.usuarioId)?.nombre ?? "";
    }
    return vista;
  }

  private usuarioDe(token: string | undefined): Usuario {
    if (!token) {
      throw new ReglaNegocio(SESION, 401);
    }
    const id = this.datos.sesiones.get(token);
    if (id === undefined) {
      throw new ReglaNegocio(SESION, 401);
    }
    const usuario = this.datos.usuarios.get(id);
    if (!usuario) {
      throw new ReglaNegocio(SESION, 401);
    }
    return usuario;
  }

  private exigirRol(token: string | undefined, rol: Rol): Usuario {
    const usuario = this.usuarioDe(token);
    if (usuario.rol !== rol) {
      throw new ReglaNegocio(PERMISO, 403);
    }
    return usuario;
  }

  private exclusivo<T>(tarea: () => T): Promise<T> {
    const resultado = this.cola.then(() => tarea());
    this.cola = resultado.then(
      () => undefined,
      () => undefined,
    );
    return resultado;
  }
}
