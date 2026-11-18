import { io } from "socket.io-client";

let socket = null;

/* Same origin as the page (it was hard-coded to http://localhost:3000, so
   live updates never worked anywhere else). The server only accepts signed-in
   sockets: one opened before login is rejected and does not retry on its
   own, so a later call reconnects it once a session cookie exists. */
export const getSocket = () => {
  if (!socket) {
    socket = io({ withCredentials: true });
  } else if (!socket.connected && !socket.active) {
    socket.connect();
  }
  return socket;
};

export const socketMethods = {
  on: (event, callback) => getSocket().on(event, callback),
  once: (event, callback) => getSocket().once(event, callback),
  off: (event, callback) => getSocket().off(event, callback),
  emit: (event, data) => getSocket().emit(event, data),
  disconnect: () => getSocket().disconnect(),
  connect: () => getSocket().connect(),
};
