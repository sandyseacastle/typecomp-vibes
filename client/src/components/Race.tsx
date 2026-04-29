import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { TypingArea } from './TypingArea';
import { Leaderboard } from './Leaderboard';

export function Race() {
  const startTime = useGameStore((s) => s.startTime);
  const typingState = useTypingEngine();
  const [elapsed, setElapsed] = useState(0);
  const prevWpm = useRef(typingState.localWpm);
  const [wpmBump, setWpmBump] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (typingState.localWpm !== prevWpm.current) {
      setWpmBump((k) => k + 1);
      prevWpm.current = typingState.localWpm;
    }
  }, [typingState.localWpm]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="h-screen flex flex-col p-3 gap-2 overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-2 text-xs">
        <div>
          <span className="text-accent-primary font-bold">typecomp</span>
          <span className="text-text-muted"> // race</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted">
            time: <span className="text-text-primary">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </span>
          <span className="text-text-muted">
            wpm: <span key={wpmBump} className="text-accent-secondary">{typingState.localWpm}</span>
          </span>
          <span className="text-text-muted">
            acc: <span className={
              typingState.localAccuracy >= 95 ? 'text-success' :
              typingState.localAccuracy >= 80 ? 'text-warning' : 'text-error'
            }>{typingState.localAccuracy}%</span>
          </span>
        </div>
      </div>

      {/* Main: typing + leaderboard side by side */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
        <div className="flex-1 min-h-0">
          <TypingArea typingState={typingState} />
        </div>
        <div className="w-full md:w-80 shrink-0 min-h-0">
          <Leaderboard />
        </div>
      </div>

      {/* Bottom hint */}
      <div className="shrink-0 text-center text-xs text-text-muted pt-1">
        {'// just start typing'}
      </div>
    </div>
  );
}
