import type { LeaderboardEntry } from '@typecomp/shared';
import { useGameStore } from '../stores/gameStore';

interface PlayerProgressProps {
  entry: LeaderboardEntry;
}

function asciiBar(progress: number, width: number = 20): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

export function PlayerProgress({ entry }: PlayerProgressProps) {
  const playerId = useGameStore((s) => s.playerId);
  const isMe = entry.id === playerId;
  const pct = Math.round(entry.progress * 100);

  return (
    <div
      className={`leaderboard-row flex items-center gap-2 py-1 px-1 text-xs ${
        isMe ? 'text-accent-primary' : 'text-text-secondary'
      }`}
    >
      <span className="w-4 text-right text-text-muted shrink-0">
        {entry.position}
      </span>
      <span className={`w-20 truncate ${isMe ? 'text-accent-primary' : ''}`}>
        {entry.name}{isMe ? '*' : ''}
      </span>
      <span className={`font-light tracking-tight shrink-0 ${
        entry.finished ? 'text-success' : isMe ? 'text-accent-primary' : 'text-text-muted'
      }`}>
        {asciiBar(entry.progress)}
      </span>
      <span className="w-8 text-right shrink-0">{pct}%</span>
      <span className="w-10 text-right shrink-0">
        {entry.wpm}<span className="text-text-muted">w</span>
      </span>
      <span className="w-10 text-right shrink-0 text-text-muted">
        {entry.accuracy}%
      </span>
      {entry.finished && <span className="text-success">[ok]</span>}
      {entry.suspicious && <span className="text-warning">[!]</span>}
    </div>
  );
}
