const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

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

/* ── Client address ──────────────────────────────────────────────────────────
 *
 * Rate limits and the audit trail need the caller's IP, and X-Forwarded-For /
 * X-Real-IP / CF-Connecting-IP are set by whoever sends the request — trusting
 * them let anyone mint a fresh login-rate-limit bucket per attempt (password
 * spraying across every account). The address is decided here, where the
 * real TCP peer is known, and handed on as `x-gems-client-ip`, which an
 * incoming request can never set itself.
 *
 *   - Peer is public  -> clients connect directly: the peer IS the client;
 *                        every forwarding header is ignored.
 *   - Peer is private -> a proxy (nginx, a load balancer) is in front: use the
 *     or loopback        right-most X-Forwarded-For hop, the one that proxy
 *                        appended. Client-forged hops sit to its left.
 *   - TRUSTED_IP_HEADER=<header> (e.g. cf-connecting-ip) when a CDN that sets
 *     its own header is in front. */
const CLIENT_IP_HEADER = 'x-gems-client-ip';
const TRUSTED_IP_HEADER = String(process.env.TRUSTED_IP_HEADER || '')
  .trim()
  .toLowerCase();

function stripIpv4Mapped(ip) {
  return String(ip || '').replace(/^::ffff:/i, '');
}

function isPrivatePeer(ip) {
  const a = stripIpv4Mapped(ip);
  return (
    a === '::1' ||
    /^127\./.test(a) ||
    /^10\./.test(a) ||
    /^192\.168\./.test(a) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(a) ||
    /^f[cd][0-9a-f]{2}:/i.test(a) ||
    /^fe80:/i.test(a)
  );
}

function resolveClientIp(req) {
  const peer = stripIpv4Mapped(req.socket?.remoteAddress) || 'unknown';
  if (TRUSTED_IP_HEADER) {
    const v = String(req.headers[TRUSTED_IP_HEADER] || '').split(',')[0].trim();
    return v || peer;
  }
  if (!isPrivatePeer(peer)) return peer;
  const hops = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops.length ? stripIpv4Mapped(hops[hops.length - 1]) : peer;
}

/* A small connection of its own for the socket handshake: this file is
   plain CommonJS outside the Next bundle, so it cannot share the app's
   connectDB(). Opened on the first handshake, after Next has loaded .env. */
let socketDb = null;
function findSocketUser(id) {
  if (!socketDb) {
    socketDb = mongoose.createConnection(process.env.MONGODB_URI, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
    });
    socketDb.on('error', (err) => console.error('[socket] db error:', err.message));
  }
  const db = socketDb;
  return db.asPromise().catch((err) => {
    /* Retry the connection on the next handshake instead of keeping a
       dead one; this handshake is refused. */
    if (socketDb === db) socketDb = null;
    db.close().catch(() => {});
    throw err;
  }).then((conn) =>
    conn
      .collection('userauths')
      .findOne(
        { _id: new mongoose.Types.ObjectId(String(id)) },
        { projection: { role: 1, is_active: 1, passwordChangedAt: 1 } },
      ),
  );
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    req.headers[CLIENT_IP_HEADER] = resolveClientIp(req);
    return handle(req, res);
  });

  /* Same-origin only (the default): `cors: '*'` let any website open a
     socket with a visitor's cookies. */
  const io = new Server(server);

  /* Only signed-in users get a socket. Every emit used to reach every
     connected socket, anonymous ones included; routes now send to a user's
     or a role's room (data/lib/realtime.js). The token is checked the same
     way requireAuth checks it. */
  /* The role room comes from the account as stored now, not from the role
     inside the token: a token keeps its role until it expires, so a demoted
     or deactivated user used to keep receiving admin events. Same rules as
     requireAuth: the account must exist, be active, and the token must not
     predate the last password change. */
  io.use(async (socket, nextFn) => {
    const token = readCookie(socket.handshake.headers.cookie, 'auth_token');
    if (!token || !process.env.JWT_SECRET) {
      return nextFn(new Error('unauthorized'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
        return nextFn(new Error('unauthorized'));
      }
      const user = await findSocketUser(decoded.id);
      if (!user || user.is_active === false) {
        return nextFn(new Error('unauthorized'));
      }
      const changedAt = user.passwordChangedAt
        ? new Date(user.passwordChangedAt).getTime()
        : NaN;
      if (Number.isFinite(changedAt) && decoded.iat * 1000 < changedAt) {
        return nextFn(new Error('unauthorized'));
      }
      socket.data.userId = String(user._id);
      socket.data.role = String(user.role || '').trim().toLowerCase();
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
