import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

const countdownColors: Record<number, string> = {
  3: 'text-success',
  2: 'text-warning',
  1: 'text-error',
  0: 'text-accent-primary text-glow',
};

export function Countdown() {
  const countdown = useGameStore((s) => s.countdown);
  const [displayNum, setDisplayNum] = useState(countdown);
  const [animKey, setAnimKey] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (countdown !== null) {
      setDisplayNum(countdown);
      setAnimKey((k) => k + 1);
      if (countdown === 0) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 500);
      }
    }
  }, [countdown]);

  const color = countdownColors[displayNum ?? 3] || 'text-accent-primary';
  const isGo = displayNum === 0;

  return (
    <div className="h-screen flex items-center justify-center p-4 relative">
      {showFlash && (
        <div className="screen-flash fixed inset-0 bg-accent-primary/20 z-20 pointer-events-none" />
      )}

      <div className="text-center">
        <div className="text-text-muted text-sm mb-6">
          {'> '}{isGo ? 'race started' : 'initializing race...'}
        </div>

        <div
          key={animKey}
          className={`terminal-appear text-8xl font-bold ${color}`}
          style={{ lineHeight: 1 }}
        >
          {isGo ? 'GO' : displayNum}
        </div>

        <div className="text-text-muted text-xs mt-6">
          {isGo ? '> start typing' : '> ready your fingers...'}
        </div>
      </div>
    </div>
  );
}
