import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { RoomConfig } from './RoomConfig';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

function asciiBar(progress: number, width: number = 30): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function HostLobby() {
  const socket = useSocket();
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const config = useGameStore((s) => s.config);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const competitors = Object.values(players).filter((p) => !p.isSpectator);
  const canStart = competitors.length >= 1;

  const handleLeave = () => {
    socket.emit('leave-room');
    leaveRoom();
  };

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Giant room code */}
      <div className="shrink-0 text-center py-8">
        <div className="text-text-muted text-lg mb-2">join at</div>
        <div className="text-accent-primary text-8xl font-bold tracking-[0.3em] text-glow">
          {roomCode}
        </div>
        <div className="text-text-muted text-sm mt-3">
          {competitors.length} player{competitors.length !== 1 ? 's' : ''} connected
        </div>
      </div>

      {/* Player list + config */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        {/* Players */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="text-text-muted text-sm mb-3">{'> '}players</div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {competitors.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between py-2 px-3 text-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">{'>'}</span>
                  <span className="text-text-secondary">{player.name}</span>
                </div>
                <div>
                  {player.ready ? (
                    <Badge variant="success">READY</Badge>
                  ) : (
                    <span className="text-text-muted text-sm">waiting...</span>
                  )}
                </div>
              </div>
            ))}
            {competitors.length === 0 && (
              <div className="text-text-muted text-lg py-8 text-center">
                waiting for players to join...
              </div>
            )}
          </div>
        </div>

        {/* Config */}
        <div className="md:w-72 shrink-0 md:border-l md:border-border md:pl-6">
          <div className="text-text-muted text-sm mb-3">{'> '}config</div>
          <RoomConfig />
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center justify-between border-t border-border pt-4 mt-4">
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          leave
        </Button>
        <Button
          className="glow text-lg px-8 py-2"
          onClick={() => socket.emit('start-race')}
          disabled={!canStart}
        >
          {config.mode === 'marathon' ? 'start marathon' : 'start race'}
        </Button>
      </div>
    </div>
  );
}

function HostCountdown() {
  const roomCode = useGameStore((s) => s.roomCode);
  const countdown = useGameStore((s) => s.countdown);
  const players = useGameStore((s) => s.players);
  const competitors = Object.values(players).filter((p) => !p.isSpectator);

  const countdownColors: Record<number, string> = {
    3: 'text-success',
    2: 'text-warning',
    1: 'text-error',
    0: 'text-accent-primary text-glow',
  };

  const color = countdownColors[countdown ?? 3] || 'text-accent-primary';
  const isGo = countdown === 0;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Room code - smaller during countdown */}
      <div className="absolute top-6 right-8">
        <span className="text-text-muted text-sm">room: </span>
        <span className="text-accent-primary text-xl font-bold tracking-widest text-glow">
          {roomCode}
        </span>
      </div>

      <div className="text-center">
        <div className="text-text-muted text-lg mb-6">
          {isGo ? 'race started' : 'get ready...'}
        </div>
        <div
          className={`terminal-appear font-bold ${color}`}
          style={{ fontSize: '12rem', lineHeight: 1 }}
        >
          {isGo ? 'GO' : countdown}
        </div>
        <div className="text-text-muted text-sm mt-8">
          {competitors.length} player{competitors.length !== 1 ? 's' : ''} racing
        </div>
      </div>
    </div>
  );
}

