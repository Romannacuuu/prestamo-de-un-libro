import { WebSocketServer, WebSocket } from 'ws';

export function inicializarWebSocket(puerto: number = 8080) {
    const wss = new WebSocketServer({ port: puerto });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Cliente WS conectado');

        ws.on('message', (mensaje: Buffer) => {
            wss.clients.forEach((cliente) => {
                if (cliente.readyState === WebSocket.OPEN) {
                    cliente.send(mensaje.toString());
                }
            });
        });

        ws.on('close', () => console.log('Cliente WS desconectado'));
    });

    console.log(`Servidor WebSocket inicializado en el puerto ${puerto}`);
    return wss;
}