import { Component, NgZone, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Unsubscribe } from 'firebase/firestore';
import { auth } from './firebase';
import { BibliotecaService, Copia, Prestamo, mensajeDeError } from './biblioteca.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  readonly titulo = 'El principito';
  readonly autor = 'Antoine de Saint-Exupéry';
  readonly cuentas = [
    { nombre: 'Ana', correo: 'ana@biblioteca.local', clave: 'ana123', rol: 'Cliente' },
    { nombre: 'Luis', correo: 'luis@biblioteca.local', clave: 'luis123', rol: 'Cliente' },
    { nombre: 'Admin', correo: 'admin@biblioteca.local', clave: 'admin123', rol: 'Administrador' },
  ];

  cargando = true;
  ocupado = false;
  sesion: { uid: string; nombre: string; rol: string } | null = null;
  copias: Copia[] = [];
  mio: Prestamo | null = null;
  prestamos: Prestamo[] = [];
  aviso: { tipo: 'ok' | 'error'; texto: string } | null = null;

  registro = { nombre: '', correo: '', contrasena: '' };
  ingreso = { correo: '', contrasena: '' };

  private dejarAuth: Unsubscribe | null = null;
  private dejarCopias: Unsubscribe | null = null;
  private dejarPrestamos: Unsubscribe | null = null;

  constructor(private biblioteca: BibliotecaService, private zone: NgZone) {
    void this.arrancar();
  }

  ngOnDestroy(): void {
    this.dejarAuth?.();
    this.cerrarDatos();
  }

  get libres(): number {
    return this.copias.filter((copia) => copia.estado === 'libre').length;
  }

  get activos(): Prestamo[] {
    return this.prestamos.filter((prestamo) => prestamo.estado === 'activo');
  }

  get devueltos(): Prestamo[] {
    return this.prestamos.filter((prestamo) => prestamo.estado === 'devuelto');
  }

  detalle(numero: number): Prestamo | undefined {
    return this.activos.find((prestamo) => prestamo.copia === numero);
  }

  fecha(valor: string | null): string {
    if (!valor) return '—';
    const instante = new Date(valor);
    if (Number.isNaN(instante.getTime())) return valor;
    return instante.toLocaleString('es-AR');
  }

  async crearCuenta(): Promise<void> {
    this.ocupado = true;
    try {
      const mensaje = await this.biblioteca.registrar(
        this.registro.nombre,
        this.registro.correo,
        this.registro.contrasena,
      );
      this.ingreso.correo = this.registro.correo.trim().toLowerCase();
      this.registro = { nombre: '', correo: '', contrasena: '' };
      this.mostrar('ok', `${mensaje} Ya podés ingresar.`);
    } catch (error) {
      this.mostrar('error', mensajeDeError(error));
    } finally {
      this.ocupado = false;
    }
  }

  async entrar(): Promise<void> {
    this.ocupado = true;
    try {
      await this.biblioteca.ingresar(this.ingreso.correo, this.ingreso.contrasena);
      this.ingreso.contrasena = '';
      this.aviso = null;
    } catch (error) {
      this.mostrar('error', mensajeDeError(error));
    } finally {
      this.ocupado = false;
    }
  }

  async salir(): Promise<void> {
    try {
      await this.biblioteca.salir();
      this.mostrar('ok', 'Sesión cerrada.');
    } catch (error) {
      this.mostrar('error', mensajeDeError(error));
    }
  }

  async pedir(): Promise<void> {
    await this.accion(() => this.biblioteca.pedir());
  }

  async devolver(): Promise<void> {
    await this.accion(() => this.biblioteca.devolverMio());
  }

  async devolverUno(id: string): Promise<void> {
    await this.accion(() => this.biblioteca.devolverAdmin(id));
  }

  private async arrancar(): Promise<void> {
    try {
      await this.biblioteca.prepararSesion();
      await this.biblioteca.inicializar();
    } catch (error) {
      this.mostrar('error', mensajeDeError(error));
    }
    this.dejarAuth = onAuthStateChanged(auth, (usuario) => {
      this.zone.run(() => {
        void this.alCambiarUsuario(usuario);
      });
    });
  }

  private async alCambiarUsuario(usuario: User | null): Promise<void> {
    this.cerrarDatos();
    if (!usuario) {
      this.sesion = null;
      this.copias = [];
      this.mio = null;
      this.prestamos = [];
      this.cargando = false;
      return;
    }
    const perfil = await this.biblioteca.perfil(usuario.uid);
    if (!perfil) {
      await this.biblioteca.salir();
      this.mostrar('error', 'Tenés que iniciar sesión.');
      this.cargando = false;
      return;
    }
    this.sesion = { uid: usuario.uid, nombre: perfil.nombre, rol: perfil.rol };
    const alFallar = (error: unknown) => {
      this.zone.run(() => this.mostrar('error', mensajeDeError(error)));
    };
    this.dejarCopias = this.biblioteca.escucharCopias((copias) => {
      this.zone.run(() => {
        this.copias = copias;
      });
    }, alFallar);
    if (perfil.rol === 'administrador') {
      this.dejarPrestamos = this.biblioteca.escucharTodos((prestamos) => {
        this.zone.run(() => {
          this.prestamos = prestamos;
        });
      }, alFallar);
    } else {
      this.dejarPrestamos = this.biblioteca.escucharMio(usuario.uid, (prestamo) => {
        this.zone.run(() => {
          this.mio = prestamo;
        });
      }, alFallar);
    }
    this.cargando = false;
  }

  private async accion(tarea: () => Promise<string>): Promise<void> {
    this.ocupado = true;
    try {
      this.mostrar('ok', await tarea());
    } catch (error) {
      this.mostrar('error', mensajeDeError(error));
    } finally {
      this.ocupado = false;
    }
  }

  private mostrar(tipo: 'ok' | 'error', texto: string): void {
    this.aviso = { tipo, texto };
  }

  private cerrarDatos(): void {
    this.dejarCopias?.();
    this.dejarPrestamos?.();
    this.dejarCopias = null;
    this.dejarPrestamos = null;
  }
}
