import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@typecomp/shared';
import { RoomManager } from './game/RoomManager.js';
import { GameEngine } from './game/GameEngine.js';
import { registerSocketHandlers } from './socket/handlers.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();
const gameEngine = new GameEngine(io, roomManager);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerSocketHandlers(io, socket, roomManager, gameEngine);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`TypeComp server running on port ${PORT}`);
});
