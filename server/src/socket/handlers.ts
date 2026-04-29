import type { TypedServer, TypedSocket } from '../types/server.js';
import type { RoomManager } from '../game/RoomManager.js';
import type { GameEngine } from '../game/GameEngine.js';

export function registerSocketHandlers(
  io: TypedServer,
  socket: TypedSocket,
  roomManager: RoomManager,
  gameEngine: GameEngine
): void {
  // --- Room Management ---

  socket.on('create-room', (playerName, callback) => {
    const trimmed = playerName.trim().slice(0, 20);
    if (!trimmed) {
      callback({ roomCode: '', playerId: '' });
      return;
    }

    const { room, playerId } = roomManager.createRoom(socket.id, trimmed);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;

    callback({ roomCode: room.code, playerId });
    io.to(room.code).emit('player-joined', { players: room.players });
  });

  socket.on('join-room', ({ roomCode, playerName }, callback) => {
    const trimmed = playerName.trim().slice(0, 20);
    if (!trimmed) {
      callback({ success: false, error: 'Name is required' });
      return;
    }

    const result = roomManager.joinRoom(roomCode, socket.id, trimmed);
    if ('error' in result) {
      callback({ success: false, error: result.error });
      return;
    }

    const { room, playerId } = result;
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;

    callback({ success: true, playerId });
    io.to(room.code).emit('player-joined', { players: room.players });
    io.to(room.code).emit('config-updated', room.config);
  });

  socket.on('leave-room', () => {
    handleLeave();
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handleLeave();
  });

  function handleLeave(): void {
    const { room, removedPlayerId, newHostId } = roomManager.leaveRoom(socket.id);
    const roomCode = socket.data.roomCode;
    if (roomCode) {
      socket.leave(roomCode);
    }

    if (room && removedPlayerId) {
      io.to(room.code).emit('player-left', {
        playerId: removedPlayerId,
        players: room.players,
        newHostId,
      });

      // If race is in progress and all remaining competitors are finished, end race
      if (room.state === 'racing') {
        const competitors = Object.values(room.players).filter((p) => !p.isSpectator);
        const allFinished = competitors.every((p) => p.finished);
        if (allFinished || competitors.length === 0) {
          gameEngine.forceEndRace(room.code);
        }
      }
      // Marathon: end if no competitors left
      if (room.state === 'marathon' && Object.values(room.players).filter((p) => !p.isSpectator).length === 0) {
        gameEngine.forceEndRace(room.code);
      }
    }
  }

  // --- Lobby ---

  socket.on('update-config', (config) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.data.playerId) return;

    if (config.wordCount) room.config.wordCount = config.wordCount;
    if (config.difficulty) room.config.difficulty = config.difficulty;
    if (config.mode) room.config.mode = config.mode;
    if (config.marathonDuration) room.config.marathonDuration = config.marathonDuration;

    io.to(room.code).emit('config-updated', room.config);
  });

  socket.on('player-ready', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    const playerId = socket.data.playerId;
    if (!room || !playerId || room.state !== 'lobby') return;

    const player = room.players[playerId];
    if (!player) return;

    player.ready = !player.ready;
    io.to(room.code).emit('player-ready-update', {
      playerId,
      ready: player.ready,
    });
  });

  socket.on('start-race', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.state !== 'lobby') return;

    gameEngine.startCountdown(room.code);
  });

  // --- Racing ---

  socket.on('keystroke', (data) => {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (roomCode && playerId) {
      gameEngine.processKeystroke(roomCode, playerId, data);
    }
  });

  socket.on('race-complete', () => {
    // The server detects completion via keystroke processing
    // This is a backup signal from the client
  });

  // --- Marathon ---

  socket.on('start-attempt', () => {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (roomCode && playerId) {
      gameEngine.startMarathonAttempt(roomCode, playerId, socket);
    }
  });

  // --- Post-Race ---

  socket.on('next-round', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.state !== 'finished') return;

    roomManager.resetRoomForNextRound(room.code);
    io.to(room.code).emit('player-joined', { players: room.players });
  });
}
