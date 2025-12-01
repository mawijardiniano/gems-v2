const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: { origin: '*' },
  });

  global.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    socket.on('message', (msg) => io.emit('message', `Echo: ${msg}`));

    socket.on('disconnect', () => console.log('Client disconnected', socket.id));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`> Ready on http://localhost:${PORT}`));
});
