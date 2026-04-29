import { useGameStore } from '../stores/gameStore';
import { PlayerProgress } from './PlayerProgress';

export function Leaderboard() {
  const leaderboard = useGameStore((s) => s.leaderboard);

  return (
    <div className="card p-3 h-full flex flex-col">
      <div className="text-xs text-text-muted mb-2 shrink-0">
        {'> '}leaderboard
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
        {leaderboard.map((entry) => (
          <PlayerProgress key={entry.id} entry={entry} />
        ))}
        {leaderboard.length === 0 && (
          <p className="text-text-muted text-xs py-2">
            waiting for data...
          </p>
        )}
      </div>
    </div>
  );
}
