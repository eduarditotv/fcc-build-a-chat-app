import http from "http";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";

const PORT = 3001;

// 1. Servidor HTTP que sirve public/index.html
const server = http.createServer((req, res) => {
  fs.readFile("./public/index.html", (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading page");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

// 2. WebSocketServer sobre el servidor HTTP
const wss = new WebSocketServer({ server });

// Función auxiliar: enviar a todos los clientes conectados
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 3. Listener de conexión
wss.on("connection", (socket, req) => {
  // 4. Leer el username del query string
  const username = new URL(req.url, "http://localhost").searchParams.get(
    "username",
  );

  // Mensaje de sistema: alguien entró
  broadcast({ type: "system", text: `${username} joined` });

  // 5. Mensajes entrantes: reenviar a todos (incluido el emisor)
  socket.on("message", (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return; // ignorar JSON inválido
    }
    const { username, text } = parsed;
    broadcast({ type: "chat", username, text });
  });

  // 6. Cierre: avisar a los que quedan
  socket.on("close", () => {
    broadcast({ type: "system", text: `${username} left` });
  });
});

// 7. Arrancar el servidor
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});