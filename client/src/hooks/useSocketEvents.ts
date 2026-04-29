import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useGameStore } from '../stores/gameStore';

export function useSocketEvents(): void {
  const socket = useSocket();

  useEffect(() => {
    const {
      setConnected,
      setPlayers,
      updateConfig,
      setCountdown,
      startRace,
      updateLeaderboard,
      setResults,
      resetForNextRound,
      startMarathonSession,
      setAttemptText,
      setAttemptResult,
      updateMarathonLeaderboard,
      endMarathon,
    } = useGameStore.getState();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('player-joined', ({ players }) => {
      setPlayers(players);
      if (useGameStore.getState().roomState === 'finished') {
        resetForNextRound();
      }
    });

    socket.on('player-left', ({ players }) => {
      setPlayers(players);
    });

    socket.on('config-updated', (config) => {
      updateConfig(config);
    });

    socket.on('player-ready-update', ({ playerId, ready }) => {
      const players = { ...useGameStore.getState().players };
      if (players[playerId]) {
        players[playerId] = { ...players[playerId], ready };
        setPlayers(players);
      }
    });

    socket.on('race-countdown', ({ seconds }) => {
      setCountdown(seconds);
    });

    socket.on('race-start', ({ text, startTime }) => {
      startRace(text, startTime);
    });

    socket.on('leaderboard-update', ({ entries }) => {
      updateLeaderboard(entries);
    });

    socket.on('race-finished', ({ rankings }) => {
      setResults(rankings);
    });

    socket.on('error', ({ message }) => {
      console.error('Server error:', message);
    });

    // Marathon events
    socket.on('marathon-start', ({ endTime }) => {
      startMarathonSession(endTime);
    });

    socket.on('attempt-text', ({ text, attemptNumber }) => {
      setAttemptText(text, attemptNumber);
    });

    socket.on('attempt-result', ({ result }) => {
      setAttemptResult(result);
    });

    socket.on('marathon-update', ({ entries }) => {
      updateMarathonLeaderboard(entries);
    });

    socket.on('marathon-end', ({ entries }) => {
      endMarathon(entries);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('config-updated');
      socket.off('player-ready-update');
      socket.off('race-countdown');
      socket.off('race-start');
      socket.off('leaderboard-update');
      socket.off('race-finished');
      socket.off('error');
      socket.off('marathon-start');
      socket.off('attempt-text');
      socket.off('attempt-result');
      socket.off('marathon-update');
      socket.off('marathon-end');
    };
  }, [socket]);
}
