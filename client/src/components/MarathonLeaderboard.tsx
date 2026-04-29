import { useGameStore } from '../stores/gameStore';

export function MarathonLeaderboard() {
  const leaderboard = useGameStore((s) => s.marathonLeaderboard);
  const playerId = useGameStore((s) => s.playerId);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card p-3 h-full flex flex-col">
      <div className="text-xs text-text-muted mb-2 shrink-0">
        {'> '}standings
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-text-muted text-xs py-2">
          no attempts yet
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left py-1 pr-2">#</th>
                <th className="text-left py-1 pr-2">player</th>
                <th className="text-right py-1 pr-2">wpm</th>
                <th className="text-right py-1 pr-2">acc</th>
                <th className="text-right py-1 pr-2">time</th>
                <th className="text-right py-1">tries</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isMe = entry.id === playerId;
                return (
                  <tr
                    key={entry.id}
                    className={isMe ? 'text-accent-primary' : 'text-text-secondary'}
                  >
                    <td className="py-1 pr-2 text-text-muted">{entry.position}</td>
                    <td className="py-1 pr-2 truncate max-w-[80px]">
                      {entry.name}{isMe ? '*' : ''}
                      {entry.currentlyTyping && (
                        <span className="text-text-muted ml-1">...</span>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right font-bold">{entry.bestWpm}</td>
                    <td className="py-1 pr-2 text-right">{entry.bestAccuracy}%</td>
                    <td className="py-1 pr-2 text-right text-text-muted">
                      {formatTime(entry.bestTime)}
                    </td>
                    <td className="py-1 text-right text-text-muted">{entry.attempts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
