import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import { AppComponent } from './app.component';
import { BibliotecaService, mensajeDeError } from './biblioteca.service';

describe('mensajes de la pantalla', () => {
  it('traduce el rechazo de Firebase al texto del pedido', () => {
    expect(mensajeDeError(new Error('No hay copias libres.'))).toBe('No hay copias libres.');
    expect(mensajeDeError(new FirebaseError('auth/invalid-credential', 'firebase'))).toBe(
      'Correo o contraseña incorrectos.',
    );
    expect(mensajeDeError(new FirebaseError('auth/email-already-in-use', 'firebase'))).toBe(
      'Ese correo ya está registrado.',
    );
    expect(mensajeDeError(new FirebaseError('auth/weak-password', 'firebase'))).toBe(
      'La contraseña tiene que tener al menos 6 caracteres.',
    );
    expect(mensajeDeError(new FirebaseError('permission-denied', 'firebase'))).toBe(
      'No podés hacer esta acción.',
    );
    expect(mensajeDeError(null)).toBe('No se pudo completar.');
  });
});

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: BibliotecaService,
          useValue: {
            prepararSesion: () => Promise.resolve(),
            inicializar: () => Promise.resolve(),
            perfil: () => Promise.resolve(null),
            salir: () => Promise.resolve(),
            escucharCopias: () => () => undefined,
            escucharTodos: () => () => undefined,
            escucharMio: () => () => undefined,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('el visitante ve el alta y el ingreso, y no ve Pedir', () => {
    const componente = fixture.componentInstance;
    componente.cargando = false;
    componente.sesion = null;
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Crear cuenta');
    expect(texto).toContain('Ingresar');
    expect(texto).toContain('El principito');
    expect(fixture.nativeElement.querySelector('button.accion')).toBeNull();
  });

  it('el cliente ve las libres y Pedir, y el administrador no puede pedirse un libro', () => {
    const componente = fixture.componentInstance;
    componente.cargando = false;
    componente.copias = [
      { numero: 1, estado: 'libre' },
      { numero: 2, estado: 'prestada' },
      { numero: 3, estado: 'libre' },
      { numero: 4, estado: 'libre' },
      { numero: 5, estado: 'libre' },
    ];
    componente.sesion = { uid: 'ana', nombre: 'Ana', rol: 'cliente' };
    componente.mio = {
      id: 'p1',
      copia: 2,
      estado: 'activo',
      cliente: 'Ana',
      fechaPrestamo: '2026-10-27T12:00:00.000Z',
      fechaDevolucion: null,
    };
    fixture.detectChanges();

    const cliente = fixture.nativeElement as HTMLElement;
    expect(cliente.textContent).toContain('Pedir');
    expect(cliente.textContent).toContain('Devolver');
    expect(componente.libres).toBe(4);
    expect(cliente.querySelectorAll('button.accion').length).toBe(2);

    componente.sesion = { uid: 'admin', nombre: 'Admin', rol: 'administrador' };
    componente.prestamos = [
      componente.mio,
      {
        id: 'p0',
        copia: 1,
        estado: 'devuelto',
        cliente: 'Luis',
        fechaPrestamo: '2026-10-20T12:00:00.000Z',
        fechaDevolucion: '2026-10-21T12:00:00.000Z',
      },
    ];
    fixture.detectChanges();

    const admin = fixture.nativeElement as HTMLElement;
    expect(admin.textContent).toContain('Préstamos activos');
    expect(admin.textContent).toContain('Historial de devueltos');
    expect(admin.textContent).toContain('Ana');
    expect(admin.textContent).toContain('Luis');
    expect(admin.querySelector('button.accion')).toBeNull();
    expect(componente.activos.length).toBe(1);
    expect(componente.devueltos.length).toBe(1);
    expect(componente.detalle(2)?.cliente).toBe('Ana');
  });
});
