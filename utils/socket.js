import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io("http://localhost:3000");
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
