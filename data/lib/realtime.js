/* Socket.IO sends from API routes. The server (server.js) authenticates
   each socket from the `auth_token` cookie and puts it in two rooms:
   `user:<id>` and `role:<role in lower case>`.

   Routes used to call `global.io.emit`, which went to every connected
   socket, signed in or not: every user's notifications (with cancel
   reasons), every new event, and whole profile documents. */

const userRoom = (userId) => `user:${String(userId)}`;
const roleRoom = (role) => `role:${String(role || "").trim().toLowerCase()}`;

/** Roles whose screens refresh live when profiles change (dashboards and
    profile lists). */
export const PROFILE_WATCHER_ROLES = [
  "Admin",
  "GAD Focal Person",
  "GAD Coordinator",
  "Dean",
  "President",
  "Planning Director",
];

/** Sends `event` to one user's sockets. No-op without a socket server. */
export function emitToUser(userId, event, payload) {
  if (!global.io || !userId) return;
  global.io.to(userRoom(userId)).emit(event, payload);
}

/** Sends `event` to every socket of the given roles. */
export function emitToRoles(roles, event, payload) {
  if (!global.io) return;
  const rooms = (roles || []).map(roleRoom);
  if (rooms.length) global.io.to(rooms).emit(event, payload);
}

/** Closes every open socket of one user. The server puts a socket in its
    role room once, at connect time, so after a role change, deactivation,
    password reset or delete the old sockets would keep receiving events
    meant for the old role. A fresh page load reconnects with the account's
    current role (or is refused). */
export function disconnectUser(userId) {
  if (!global.io || !userId) return;
  global.io.in(userRoom(userId)).disconnectSockets(true);
}
