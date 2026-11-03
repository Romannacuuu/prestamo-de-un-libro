import { Biblioteca } from "./casos/biblioteca.js";
import { Memoria } from "./datos/memoria.js";
import { crearApp } from "./http/app.js";
import { inicializarWebSocket } from './websocket.js';

const puerto = Number(process.env.PORT ?? 8000);
const app = crearApp(new Biblioteca(new Memoria()));

app.listen(puerto, () => {
  console.log(`API en http://127.0.0.1:${puerto}`);
});
inicializarWebSocket(8080);