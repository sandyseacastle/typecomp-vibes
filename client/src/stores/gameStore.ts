import { create } from 'zustand';
import type {
  Player,
  RoomConfig,
  RoomState,
  LeaderboardEntry,
  RaceResult,
  MarathonEntry,
  MarathonAttemptResult,
} from '@typecomp/shared';

interface GameState {
  // Connection
  playerId: string | null;
  roomCode: string | null;
  connected: boolean;

  // Room
  players: Record<string, Player>;
  config: RoomConfig;
  roomState: RoomState;
  hostId: string | null;
  isHost: boolean;

  // Race (sprint)
  text: string;
  startTime: number | null;
  countdown: number | null;
  leaderboard: LeaderboardEntry[];

  // Results (sprint)
  results: RaceResult[] | null;

  // Marathon
  marathonEndTime: number | null;
  marathonLeaderboard: MarathonEntry[];
  marathonAttemptState: 'idle' | 'typing' | 'completed';
  lastAttemptResult: MarathonAttemptResult | null;
  attemptNumber: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setRoom: (roomCode: string, playerId: string) => void;
  setPlayers: (players: Record<string, Player>) => void;
  updateConfig: (config: RoomConfig) => void;
  setCountdown: (seconds: number | null) => void;
  startRace: (text: string, startTime: number) => void;
  updateLeaderboard: (entries: LeaderboardEntry[]) => void;
  setResults: (rankings: RaceResult[]) => void;
  leaveRoom: () => void;
  resetForNextRound: () => void;

  // Marathon actions
  startMarathonSession: (endTime: number) => void;
  setAttemptText: (text: string, attemptNumber: number) => void;
  setAttemptResult: (result: MarathonAttemptResult) => void;
  updateMarathonLeaderboard: (entries: MarathonEntry[]) => void;
  endMarathon: (entries: MarathonEntry[]) => void;
}

const initialConfig: RoomConfig = {
  wordCount: 25,
  difficulty: 'medium',
  mode: 'sprint',
  marathonDuration: 5,
};

export const useGameStore = create<GameState>()((set) => ({
  playerId: null,
  roomCode: null,
  connected: false,
  players: {},
  config: initialConfig,
  roomState: 'lobby',
  hostId: null,
  isHost: false,
  text: '',
  startTime: null,
  countdown: null,
  leaderboard: [],
  results: null,
  marathonEndTime: null,
  marathonLeaderboard: [],
  marathonAttemptState: 'idle',
  lastAttemptResult: null,
  attemptNumber: 0,

  setConnected: (connected) => set({ connected }),

  setRoom: (roomCode, playerId) => set({ roomCode, playerId }),

  setPlayers: (players) =>
    set((state) => {
      const host = Object.values(players).find((p) => p.isHost);
      return {
        players,
        hostId: host?.id ?? null,
        isHost: host?.id === state.playerId,
      };
    }),

  updateConfig: (config) => set({ config }),

  setCountdown: (seconds) =>
    set({ countdown: seconds, roomState: seconds !== null ? 'countdown' : 'lobby' }),

  startRace: (text, startTime) =>
    set({ text, startTime, roomState: 'racing', countdown: null }),

  updateLeaderboard: (entries) => set({ leaderboard: entries }),

  setResults: (rankings) =>
    set({ results: rankings, roomState: 'finished' }),

  leaveRoom: () =>
    set({
      playerId: null,
      roomCode: null,
      players: {},
      config: initialConfig,
      roomState: 'lobby',
      hostId: null,
      isHost: false,
      text: '',
      startTime: null,
      countdown: null,
      leaderboard: [],
      results: null,
      marathonEndTime: null,
      marathonLeaderboard: [],
      marathonAttemptState: 'idle',
      lastAttemptResult: null,
      attemptNumber: 0,
    }),

  resetForNextRound: () =>
    set({
      roomState: 'lobby',
      text: '',
      startTime: null,
      countdown: null,
      leaderboard: [],
      results: null,
      marathonEndTime: null,
      marathonLeaderboard: [],
      marathonAttemptState: 'idle',
      lastAttemptResult: null,
      attemptNumber: 0,
    }),

  // Marathon actions
  startMarathonSession: (endTime) =>
    set({
      roomState: 'marathon',
      marathonEndTime: endTime,
      marathonAttemptState: 'idle',
      marathonLeaderboard: [],
      lastAttemptResult: null,
      attemptNumber: 0,
    }),

  setAttemptText: (text, attemptNumber) =>
    set({
      text,
      startTime: Date.now(),
      marathonAttemptState: 'typing',
      attemptNumber,
      lastAttemptResult: null,
    }),

  setAttemptResult: (result) =>
    set({
      marathonAttemptState: 'completed',
      lastAttemptResult: result,
    }),

  updateMarathonLeaderboard: (entries) =>
    set({ marathonLeaderboard: entries }),

  endMarathon: (entries) =>
    set({
      roomState: 'finished',
      marathonLeaderboard: entries,
      marathonAttemptState: 'idle',
    }),
}));
