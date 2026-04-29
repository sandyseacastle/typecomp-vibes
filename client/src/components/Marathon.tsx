import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { TypingArea } from './TypingArea';
import { MarathonLeaderboard } from './MarathonLeaderboard';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function Marathon() {
  const socket = useSocket();
  const marathonEndTime = useGameStore((s) => s.marathonEndTime);
  const attemptState = useGameStore((s) => s.marathonAttemptState);
  const lastResult = useGameStore((s) => s.lastAttemptResult);
  const attemptNumber = useGameStore((s) => s.attemptNumber);
  const typingState = useTypingEngine();
  const [timeLeft, setTimeLeft] = useState('');
  const [sessionOver, setSessionOver] = useState(false);
  const [timeUrgent, setTimeUrgent] = useState(false);

  useEffect(() => {
    if (!marathonEndTime) return;
    const tick = () => {
      const remaining = marathonEndTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft('0:00');
        setSessionOver(true);
        return;
      }
      setTimeUrgent(remaining < 60000);
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [marathonEndTime]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col p-3 gap-2 overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-2 text-xs">
        <div>
          <span className="text-accent-primary font-bold">typecomp</span>
          <span className="text-text-muted"> // marathon</span>
          {attemptNumber > 0 && (
            <span className="text-text-muted"> // attempt #{attemptNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted">
            left: <span className={
              sessionOver ? 'text-error' : timeUrgent ? 'text-error streak-pulse' : 'text-warning'
            }>{timeLeft}</span>
          </span>
          {attemptState === 'typing' && (
            <>
              <span className="text-text-muted">
                wpm: <span className="text-accent-secondary">{typingState.localWpm}</span>
              </span>
              <span className="text-text-muted">
                acc: <span className={
                  typingState.localAccuracy >= 95 ? 'text-success' :
                  typingState.localAccuracy >= 80 ? 'text-warning' : 'text-error'
                }>{typingState.localAccuracy}%</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main: typing area + leaderboard side by side */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
        {/* Left: typing / idle / result / session over */}
        <div className="flex-1 min-h-0">
          {attemptState === 'typing' && (
            <TypingArea typingState={typingState} />
          )}

          {attemptState === 'idle' && !sessionOver && (
            <div className="card p-4 h-full flex flex-col items-center justify-center">
              <div className="text-text-muted text-xs mb-4">{'> '}ready for attempt</div>
              <Button className="glow" onClick={() => socket.emit('start-attempt')}>
                start attempt
              </Button>
              <div className="text-text-muted text-xs mt-3">
                {'// best score will be recorded'}
              </div>
            </div>
          )}

          {attemptState === 'completed' && !sessionOver && lastResult && (
            <div className="card p-4 h-full flex flex-col items-center justify-center">
              <div className="text-text-muted text-xs mb-2">
                {'> '}attempt #{lastResult.attemptNumber} complete
              </div>
              <div className="text-accent-secondary text-2xl font-bold mb-1">
                {lastResult.wpm} <span className="text-sm text-text-muted">wpm</span>
              </div>
              <div className="flex gap-4 text-xs text-text-secondary mb-2">
                <span>{lastResult.accuracy}% acc</span>
                <span>{formatTime(lastResult.time)}</span>
              </div>
              <div className="flex gap-2 mb-4">
                {lastResult.isBest && <Badge variant="success">NEW BEST</Badge>}
                {!lastResult.verified && <Badge variant="warning">!</Badge>}
              </div>
              <Button className="glow" onClick={() => socket.emit('start-attempt')}>
                try again
              </Button>
            </div>
          )}

          {sessionOver && (
            <div className="card p-4 h-full flex flex-col items-center justify-center">
              <div className="text-error text-sm font-bold mb-2">
                {'> '}session terminated
              </div>
              <div className="text-text-muted text-xs">
                time limit reached // final standings shown
              </div>
            </div>
          )}
        </div>

        {/* Right: leaderboard */}
        <div className="w-full md:w-80 shrink-0 min-h-0">
          <MarathonLeaderboard />
        </div>
      </div>
    </div>
  );
}
