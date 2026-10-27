import request from "supertest";
import { describe, expect, it } from "vitest";
import { Biblioteca } from "../../src/casos/biblioteca.js";
import { Memoria } from "../../src/datos/memoria.js";
import { crearApp } from "../../src/http/app.js";

async function entrar(app: ReturnType<typeof crearApp>, correo: string, contrasena: string) {
  const respuesta = await request(app).post("/sesion").send({ correo, contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.body.token as string;
}

describe("API de préstamo", () => {
  it("recorre cuenta, libro, pedido, devolución y roles", async () => {
    const memoria = new Memoria();
    const app = crearApp(new Biblioteca(memoria));
    const correo = "visita@biblioteca.local";

    const creada = await request(app).post("/registro").send({
      nombre: "Visita",
      correo,
      contrasena: "clave123",
    });
    expect(creada.status).toBe(201);
    expect(JSON.stringify(creada.body)).not.toContain("clave123");
    expect(memoria.guardaTextoPlano("clave123")).toBe(false);

    const repetida = await request(app).post("/registro").send({
      nombre: "Otra",
      correo,
      contrasena: "clave123",
    });
    expect(repetida.status).toBe(400);
    expect(repetida.body.mensaje).toBe("Ese correo ya está registrado.");

    const corta = await request(app).post("/registro").send({
      nombre: "Corta",
      correo: "corta@biblioteca.local",
      contrasena: "12345",
    });
    expect(corta.body.mensaje).toBe("La contraseña tiene que tener al menos 6 caracteres.");

    const incompleta = await request(app).post("/registro").send({ nombre: "Sin clave" });
    expect(incompleta.body.mensaje).toBe("Faltan datos.");

    const mal = await request(app).post("/sesion").send({
      correo: "ana@biblioteca.local",
      contrasena: "mal",
    });
    expect(mal.body.mensaje).toBe("Correo o contraseña incorrectos.");
    const inexistente = await request(app).post("/sesion").send({
      correo: "no-existe@biblioteca.local",
      contrasena: "ana123",
    });
    expect(inexistente.body.mensaje).toBe("Correo o contraseña incorrectos.");

    const sinSesion = await request(app).get("/libro");
    expect(sinSesion.status).toBe(401);

    const ana = await entrar(app, "ana@biblioteca.local", "ana123");
    const libro = await request(app).get("/libro").set("Authorization", `Bearer ${ana}`);
    expect(libro.body).toMatchObject({ titulo: "El principito", total: 5, libres: 5 });

    const pedido = await request(app).post("/prestamos").set("Authorization", `Bearer ${ana}`);
    expect(pedido.status).toBe(201);
    expect(pedido.body.mensaje).toBe("Te llevás la copia número 1.");

    const segundo = await request(app).post("/prestamos").set("Authorization", `Bearer ${ana}`);
    expect(segundo.status).toBe(400);
    expect(segundo.body.mensaje).toBe("Ya tenés una copia. Devolvela antes de pedir otra.");

    const luis = await entrar(app, "luis@biblioteca.local", "luis123");
    const ajeno = await request(app)
      .post(`/prestamos/${pedido.body.prestamo.id}/devolucion`)
      .set("Authorization", `Bearer ${luis}`);
    expect(ajeno.status).toBe(403);

    const listaAjena = await request(app).get("/prestamos").set("Authorization", `Bearer ${ana}`);
    expect(listaAjena.status).toBe(403);
    expect(listaAjena.body.mensaje).toBe("No podés hacer esta acción.");

    const devuelta = await request(app)
      .post("/prestamos/mio/devolucion")
      .set("Authorization", `Bearer ${ana}`);
    expect(devuelta.body.mensaje).toBe("Devolviste la copia número 1.");
    expect(devuelta.body.prestamo.estado).toBe("devuelto");
    expect(devuelta.body.prestamo.fecha_devolucion).toBeTruthy();

    const nada = await request(app)
      .post("/prestamos/mio/devolucion")
      .set("Authorization", `Bearer ${ana}`);
    expect(nada.body.mensaje).toBe("No tenés una copia para devolver.");

    const admin = await entrar(app, "admin@biblioteca.local", "admin123");
    const adminPide = await request(app).post("/prestamos").set("Authorization", `Bearer ${admin}`);
    expect(adminPide.status).toBe(403);
    const copias = await request(app).get("/copias").set("Authorization", `Bearer ${admin}`);
    expect(copias.body.copias).toHaveLength(5);

    const cerrada = await request(app).delete("/sesion").set("Authorization", `Bearer ${ana}`);
    expect(cerrada.status).toBe(200);
    const tokenViejo = await request(app).post("/prestamos").set("Authorization", `Bearer ${ana}`);
    expect(tokenViejo.status).toBe(401);
    const luisSigue = await request(app).get("/libro").set("Authorization", `Bearer ${luis}`);
    expect(luisSigue.status).toBe(200);
  });

  it("solo uno se lleva la última copia", async () => {
    const app = crearApp(new Biblioteca(new Memoria()));
    for (let indice = 0; indice < 4; indice += 1) {
      const correo = `ocupa${indice}@biblioteca.local`;
      await request(app)
        .post("/registro")
        .send({
          nombre: `Ocupa ${indice}`,
          correo,
          contrasena: "clave123",
        });
      const token = await entrar(app, correo, "clave123");
      const pedido = await request(app).post("/prestamos").set("Authorization", `Bearer ${token}`);
      expect(pedido.status).toBe(201);
    }

    const ana = await entrar(app, "ana@biblioteca.local", "ana123");
    const luis = await entrar(app, "luis@biblioteca.local", "luis123");
    const [uno, dos] = await Promise.all([
      request(app).post("/prestamos").set("Authorization", `Bearer ${ana}`),
      request(app).post("/prestamos").set("Authorization", `Bearer ${luis}`),
    ]);
    const codigos = [uno.status, dos.status].sort();
    expect(codigos).toEqual([201, 400]);
    const perdedor = uno.status === 400 ? uno : dos;
    expect(perdedor.body.mensaje).toBe("No hay copias libres.");

    const libro = await request(app).get("/libro").set("Authorization", `Bearer ${ana}`);
    expect(libro.body.libres).toBe(0);
  });
});
