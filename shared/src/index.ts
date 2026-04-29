// === Game Entities ===

export interface Player {
  id: string;
  name: string;
  socketId: string;
  progress: number;
  correctChars: number;
  totalKeystrokes: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishTime?: number;
  isHost: boolean;
  isSpectator: boolean;
  ready: boolean;
  suspicious: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'sprint' | 'marathon';

export interface RoomConfig {
  wordCount: 25 | 50 | 100;
  difficulty: Difficulty;
  mode: GameMode;
  marathonDuration: 3 | 5 | 10; // minutes
}

export type RoomState = 'lobby' | 'countdown' | 'racing' | 'marathon' | 'finished';

export interface Room {
  code: string;
  hostId: string;
  players: Record<string, Player>;
  config: RoomConfig;
  text: string;
  state: RoomState;
  startTime: number;
  round: number;
}

// === Keystroke Events ===

export interface Keystroke {
  timestamp: number;
  key: string;
  position: number;
  correct: boolean;
}

// === Leaderboard ===

export interface LeaderboardEntry {
  id: string;
  name: string;
  wpm: number;
  accuracy: number;
  progress: number;
  finished: boolean;
  position: number;
  suspicious: boolean;
}

export interface RaceResult {
  playerId: string;
  name: string;
  wpm: number;
  accuracy: number;
  time: number;
  position: number;
  verified: boolean;
  totalKeystrokes: number;
  correctKeystrokes: number;
}

// === Marathon Mode ===

export interface MarathonEntry {
  id: string;
  name: string;
  bestWpm: number;
  bestAccuracy: number;
  bestTime: number;
  attempts: number;
  currentlyTyping: boolean;
  position: number;
  suspicious: boolean;
}

export interface MarathonAttemptResult {
  wpm: number;
  accuracy: number;
  time: number;
  verified: boolean;
  isBest: boolean;
  attemptNumber: number;
}

// === Socket.IO Event Maps ===

export interface ClientToServerEvents {
  'create-room': (
    playerName: string,
    callback: (response: { roomCode: string; playerId: string }) => void
  ) => void;
  'join-room': (
    data: { roomCode: string; playerName: string },
    callback: (response: { success: boolean; error?: string; playerId?: string }) => void
  ) => void;
  'update-config': (config: Partial<RoomConfig>) => void;
  'player-ready': () => void;
  'start-race': () => void;
  'keystroke': (data: Keystroke) => void;
  'race-complete': () => void;
  'next-round': () => void;
  'leave-room': () => void;
  // Marathon
  'start-attempt': () => void;
}

export interface ServerToClientEvents {
  'room-created': (data: { roomCode: string; playerId: string }) => void;
  'player-joined': (data: { players: Record<string, Player> }) => void;
  'player-left': (data: {
    playerId: string;
    players: Record<string, Player>;
    newHostId?: string;
  }) => void;
  'config-updated': (config: RoomConfig) => void;
  'player-ready-update': (data: { playerId: string; ready: boolean }) => void;
  'race-countdown': (data: { seconds: number }) => void;
  'race-start': (data: { text: string; startTime: number }) => void;
  'leaderboard-update': (data: { entries: LeaderboardEntry[] }) => void;
  'player-finished': (data: { playerId: string; result: RaceResult }) => void;
  'race-finished': (data: { rankings: RaceResult[] }) => void;
  'error': (data: { message: string }) => void;
  // Marathon
  'marathon-start': (data: { endTime: number }) => void;
  'attempt-text': (data: { text: string; attemptNumber: number }) => void;
  'attempt-result': (data: { result: MarathonAttemptResult }) => void;
  'marathon-update': (data: { entries: MarathonEntry[] }) => void;
  'marathon-end': (data: { entries: MarathonEntry[] }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId: string;
  roomCode: string;
}
