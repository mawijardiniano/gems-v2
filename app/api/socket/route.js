import { Server } from "socket.io";

let io;

export function GET() {
  if (io) {
    console.log("⚠️ Socket.IO server already initialized");
    return new Response("Socket.IO already running");
  }

  io = new Server(globalThis.server, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  console.log("✅ Socket.IO server initialized:", !!io);

  return new Response("Socket.IO initialized");
}

export const getIO = () => io;
