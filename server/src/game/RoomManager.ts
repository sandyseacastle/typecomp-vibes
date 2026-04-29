import type { Player, Room, RoomConfig } from '@typecomp/shared';
import { randomUUID } from 'crypto';

const MAX_PLAYERS = 8;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();

  generateRoomCode(): string {
    let code: string;
    do {
      code = Array.from({ length: 6 }, () =>
        ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socketId: string, playerName: string): { room: Room; playerId: string } {
    const code = this.generateRoomCode();
    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      name: playerName,
      socketId,
      progress: 0,
      correctChars: 0,
      totalKeystrokes: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      isHost: true,
      isSpectator: true,
      ready: false,
      suspicious: false,
    };

    const room: Room = {
      code,
      hostId: playerId,
      players: { [playerId]: player },
      config: { wordCount: 25, difficulty: 'medium', mode: 'sprint', marathonDuration: 5 },
      text: '',
      state: 'lobby',
      startTime: 0,
      round: 0,
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);
    this.socketToPlayer.set(socketId, playerId);

    return { room, playerId };
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string
  ): { room: Room; playerId: string } | { error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'lobby' && room.state !== 'marathon') return { error: 'Race already in progress' };
    if (Object.keys(room.players).length >= MAX_PLAYERS) return { error: 'Room is full' };

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: playerName,
      socketId,
      progress: 0,
      correctChars: 0,
      totalKeystrokes: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      isHost: false,
      isSpectator: false,
      ready: false,
      suspicious: false,
    };

    room.players[playerId] = player;
    this.socketToRoom.set(socketId, room.code);
    this.socketToPlayer.set(socketId, playerId);

    return { room, playerId };
  }

  leaveRoom(socketId: string): {
    room: Room | null;
    removedPlayerId: string | null;
    newHostId?: string;
  } {
    const roomCode = this.socketToRoom.get(socketId);
    const playerId = this.socketToPlayer.get(socketId);
    if (!roomCode || !playerId) return { room: null, removedPlayerId: null };

    const room = this.rooms.get(roomCode);
    if (!room) return { room: null, removedPlayerId: null };

    delete room.players[playerId];
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);

    const remainingPlayers = Object.values(room.players);

    if (remainingPlayers.length === 0) {
      this.rooms.delete(roomCode);
      return { room: null, removedPlayerId: playerId };
    }

    let newHostId: string | undefined;
    if (room.hostId === playerId) {
      const newHost = remainingPlayers[0];
      newHost.isHost = true;
      newHost.isSpectator = true;
      room.hostId = newHost.id;
      newHostId = newHost.id;
    }

    return { room, removedPlayerId: playerId, newHostId };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  getPlayerIdBySocket(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  resetRoomForNextRound(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    room.state = 'lobby';
    room.text = '';
    room.startTime = 0;
    room.round++;

    for (const player of Object.values(room.players)) {
      player.progress = 0;
      player.correctChars = 0;
      player.totalKeystrokes = 0;
      player.wpm = 0;
      player.accuracy = 100;
      player.finished = false;
      player.ready = false;
      player.suspicious = false;
      delete player.finishTime;
    }
  }

  cleanupEmptyRooms(): number {
    let cleaned = 0;
    for (const [code, room] of this.rooms) {
      if (Object.keys(room.players).length === 0) {
        this.rooms.delete(code);
        cleaned++;
      }
    }
    return cleaned;
  }
}
