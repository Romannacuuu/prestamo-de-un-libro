import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, authAlta, db, dbAlta } from './firebase';

export interface Prestamo {
  id: string;
  copia: number;
  estado: string;
  cliente: string;
  fechaPrestamo: string | null;
  fechaDevolucion: string | null;
}

export interface Copia {
  numero: number;
  estado: string;
}

export interface Perfil {
  nombre: string;
  rol: string;
  correo: string;
}

const DEMOS = [
  { nombre: 'Ana', correo: 'ana@biblioteca.local', clave: 'ana123', rol: 'cliente' },
  { nombre: 'Luis', correo: 'luis@biblioteca.local', clave: 'luis123', rol: 'cliente' },
  { nombre: 'Admin', correo: 'admin@biblioteca.local', clave: 'admin123', rol: 'administrador' },
] as const;

const STOCK = doc(db, 'biblioteca', 'stock');

@Injectable({ providedIn: 'root' })
export class BibliotecaService {
  private sesionLista: Promise<void> | null = null;

  prepararSesion(): Promise<void> {
    this.sesionLista ??= setPersistence(auth, browserSessionPersistence);
    return this.sesionLista;
  }

  async inicializar(): Promise<void> {
    await setPersistence(authAlta, inMemoryPersistence);
    for (const demo of DEMOS) await this.asegurarUsuario(demo);
    await this.asegurarStock();
  }

