// La pantalla solo muestra lo que dice la API. Las reglas se deciden en el servidor.
const API = `http://${location.hostname}:8000`;

const avisoEl = document.querySelector("#aviso");
const visitante = document.querySelector("#visitante");
const cliente = document.querySelector("#cliente");
const admin = document.querySelector("#admin");

function leerSesion() {
  const token = sessionStorage.getItem("token");
  const nombre = sessionStorage.getItem("nombre");
  const rol = sessionStorage.getItem("rol");
  if (!token || !nombre || !rol) return null;
  return { token, nombre, rol };
}

function guardarSesion(datos) {
  sessionStorage.setItem("token", datos.token);
  sessionStorage.setItem("nombre", datos.nombre);
  sessionStorage.setItem("rol", datos.rol);
}

function limpiarSesion() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("nombre");
  sessionStorage.removeItem("rol");
}

function mostrarAviso(tipo, texto) {
  avisoEl.hidden = false;
  avisoEl.className = `aviso ${tipo}`;
  avisoEl.textContent = texto;
}

function limpiarAviso() {
  avisoEl.hidden = true;
  avisoEl.textContent = "";
  avisoEl.className = "aviso";
}

function mostrarVisitante() {
  visitante.hidden = false;
  cliente.hidden = true;
  admin.hidden = true;
}

function fecha(valor) {
  if (!valor) return "—";
  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime())) return valor;
  return instante.toLocaleString("es-AR");
}

async function api(ruta, opciones = {}) {
  const headers = { ...(opciones.headers || {}) };
  if (opciones.body) headers["Content-Type"] = "application/json";
  const sesion = leerSesion();
  if (sesion) headers.Authorization = `Bearer ${sesion.token}`;

  let respuesta;
  try {
    respuesta = await fetch(API + ruta, { ...opciones, headers });
  } catch (_error) {
    throw new Error("No se pudo conectar con la API.");
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401) {
    limpiarSesion();
    mostrarVisitante();
  }
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "No se pudo completar.");
  }
  return datos;
}

function valores(formulario) {
  const datos = new FormData(formulario);
  return {
    nombre: datos.get("nombre") || "",
    correo: datos.get("correo") || "",
    contrasena: datos.get("contrasena") || "",
  };
}

async function cargarCliente() {
  const sesion = leerSesion();
  visitante.hidden = true;
  admin.hidden = true;
  cliente.hidden = false;
  document.querySelector("#saludo-cliente").textContent = `Hola, ${sesion.nombre}.`;

  const [libro, mio] = await Promise.all([
    api("/libro"),
    api("/prestamos/mio"),
  ]);

  document.querySelector("#titulo").textContent = libro.titulo;
  document.querySelector("#autor").textContent = libro.autor;
  document.querySelector("#total").textContent = libro.total;
  document.querySelector("#libres").textContent = libro.libres;

  const caja = document.querySelector("#mi-prestamo");
  if (mio.prestamo) {
    caja.hidden = false;
    document.querySelector("#mi-copia").textContent = mio.prestamo.copia;
    document.querySelector("#mi-fecha").textContent = fecha(mio.prestamo.fecha_prestamo);
  } else {
    caja.hidden = true;
  }
}

function fila(celdas) {
  const tr = document.createElement("tr");
  for (const celda of celdas) {
    const td = document.createElement("td");
    if (celda instanceof Node) td.append(celda);
    else td.textContent = celda;
    tr.append(td);
  }
  return tr;
}

