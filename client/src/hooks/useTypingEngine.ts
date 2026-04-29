import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSocket } from './useSocket';
import { useGameStore } from '../stores/gameStore';
import type { Keystroke } from '@typecomp/shared';

export interface TypingState {
  cursorPosition: number;
  typedChars: Map<number, 'correct' | 'incorrect'>;
  isComplete: boolean;
  localWpm: number;
  localAccuracy: number;
}

const createInitialState = (): TypingState => ({
  cursorPosition: 0,
  typedChars: new Map(),
  isComplete: false,
  localWpm: 0,
  localAccuracy: 100,
});

// Mutable state container to avoid stale closure issues
class TypingEngine {
  state: TypingState = createInitialState();
  private correctCount = 0;
  private totalCount = 0;
  private raceStartTime = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private notify() {
    for (const listener of this.listeners) listener();
  }

  reset() {
    this.state = createInitialState();
    this.correctCount = 0;
    this.totalCount = 0;
    this.raceStartTime = performance.now();
    this.notify();
  }

  handleKey(key: string, text: string, emitKeystroke: (k: Keystroke) => void) {
    if (this.state.isComplete) return;

    if (key === 'Backspace') {
      if (this.state.cursorPosition === 0) return;
      const newPos = this.state.cursorPosition - 1;
      const newTyped = new Map(this.state.typedChars);
      newTyped.delete(newPos);
      this.state = { ...this.state, cursorPosition: newPos, typedChars: newTyped };
      this.notify();
      return;
    }

    if (key.length !== 1) return;

    const position = this.state.cursorPosition;
    if (position >= text.length) return;

    const expectedChar = text[position];
    const correct = key === expectedChar;

    this.totalCount++;
    if (correct) this.correctCount++;

    // Emit keystroke to server
    emitKeystroke({
      timestamp: performance.now() - this.raceStartTime,
      key,
      position,
      correct,
    });

    const newTypedChars = new Map(this.state.typedChars);
    newTypedChars.set(position, correct ? 'correct' : 'incorrect');

    const newPosition = position + 1;
    const isComplete = newPosition >= text.length;

    // Compute local WPM
    const elapsedMinutes = (performance.now() - this.raceStartTime) / 60000;
    const localWpm =
      elapsedMinutes > 0
        ? Math.round(this.correctCount / 5 / elapsedMinutes)
        : 0;
    const localAccuracy =
      this.totalCount > 0
        ? Math.round((this.correctCount / this.totalCount) * 100)
        : 100;

    this.state = {
      cursorPosition: newPosition,
      typedChars: newTypedChars,
      isComplete,
      localWpm,
      localAccuracy,
    };
    this.notify();

    return isComplete;
  }
}

const engine = new TypingEngine();

export function useTypingEngine(): TypingState {
  const socket = useSocket();
  const text = useGameStore((s) => s.text);
  const startTime = useGameStore((s) => s.startTime);
  const roomState = useGameStore((s) => s.roomState);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  const emitKeystroke = useCallback(
    (k: Keystroke) => socket.emit('keystroke', k),
    [socket]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (roomState !== 'racing' && roomState !== 'marathon') return;
      // Host is a spectator, not a competitor
      if (useGameStore.getState().isHost) return;
      // In marathon, only type when actively in an attempt
      if (roomState === 'marathon') {
        const attemptState = useGameStore.getState().marathonAttemptState;
        if (attemptState !== 'typing') return;
      }
      if (e.ctrlKey || e.metaKey) return;

      if (e.key.length === 1 || e.key === 'Backspace') {
        e.preventDefault();
      }

      const completed = engine.handleKey(e.key, text, emitKeystroke);
      if (completed) {
        socket.emit('race-complete');
      }
    },
    [roomState, text, socket, emitKeystroke]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset when race or attempt starts
  useEffect(() => {
    if ((roomState === 'racing' || roomState === 'marathon') && startTime) {
      engine.reset();
    }
  }, [roomState, startTime]);

  return state;
}
