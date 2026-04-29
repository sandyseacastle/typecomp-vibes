import type { Keystroke, LeaderboardEntry, RaceResult, MarathonEntry, MarathonAttemptResult } from '@typecomp/shared';
import type { TypedServer, TypedSocket } from '../types/server.js';
import { RoomManager } from './RoomManager.js';
import { TextGenerator } from './TextGenerator.js';
import { KeystrokeValidator } from '../anticheat/KeystrokeValidator.js';
import { ResultValidator } from '../anticheat/ResultValidator.js';

interface MarathonPlayerState {
  text: string;
  startTime: number;
  attemptNumber: number;
  keystrokeLogs: Keystroke[];
  bestWpm: number;
  bestAccuracy: number;
  bestTime: number;
  totalAttempts: number;
  currentlyTyping: boolean;
  suspicious: boolean;
}

export class GameEngine {
  private textGenerator = new TextGenerator();
  private keystrokeValidator = new KeystrokeValidator();
  private resultValidator = new ResultValidator();
  private leaderboardIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private keystrokeLogs: Map<string, Map<string, Keystroke[]>> = new Map();

  // Marathon state
  private marathonStates: Map<string, Map<string, MarathonPlayerState>> = new Map();
  private marathonTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private marathonEndTimes: Map<string, number> = new Map();

  constructor(
    private io: TypedServer,
    private roomManager: RoomManager
  ) {
    setInterval(() => {
      this.roomManager.cleanupEmptyRooms();
    }, 60_000);
  }

  // =====================
  // SPRINT MODE (existing)
  // =====================

  startCountdown(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room || room.state !== 'lobby') return;

    if (room.config.mode === 'marathon') {
      this.startMarathon(roomCode);
      return;
    }

    room.state = 'countdown';
    room.text = this.textGenerator.generate(room.config.wordCount, room.config.difficulty);

    this.keystrokeLogs.set(roomCode, new Map());
    for (const [playerId, player] of Object.entries(room.players)) {
      if (!player.isSpectator) {
        this.keystrokeLogs.get(roomCode)!.set(playerId, []);
      }
    }