async function cargarAdmin() {
  const sesion = leerSesion();
  visitante.hidden = true;
  cliente.hidden = true;
  admin.hidden = false;
  document.querySelector("#saludo-admin").textContent = `Hola, ${sesion.nombre}.`;

  const [copias, prestamos] = await Promise.all([
    api("/copias"),
    api("/prestamos"),
  ]);

  const cuerpoCopias = document.querySelector("#tabla-copias");
  cuerpoCopias.replaceChildren();
  for (const copia of copias.copias) {
    cuerpoCopias.append(fila([
      String(copia.numero),
      copia.estado,
      copia.cliente || "—",
      fecha(copia.fecha_prestamo),
    ]));
  }

  const activos = document.querySelector("#tabla-activos");
  const devueltos = document.querySelector("#tabla-devueltos");
  activos.replaceChildren();
  devueltos.replaceChildren();

  const lista = prestamos.prestamos;
  if (!lista.some((prestamo) => prestamo.estado === "activo")) {
    activos.append(fila(["—", "No hay préstamos activos", "—", ""]));
  }
  if (!lista.some((prestamo) => prestamo.estado === "devuelto")) {
    devueltos.append(fila(["—", "Todavía no hay devoluciones", "—", "—"]));
  }

  for (const prestamo of lista) {
    if (prestamo.estado === "activo") {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = "Devolver";
      boton.addEventListener("click", () => devolverComoAdmin(prestamo.id, boton));
      activos.append(fila([
        String(prestamo.copia),
        prestamo.cliente,
        fecha(prestamo.fecha_prestamo),
        boton,
      ]));
    } else {
      devueltos.append(fila([
        String(prestamo.copia),
        prestamo.cliente,
        fecha(prestamo.fecha_prestamo),
        fecha(prestamo.fecha_devolucion),
      ]));
    }
  }
}

async function entrarSegunRol() {
  const sesion = leerSesion();
  if (!sesion) {
    mostrarVisitante();
    return;
  }
  if (sesion.rol === "administrador") await cargarAdmin();
  else await cargarCliente();
}

document.querySelector("#form-registro").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = valores(evento.target);
  try {
    const resultado = await api("/registro", { method: "POST", body: JSON.stringify(datos) });
    mostrarAviso("ok", `${resultado.mensaje} Ya podés ingresar.`);
    document.querySelector("#form-ingreso [name=correo]").value = datos.correo;
    evento.target.reset();
  } catch (error) {
    mostrarAviso("error", error.message);
  }
});

document.querySelector("#form-ingreso").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = valores(evento.target);
  try {
    const resultado = await api("/sesion", { method: "POST", body: JSON.stringify(datos) });
    guardarSesion(resultado);
    limpiarAviso();
    await entrarSegunRol();
  } catch (error) {
    mostrarAviso("error", error.message);
  }
});

async function salir() {
  try {
    await api("/sesion", { method: "DELETE" });
    limpiarSesion();
    mostrarVisitante();
    mostrarAviso("ok", "Sesión cerrada.");
  } catch (error) {
    mostrarAviso("error", error.message);
  }
}

document.querySelector("#salir-cliente").addEventListener("click", salir);
document.querySelector("#salir-admin").addEventListener("click", salir);

document.querySelector("#pedir").addEventListener("click", async () => {
  const boton = document.querySelector("#pedir");
  boton.disabled = true;
  try {
    const resultado = await api("/prestamos", { method: "POST" });
    mostrarAviso("ok", resultado.mensaje);
  } catch (error) {
    mostrarAviso("error", error.message);
  }
  try {
    if (leerSesion()) await cargarCliente();
  } finally {
    boton.disabled = false;
  }
});

document.querySelector("#devolver").addEventListener("click", async () => {
  const boton = document.querySelector("#devolver");
  boton.disabled = true;
  try {
    const resultado = await api("/prestamos/mio/devolucion", { method: "POST" });
    mostrarAviso("ok", resultado.mensaje);
  } catch (error) {
    mostrarAviso("error", error.message);
  }
  try {
    if (leerSesion()) await cargarCliente();
  } finally {
    boton.disabled = false;
  }
});

async function devolverComoAdmin(id, boton) {
  boton.disabled = true;
  try {
    const resultado = await api(`/prestamos/${id}/devolucion`, { method: "POST" });
    mostrarAviso("ok", resultado.mensaje);
    await cargarAdmin();
  } catch (error) {
    mostrarAviso("error", error.message);
    boton.disabled = false;
  }
}

entrarSegunRol().catch((error) => {
  limpiarSesion();
  mostrarVisitante();
  mostrarAviso("error", error.message);
});