function HostRacing() {
  const roomCode = useGameStore((s) => s.roomCode);
  const startTime = useGameStore((s) => s.startTime);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-accent-primary font-bold text-lg">typecomp</span>
          <span className="text-text-muted">// race in progress</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-text-muted text-lg">
            <span className="text-text-primary text-2xl font-bold">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </span>
          <span className="text-text-muted text-sm">
            room: <span className="text-accent-primary font-bold tracking-widest text-glow">{roomCode}</span>
          </span>
        </div>
      </div>

      {/* Giant leaderboard */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 py-3 px-4 card"
            >
              <span className="text-3xl font-bold text-text-muted w-12 text-right shrink-0">
                {entry.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl text-text-secondary truncate">
                    {entry.name}
                  </span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-2xl font-bold text-accent-secondary">
                      {entry.wpm}
                      <span className="text-sm text-text-muted ml-1">wpm</span>
                    </span>
                    <span className={`text-lg ${
                      entry.accuracy >= 95 ? 'text-success' :
                      entry.accuracy >= 80 ? 'text-warning' : 'text-error'
                    }`}>
                      {entry.accuracy}%
                    </span>
                    {entry.finished && <Badge variant="success">DONE</Badge>}
                    {entry.suspicious && <Badge variant="warning">!</Badge>}
                  </div>
                </div>
                <div className={`font-light tracking-tight text-lg ${
                  entry.finished ? 'text-success' : 'text-accent-primary'
                }`}>
                  {asciiBar(entry.progress)}
                  <span className="text-text-muted ml-2 text-sm">
                    {Math.round(entry.progress * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="text-text-muted text-lg text-center py-12">
              waiting for race data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HostMarathon() {
  const roomCode = useGameStore((s) => s.roomCode);
  const marathonEndTime = useGameStore((s) => s.marathonEndTime);
  const marathonLeaderboard = useGameStore((s) => s.marathonLeaderboard);
  const [timeLeft, setTimeLeft] = useState('');
  const [timeUrgent, setTimeUrgent] = useState(false);

  useEffect(() => {
    if (!marathonEndTime) return;
    const tick = () => {
      const remaining = marathonEndTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft('0:00');
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

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-accent-primary font-bold text-lg">typecomp</span>
          <span className="text-text-muted">// marathon</span>
        </div>
        <div className="flex items-center gap-6">
          <span className={`text-2xl font-bold ${
            timeUrgent ? 'text-error streak-pulse' : 'text-warning'
          }`}>
            {timeLeft}
          </span>
          <span className="text-text-muted text-sm">
            room: <span className="text-accent-primary font-bold tracking-widest text-glow">{roomCode}</span>
          </span>
        </div>
      </div>

      {/* Giant leaderboard */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          {marathonLeaderboard.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 py-3 px-4 card"
            >
              <span className="text-3xl font-bold text-text-muted w-12 text-right shrink-0">
                {entry.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xl text-text-secondary truncate">
                    {entry.name}
                    {entry.currentlyTyping && (
                      <span className="text-text-muted text-sm ml-2">typing...</span>
                    )}
                  </span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-2xl font-bold text-accent-secondary">
                      {entry.bestWpm}
                      <span className="text-sm text-text-muted ml-1">wpm</span>
                    </span>
                    <span className={`text-lg ${
                      entry.bestAccuracy >= 95 ? 'text-success' :
                      entry.bestAccuracy >= 80 ? 'text-warning' : 'text-error'
                    }`}>
                      {entry.bestAccuracy}%
                    </span>
                    <span className="text-text-muted text-sm">
                      {entry.attempts} {entry.attempts === 1 ? 'try' : 'tries'}
                    </span>
                    {entry.suspicious && <Badge variant="warning">!</Badge>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {marathonLeaderboard.length === 0 && (
            <div className="text-text-muted text-lg text-center py-12">
              waiting for attempts...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HostResults() {
  const socket = useSocket();
  const roomCode = useGameStore((s) => s.roomCode);
  const results = useGameStore((s) => s.results);
  const marathonLeaderboard = useGameStore((s) => s.marathonLeaderboard);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const isMarathon = marathonLeaderboard.length > 0;

  const handleLeave = () => {
    socket.emit('leave-room');
    leaveRoom();
  };

  const sprintWinner = results?.[0];
  const marathonWinner = marathonLeaderboard[0];
  const winner = isMarathon ? marathonWinner : sprintWinner;

  return (
    <div className="h-screen flex flex-col p-6">
      {/* Room code */}
      <div className="absolute top-6 right-8">
        <span className="text-text-muted text-sm">room: </span>
        <span className="text-accent-primary text-xl font-bold tracking-widest text-glow">
          {roomCode}
        </span>
      </div>

      {/* Winner showcase */}
      <div className="shrink-0 text-center py-8">
        <div className="text-text-muted text-lg mb-2">
          {isMarathon ? 'marathon winner' : 'race winner'}
        </div>
        {winner && (
          <>
            <div className="text-accent-secondary font-bold text-glow" style={{ fontSize: '4rem' }}>
              {winner.name}
            </div>
            <div className="text-accent-primary text-3xl font-bold mt-2 text-glow">
              {'wpm' in winner ? winner.wpm : ('bestWpm' in winner ? winner.bestWpm : 0)} WPM
            </div>
          </>
        )}
      </div>

      {/* Full results table */}
      <div className="flex-1 overflow-y-auto min-h-0 max-w-3xl mx-auto w-full">
        {!isMarathon && results && (
          <div className="space-y-2">
            {results.map((result) => (
              <div key={result.playerId} className="flex items-center gap-4 py-3 px-4 card">
                <span className="text-3xl font-bold text-text-muted w-12 text-right shrink-0">
                  {result.position}
                </span>
                <span className="text-xl text-text-secondary flex-1 truncate">
                  {result.name}
                </span>
                <span className="text-2xl font-bold text-accent-secondary">
                  {result.wpm} <span className="text-sm text-text-muted">wpm</span>
                </span>
                <span className="text-lg text-text-secondary">{result.accuracy}%</span>
                <span className="text-text-muted">{formatTime(result.time)}</span>
                {result.verified ? (
                  <span className="text-success">[ok]</span>
                ) : (
                  <span className="text-warning">[!]</span>
                )}
              </div>
            ))}
          </div>
        )}
        {isMarathon && (
          <div className="space-y-2">
            {marathonLeaderboard.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 py-3 px-4 card">
                <span className="text-3xl font-bold text-text-muted w-12 text-right shrink-0">
                  {entry.position}
                </span>
                <span className="text-xl text-text-secondary flex-1 truncate">
                  {entry.name}
                </span>
                <span className="text-2xl font-bold text-accent-secondary">
                  {entry.bestWpm} <span className="text-sm text-text-muted">wpm</span>
                </span>
                <span className="text-lg text-text-secondary">{entry.bestAccuracy}%</span>
                <span className="text-text-muted">{formatTime(entry.bestTime)}</span>
                <span className="text-text-muted text-sm">{entry.attempts} tries</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center justify-center gap-4 border-t border-border pt-4 mt-4">
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          leave
        </Button>
        <Button className="glow text-lg px-8 py-2" onClick={() => socket.emit('next-round')}>
          next round
        </Button>
      </div>
    </div>
  );
}

export function HostView() {
  const roomState = useGameStore((s) => s.roomState);

  switch (roomState) {
    case 'lobby':
      return <HostLobby />;
    case 'countdown':
      return <HostCountdown />;
    case 'racing':
      return <HostRacing />;
    case 'marathon':
      return <HostMarathon />;
    case 'finished':
      return <HostResults />;
    default:
      return <HostLobby />;
  }
}
