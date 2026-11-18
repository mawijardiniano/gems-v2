const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

/* The value of one cookie from a raw Cookie header, or null. */
function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  /* Same-origin only (the default): `cors: '*'` let any website open a
     socket with a visitor's cookies. */
  const io = new Server(server);

  /* Only signed-in users get a socket. Every emit used to reach every
     connected socket, anonymous ones included; routes now send to a user's
     or a role's room (data/lib/realtime.js). The token is checked the same
     way requireAuth checks it. */
  io.use((socket, nextFn) => {
    const token = readCookie(socket.handshake.headers.cookie, 'auth_token');
    if (!token || !process.env.JWT_SECRET) {
      return nextFn(new Error('unauthorized'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) return nextFn(new Error('unauthorized'));
      socket.data.userId = String(decoded.id);
      socket.data.role = String(decoded.role || '').trim().toLowerCase();
      return nextFn();
    } catch {
      return nextFn(new Error('unauthorized'));
    }
  });

  global.io = io;

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    if (socket.data.role) socket.join(`role:${socket.data.role}`);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`> Ready on http://localhost:${PORT}`));
});