  async registrar(nombre: string, correo: string, contrasena: string): Promise<string> {
    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    if (!nombreLimpio || !correoLimpio || !contrasena) throw new Error('Faltan datos.');
    if (contrasena.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.');
    const credencial = await createUserWithEmailAndPassword(authAlta, correoLimpio, contrasena);
    await setDoc(doc(dbAlta, 'usuarios', credencial.user.uid), {
      nombre: nombreLimpio,
      correo: correoLimpio,
      rol: 'cliente',
      prestamoActivoId: null,
    });
    await signOut(authAlta);
    return 'Cuenta creada.';
  }

  async ingresar(correo: string, contrasena: string): Promise<void> {
    await this.prepararSesion();
    await signInWithEmailAndPassword(auth, correo.trim().toLowerCase(), contrasena);
  }

  salir(): Promise<void> {
    return signOut(auth);
  }

  async perfil(uid: string): Promise<Perfil | null> {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (!snap.exists()) return null;
    const datos = snap.data();
    return {
      nombre: String(datos['nombre'] ?? ''),
      rol: String(datos['rol'] ?? 'cliente'),
      correo: String(datos['correo'] ?? ''),
    };
  }

  async pedir(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Tenés que iniciar sesión.');
    const numero = await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'usuarios', uid);
      const usuario = (await tx.get(userRef)).data();
      const stock = (await tx.get(STOCK)).data();
      if (!usuario || usuario['rol'] !== 'cliente') throw new Error('No podés hacer esta acción.');
      if (usuario['prestamoActivoId']) {
        throw new Error('Ya tenés una copia. Devolvela antes de pedir otra.');
      }
      const libre = [1, 2, 3, 4, 5].find((copia) => stock?.[`c${copia}`] === 'libre');
      if (!libre) throw new Error('No hay copias libres.');
      const prestamoRef = doc(collection(db, 'prestamos'));
      const datos = () => ({
        usuarioId: uid,
        cliente: usuario['nombre'],
        copia: libre,
        estado: 'activo',
        fechaPrestamo: serverTimestamp(),
        fechaDevolucion: null,
      });
      tx.update(STOCK, { [`c${libre}`]: 'prestada' });
      tx.update(userRef, { prestamoActivoId: prestamoRef.id });
      tx.set(prestamoRef, datos());
      tx.set(doc(db, 'panel', prestamoRef.id), datos());
      return libre;
    });
    return `Te llevás la copia número ${numero}.`;
  }

  async devolverMio(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Tenés que iniciar sesión.');
    const numero = await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'usuarios', uid);
      const usuario = (await tx.get(userRef)).data();
      const activoId = usuario?.['prestamoActivoId'] as string | null;
      if (!activoId) throw new Error('No tenés una copia para devolver.');
      const prestamoRef = doc(db, 'prestamos', activoId);
      const prestamo = (await tx.get(prestamoRef)).data();
      await tx.get(STOCK);
      if (!prestamo || prestamo['usuarioId'] !== uid) throw new Error('No tenés una copia para devolver.');
      const copia = Number(prestamo['copia']);
      this.marcarDevuelto(tx, {
        prestamoRef,
        panelRef: doc(db, 'panel', activoId),
        userRef,
        copia,
      });
      return copia;
    });
    return `Devolviste la copia número ${numero}.`;
  }

  async devolverAdmin(id: string): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Tenés que iniciar sesión.');
    const numero = await runTransaction(db, async (tx) => {
      const admin = (await tx.get(doc(db, 'usuarios', uid))).data();
      if (admin?.['rol'] !== 'administrador') throw new Error('No podés hacer esta acción.');
      const panelRef = doc(db, 'panel', id);
      const prestamoSnap = await tx.get(panelRef);
      if (!prestamoSnap.exists()) throw new Error('No existe ese préstamo.');
      const prestamo = prestamoSnap.data();
      if (prestamo['estado'] !== 'activo') throw new Error('Ese préstamo ya fue devuelto.');
      await tx.get(STOCK);
      const duenoRef = doc(db, 'usuarios', String(prestamo['usuarioId']));
      await tx.get(duenoRef);
      const copia = Number(prestamo['copia']);
      this.marcarDevuelto(tx, {
        prestamoRef: doc(db, 'prestamos', id),
        panelRef,
        userRef: duenoRef,
        copia,
      });
      return copia;
    });
    return `Devolviste la copia número ${numero}.`;
  }

  escucharCopias(alCambiar: (copias: Copia[]) => void, alFallar?: (error: unknown) => void): Unsubscribe {
    return onSnapshot(STOCK, (snap) => {
      const datos = snap.data() ?? {};
      alCambiar([1, 2, 3, 4, 5].map((numero) => ({
        numero,
        estado: String(datos[`c${numero}`] ?? 'libre'),
      })));
    }, (error) => alFallar?.(error));
  }

  escucharMio(uid: string, alCambiar: (prestamo: Prestamo | null) => void, alFallar?: (error: unknown) => void): Unsubscribe {
    const consulta = query(
      collection(db, 'prestamos'),
      where('usuarioId', '==', uid),
      where('estado', '==', 'activo'),
    );
    return onSnapshot(consulta, (snap) => {
      const primero = snap.docs[0];
      alCambiar(primero ? this.leerPrestamo(primero.id, primero.data()) : null);
    }, (error) => alFallar?.(error));
  }

  escucharTodos(alCambiar: (prestamos: Prestamo[]) => void, alFallar?: (error: unknown) => void): Unsubscribe {
    return onSnapshot(collection(db, 'panel'), (snap) => {
      const prestamos = snap.docs.map((item) => this.leerPrestamo(item.id, item.data()));
      prestamos.sort((a, b) => (b.fechaPrestamo ?? '').localeCompare(a.fechaPrestamo ?? ''));
      alCambiar(prestamos);
    }, (error) => alFallar?.(error));
  }

  private marcarDevuelto(
    tx: { update: (ref: ReturnType<typeof doc>, datos: object) => void },
    refs: { prestamoRef: ReturnType<typeof doc>; panelRef: ReturnType<typeof doc>; userRef: ReturnType<typeof doc>; copia: number },
  ): void {
    tx.update(STOCK, { [`c${refs.copia}`]: 'libre' });
    tx.update(refs.userRef, { prestamoActivoId: null });
    tx.update(refs.prestamoRef, { estado: 'devuelto', fechaDevolucion: serverTimestamp() });
    tx.update(refs.panelRef, { estado: 'devuelto', fechaDevolucion: serverTimestamp() });
  }

  private async asegurarUsuario(demo: (typeof DEMOS)[number]): Promise<void> {
    try {
      const credencial = await createUserWithEmailAndPassword(authAlta, demo.correo, demo.clave);
      await setDoc(doc(dbAlta, 'usuarios', credencial.user.uid), {
        nombre: demo.nombre,
        correo: demo.correo,
        rol: demo.rol,
        prestamoActivoId: null,
      });
      await signOut(authAlta);
    } catch (error) {
      if (!(error instanceof FirebaseError) || error.code !== 'auth/email-already-in-use') throw error;
      const credencial = await signInWithEmailAndPassword(authAlta, demo.correo, demo.clave);
      const ref = doc(dbAlta, 'usuarios', credencial.user.uid);
      if (!(await getDoc(ref)).exists()) {
        await setDoc(ref, {
          nombre: demo.nombre,
          correo: demo.correo,
          rol: demo.rol,
          prestamoActivoId: null,
        });
      }
      await signOut(authAlta);
    }
  }

  private async asegurarStock(): Promise<void> {
    const credencial = await signInWithEmailAndPassword(authAlta, DEMOS[2].correo, DEMOS[2].clave);
    const stockAlta = doc(dbAlta, 'biblioteca', 'stock');
    const snap = await getDoc(stockAlta);
    if (!snap.exists()) {
      await setDoc(stockAlta, { c1: 'libre', c2: 'libre', c3: 'libre', c4: 'libre', c5: 'libre' });
    }
    if (!credencial.user) return;
    await signOut(authAlta);
  }

  private leerPrestamo(id: string, datos: Record<string, unknown>): Prestamo {
    return {
      id,
      copia: Number(datos['copia']),
      estado: String(datos['estado'] ?? ''),
      cliente: String(datos['cliente'] ?? ''),
      fechaPrestamo: this.iso(datos['fechaPrestamo']),
      fechaDevolucion: this.iso(datos['fechaDevolucion']),
    };
  }

  private iso(valor: unknown): string | null {
    if (!valor) return null;
    if (valor instanceof Timestamp) return valor.toDate().toISOString();
    if (typeof valor === 'object' && valor !== null && 'toDate' in valor) {
      return (valor as Timestamp).toDate().toISOString();
    }
    return null;
  }
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof Error && !(error instanceof FirebaseError) && error.message) return error.message;
  if (error instanceof FirebaseError) {
    if (
      error.code === 'auth/invalid-credential'
      || error.code === 'auth/user-not-found'
      || error.code === 'auth/wrong-password'
      || error.code === 'auth/invalid-email'
    ) {
      return 'Correo o contraseña incorrectos.';
    }
    if (error.code === 'auth/email-already-in-use') return 'Ese correo ya está registrado.';
    if (error.code === 'auth/weak-password') return 'La contraseña tiene que tener al menos 6 caracteres.';
    if (error.code === 'permission-denied') return 'No podés hacer esta acción.';
    if (error.message) return error.message;
  }
  return 'No se pudo completar.';
}