    let countdown = 3;
    this.io.to(roomCode).emit('race-countdown', { seconds: countdown });

    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        this.io.to(roomCode).emit('race-countdown', { seconds: countdown });
      } else {
        clearInterval(interval);
        this.startRace(roomCode);
      }
    }, 1000);
  }

  private startRace(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    room.state = 'racing';
    room.startTime = Date.now();

    this.io.to(roomCode).emit('race-start', {
      text: room.text,
      startTime: room.startTime,
    });

    const interval = setInterval(() => {
      this.broadcastLeaderboard(roomCode);
    }, 200);
    this.leaderboardIntervals.set(roomCode, interval);
  }

  processKeystroke(roomCode: string, playerId: string, keystroke: Keystroke): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    if (room.state === 'marathon') {
      this.processMarathonKeystroke(roomCode, playerId, keystroke);
      return;
    }

    if (room.state !== 'racing') return;

    const player = room.players[playerId];
    if (!player || player.finished || player.isSpectator) return;

    const logs = this.keystrokeLogs.get(roomCode)?.get(playerId);
    if (logs) {
      logs.push({ ...keystroke, timestamp: Date.now() - room.startTime });
    }

    const previousKeystroke = logs && logs.length > 1 ? logs[logs.length - 2] : null;
    const validation = this.keystrokeValidator.validate(keystroke, player, room, previousKeystroke);

    if (validation.suspicious) {
      player.suspicious = true;
    }

    const expectedChar = room.text[keystroke.position];
    const isCorrect = keystroke.key === expectedChar;

    player.totalKeystrokes++;
    if (isCorrect) {
      player.correctChars++;
    }

    const cursorPosition = keystroke.position + 1;
    if (cursorPosition > player.progress) {
      player.progress = cursorPosition;
    }

    const elapsedMs = Date.now() - room.startTime;
    const elapsedMinutes = elapsedMs / 60000;
    player.wpm = elapsedMinutes > 0 ? Math.round((player.correctChars / 5) / elapsedMinutes) : 0;
    player.accuracy = player.totalKeystrokes > 0
      ? Math.round((player.correctChars / player.totalKeystrokes) * 100)
      : 100;

    if (player.progress >= room.text.length) {
      this.handlePlayerFinished(roomCode, playerId);
    }
  }

  private handlePlayerFinished(roomCode: string, playerId: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players[playerId];
    if (!player || player.finished) return;

    player.finished = true;
    player.finishTime = Date.now() - room.startTime;

    const keystrokes = this.keystrokeLogs.get(roomCode)?.get(playerId) ?? [];
    const validation = this.resultValidator.validate(keystrokes, player, room);
    if (!validation.verified) {
      player.suspicious = true;
    }

    const finishedCount = Object.values(room.players).filter(p => p.finished).length;

    const result: RaceResult = {
      playerId: player.id,
      name: player.name,
      wpm: player.wpm,
      accuracy: player.accuracy,
      time: player.finishTime,
      position: finishedCount,
      verified: validation.verified,
      totalKeystrokes: player.totalKeystrokes,
      correctKeystrokes: player.correctChars,
    };

    this.io.to(roomCode).emit('player-finished', { playerId, result });

    const competitors = Object.values(room.players).filter(p => !p.isSpectator);
    const allFinished = competitors.every(p => p.finished);
    if (allFinished) {
      this.endRace(roomCode);
    }
  }

  private endRace(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    room.state = 'finished';

    const interval = this.leaderboardIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.leaderboardIntervals.delete(roomCode);
    }

    const rankings: RaceResult[] = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
        return b.progress - a.progress;
      })
      .map((player, i) => ({
        playerId: player.id,
        name: player.name,
        wpm: player.wpm,
        accuracy: player.accuracy,
        time: player.finishTime ?? 0,
        position: i + 1,
        verified: !player.suspicious,
        totalKeystrokes: player.totalKeystrokes,
        correctKeystrokes: player.correctChars,
      }));

    this.io.to(roomCode).emit('race-finished', { rankings });
    this.broadcastLeaderboard(roomCode);
    this.keystrokeLogs.delete(roomCode);
  }

  forceEndRace(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;
    if (room.state === 'marathon') {
      this.endMarathon(roomCode);
    } else {
      this.endRace(roomCode);
    }
  }

  private broadcastLeaderboard(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    const entries: LeaderboardEntry[] = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .map((p) => ({
        id: p.id,
        name: p.name,
        wpm: p.wpm,
        accuracy: p.accuracy,
        progress: room.text.length > 0 ? p.progress / room.text.length : 0,
        finished: p.finished,
        position: 0,
        suspicious: p.suspicious,
      }))
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished) return b.wpm - a.wpm;
        return b.progress - a.progress;
      })
      .map((entry, i) => ({ ...entry, position: i + 1 }));

    this.io.to(roomCode).emit('leaderboard-update', { entries });
  }

  // =====================
  // MARATHON MODE
  // =====================

  private startMarathon(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    room.state = 'marathon';
    room.startTime = Date.now();

    const durationMs = room.config.marathonDuration * 60 * 1000;
    const endTime = room.startTime + durationMs;
    this.marathonEndTimes.set(roomCode, endTime);

    // Initialize marathon state for all competing players
    const playerStates = new Map<string, MarathonPlayerState>();
    for (const [playerId, player] of Object.entries(room.players)) {
      if (!player.isSpectator) {
        playerStates.set(playerId, this.createMarathonPlayerState());
      }
    }
    this.marathonStates.set(roomCode, playerStates);

    // Notify all clients
    this.io.to(roomCode).emit('marathon-start', { endTime });

    // Start periodic leaderboard broadcast
    const interval = setInterval(() => {
      this.broadcastMarathonLeaderboard(roomCode);
    }, 500);
    this.leaderboardIntervals.set(roomCode, interval);

    // Schedule session end
    const timer = setTimeout(() => {
      this.endMarathon(roomCode);
    }, durationMs);
    this.marathonTimers.set(roomCode, timer);
  }

  private createMarathonPlayerState(): MarathonPlayerState {
    return {
      text: '',
      startTime: 0,
      attemptNumber: 0,
      keystrokeLogs: [],
      bestWpm: 0,
      bestAccuracy: 0,
      bestTime: 0,
      totalAttempts: 0,
      currentlyTyping: false,
      suspicious: false,
    };
  }

  startMarathonAttempt(roomCode: string, playerId: string, socket: TypedSocket): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room || room.state !== 'marathon') return;

    const endTime = this.marathonEndTimes.get(roomCode);
    if (endTime && Date.now() >= endTime) return; // Session expired

    const playerStates = this.marathonStates.get(roomCode);
    if (!playerStates) return;

    let mState = playerStates.get(playerId);
    if (!mState) {
      // Player joined mid-marathon
      mState = this.createMarathonPlayerState();
      playerStates.set(playerId, mState);
    }

    // Generate fresh text for this attempt
    const text = this.textGenerator.generate(room.config.wordCount, room.config.difficulty);
    mState.text = text;
    mState.startTime = Date.now();
    mState.attemptNumber++;
    mState.keystrokeLogs = [];
    mState.currentlyTyping = true;

    // Reset the player's sprint-like stats for this attempt
    const player = room.players[playerId];
    if (player) {
      player.progress = 0;
      player.correctChars = 0;
      player.totalKeystrokes = 0;
      player.wpm = 0;
      player.accuracy = 100;
      player.finished = false;
      player.suspicious = false;
      delete player.finishTime;
    }

    // Send text only to this player
    socket.emit('attempt-text', { text, attemptNumber: mState.attemptNumber });
  }

  private processMarathonKeystroke(roomCode: string, playerId: string, keystroke: Keystroke): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    const playerStates = this.marathonStates.get(roomCode);
    const mState = playerStates?.get(playerId);
    if (!mState || !mState.currentlyTyping) return;

    const player = room.players[playerId];
    if (!player || player.finished) return;

    // Log keystroke
    mState.keystrokeLogs.push({ ...keystroke, timestamp: Date.now() - mState.startTime });

    const previousKeystroke = mState.keystrokeLogs.length > 1
      ? mState.keystrokeLogs[mState.keystrokeLogs.length - 2]
      : null;

    // Use the attempt's text, not room.text
    const tempRoom = { ...room, text: mState.text };
    const validation = this.keystrokeValidator.validate(keystroke, player, tempRoom, previousKeystroke);
    if (validation.suspicious) {
      player.suspicious = true;
      mState.suspicious = true;
    }

    const expectedChar = mState.text[keystroke.position];
    const isCorrect = keystroke.key === expectedChar;

    player.totalKeystrokes++;
    if (isCorrect) {
      player.correctChars++;
    }

    const cursorPosition = keystroke.position + 1;
    if (cursorPosition > player.progress) {
      player.progress = cursorPosition;
    }

    const elapsedMs = Date.now() - mState.startTime;
    const elapsedMinutes = elapsedMs / 60000;
    player.wpm = elapsedMinutes > 0 ? Math.round((player.correctChars / 5) / elapsedMinutes) : 0;
    player.accuracy = player.totalKeystrokes > 0
      ? Math.round((player.correctChars / player.totalKeystrokes) * 100)
      : 100;

    if (player.progress >= mState.text.length) {
      this.handleMarathonAttemptComplete(roomCode, playerId);
    }
  }

  private handleMarathonAttemptComplete(roomCode: string, playerId: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    const playerStates = this.marathonStates.get(roomCode);
    const mState = playerStates?.get(playerId);
    if (!mState) return;

    const player = room.players[playerId];
    if (!player) return;

    player.finished = true;
    player.finishTime = Date.now() - mState.startTime;
    mState.currentlyTyping = false;
    mState.totalAttempts++;

    // Run anti-cheat
    const tempRoom = { ...room, text: mState.text };
    const validation = this.resultValidator.validate(mState.keystrokeLogs, player, tempRoom);
    if (!validation.verified) {
      mState.suspicious = true;
    }

    // Check if this is the player's best attempt
    const isBest = player.wpm > mState.bestWpm;
    if (isBest) {
      mState.bestWpm = player.wpm;
      mState.bestAccuracy = player.accuracy;
      mState.bestTime = player.finishTime;
    }

    const result: MarathonAttemptResult = {
      wpm: player.wpm,
      accuracy: player.accuracy,
      time: player.finishTime,
      verified: validation.verified,
      isBest,
      attemptNumber: mState.attemptNumber,
    };

    // Send result to only this player's socket
    const socketId = player.socketId;
    this.io.to(socketId).emit('attempt-result', { result });

    // Broadcast updated leaderboard
    this.broadcastMarathonLeaderboard(roomCode);
  }

  private broadcastMarathonLeaderboard(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    const playerStates = this.marathonStates.get(roomCode);
    if (!playerStates) return;

    const entries: MarathonEntry[] = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .map((player) => {
        const mState = playerStates.get(player.id);
        return {
          id: player.id,
          name: player.name,
          bestWpm: mState?.bestWpm ?? 0,
          bestAccuracy: mState?.bestAccuracy ?? 0,
          bestTime: mState?.bestTime ?? 0,
          attempts: mState?.totalAttempts ?? 0,
          currentlyTyping: mState?.currentlyTyping ?? false,
          position: 0,
          suspicious: mState?.suspicious ?? false,
        };
      })
      .sort((a, b) => b.bestWpm - a.bestWpm)
      .map((entry, i) => ({ ...entry, position: i + 1 }));

    this.io.to(roomCode).emit('marathon-update', { entries });
  }

  private endMarathon(roomCode: string): void {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return;

    room.state = 'finished';

    // Clear intervals and timers
    const interval = this.leaderboardIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.leaderboardIntervals.delete(roomCode);
    }
    const timer = this.marathonTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.marathonTimers.delete(roomCode);
    }
    this.marathonEndTimes.delete(roomCode);

    // Build final leaderboard
    const playerStates = this.marathonStates.get(roomCode);
    if (!playerStates) return;

    const entries: MarathonEntry[] = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .map((player) => {
        const mState = playerStates.get(player.id);
        return {
          id: player.id,
          name: player.name,
          bestWpm: mState?.bestWpm ?? 0,
          bestAccuracy: mState?.bestAccuracy ?? 0,
          bestTime: mState?.bestTime ?? 0,
          attempts: mState?.totalAttempts ?? 0,
          currentlyTyping: false,
          position: 0,
          suspicious: mState?.suspicious ?? false,
        };
      })
      .sort((a, b) => b.bestWpm - a.bestWpm)
      .map((entry, i) => ({ ...entry, position: i + 1 }));

    this.io.to(roomCode).emit('marathon-end', { entries });

    // Cleanup
    this.marathonStates.delete(roomCode);
  }
}
