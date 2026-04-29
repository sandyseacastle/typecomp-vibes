import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { Button } from './ui/Button';

function SprintResults() {
  const results = useGameStore((s) => s.results);
  const playerId = useGameStore((s) => s.playerId);

  if (!results) return null;

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const winner = results[0];

  return (
    <>
      <div className="text-xs text-text-muted mb-4">{'> '}race results</div>

      {/* Winner highlight */}
      {winner && (
        <div className="text-center py-3 mb-3 border-b border-border">
          <div className="text-xs text-text-muted mb-1">1st place</div>
          <span className="text-accent-secondary text-lg font-bold">
            {winner.name}
          </span>
          <span className="text-text-muted"> // </span>
          <span className="text-accent-primary font-bold text-glow">
            {winner.wpm} wpm
          </span>
        </div>
      )}

      {/* Results table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-muted border-b border-border">
            <th className="text-left py-1 pr-3">#</th>
            <th className="text-left py-1 pr-3">player</th>
            <th className="text-right py-1 pr-3">wpm</th>
            <th className="text-right py-1 pr-3">acc</th>
            <th className="text-right py-1 pr-3">time</th>
            <th className="text-right py-1">status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const isMe = result.playerId === playerId;
            return (
              <tr
                key={result.playerId}
                className={isMe ? 'text-accent-primary' : 'text-text-secondary'}
              >
                <td className="py-1 pr-3 text-text-muted">{result.position}</td>
                <td className="py-1 pr-3">
                  {result.name}{isMe ? '*' : ''}
                </td>
                <td className="py-1 pr-3 text-right font-bold">{result.wpm}</td>
                <td className="py-1 pr-3 text-right">{result.accuracy}%</td>
                <td className="py-1 pr-3 text-right text-text-muted">
                  {formatTime(result.time)}
                </td>
                <td className="py-1 text-right">
                  {result.verified ? (
                    <span className="text-success">[ok]</span>
                  ) : (
                    <span className="text-warning">[!]</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function MarathonResults() {
  const leaderboard = useGameStore((s) => s.marathonLeaderboard);
  const playerId = useGameStore((s) => s.playerId);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const winner = leaderboard[0];

  return (
    <>
      <div className="text-xs text-text-muted mb-4">{'> '}marathon results</div>

      {/* Winner highlight */}
      {winner && (
        <div className="text-center py-3 mb-3 border-b border-border">
          <div className="text-xs text-text-muted mb-1">1st place</div>
          <span className="text-accent-secondary text-lg font-bold">
            {winner.name}
          </span>
          <span className="text-text-muted"> // </span>
          <span className="text-accent-primary font-bold text-glow">
            {winner.bestWpm} wpm
          </span>
          <span className="text-text-muted"> // </span>
          <span className="text-text-secondary">
            {winner.attempts} {winner.attempts === 1 ? 'try' : 'tries'}
          </span>
        </div>
      )}

      {/* Results table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-muted border-b border-border">
            <th className="text-left py-1 pr-3">#</th>
            <th className="text-left py-1 pr-3">player</th>
            <th className="text-right py-1 pr-3">wpm</th>
            <th className="text-right py-1 pr-3">acc</th>
            <th className="text-right py-1 pr-3">time</th>
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
                <td className="py-1 pr-3 text-text-muted">{entry.position}</td>
                <td className="py-1 pr-3">
                  {entry.name}{isMe ? '*' : ''}
                </td>
                <td className="py-1 pr-3 text-right font-bold">{entry.bestWpm}</td>
                <td className="py-1 pr-3 text-right">{entry.bestAccuracy}%</td>
                <td className="py-1 pr-3 text-right text-text-muted">
                  {formatTime(entry.bestTime)}
                </td>
                <td className="py-1 text-right text-text-muted">{entry.attempts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function Results() {
  const socket = useSocket();
  const isHost = useGameStore((s) => s.isHost);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const marathonLeaderboard = useGameStore((s) => s.marathonLeaderboard);
  const results = useGameStore((s) => s.results);

  const isMarathon = marathonLeaderboard.length > 0;

  const handleLeave = () => {
    socket.emit('leave-room');
    leaveRoom();
  };

  if (!isMarathon && !results) return null;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-4">
          <span className="text-accent-primary font-bold">typecomp</span>
          <span className="text-text-muted"> // results</span>
        </div>

        {/* Results content */}
        <div className="card p-4 mb-4">
          {isMarathon ? <MarathonResults /> : <SprintResults />}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            leave
          </Button>
          {isHost && (
            <Button size="sm" className="glow" onClick={() => socket.emit('next-round')}>
              next round
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
