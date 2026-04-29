import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { RoomConfig } from './RoomConfig';

export function Lobby() {
  const socket = useSocket();
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const isHost = useGameStore((s) => s.isHost);
  const playerId = useGameStore((s) => s.playerId);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const config = useGameStore((s) => s.config);
  const playerList = Object.values(players).filter((p) => !p.isSpectator);
  const canStart = playerList.length >= 1;

  const handleCopyCode = () => {
    if (roomCode) navigator.clipboard.writeText(roomCode);
  };

  const handleLeave = () => {
    socket.emit('leave-room');
    leaveRoom();
  };

  return (
    <div className="h-screen flex flex-col p-4 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-2 mb-3 text-xs">
        <div>
          <span className="text-accent-primary font-bold">typecomp</span>
          <span className="text-text-muted"> // lobby</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">room:</span>
          <button
            onClick={handleCopyCode}
            className="text-accent-secondary font-bold tracking-widest hover:text-accent-primary transition-colors cursor-pointer"
            title="click to copy"
          >
            {roomCode}
          </button>
          <button
            onClick={handleCopyCode}
            className="text-text-muted hover:text-text-secondary cursor-pointer text-xs"
          >
            [copy]
          </button>
        </div>
      </div>

      {/* Main: 2-column */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left: Players */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xs text-text-muted mb-2">
            {'> '}players ({playerList.length}/8)
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {playerList.map((player) => {
              const isMe = player.id === playerId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between py-1.5 px-2 text-sm ${
                    isMe ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">{'>'}</span>
                    <span>{player.name}</span>
                    {player.isHost && <Badge variant="warning">HOST</Badge>}
                    {isMe && <Badge>YOU</Badge>}
                  </div>
                  <div>
                    {player.ready ? (
                      <Badge variant="success">RDY</Badge>
                    ) : (
                      <Badge>...</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {playerList.length === 0 && (
              <div className="text-text-muted text-xs py-2">no players connected</div>
            )}
          </div>
        </div>

        {/* Right: Config */}
        <div className="md:w-64 shrink-0 md:border-l md:border-border md:pl-4">
          <div className="text-xs text-text-muted mb-2">{'> '}config</div>
          <RoomConfig />
          <div className="text-xs text-text-muted mt-3">
            {config.mode === 'sprint'
              ? '// everyone races the same text'
              : '// retry within time limit'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center justify-between border-t border-border pt-2 mt-3">
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          leave
        </Button>
        <div className="flex gap-2">
          {!isHost && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => socket.emit('player-ready')}
            >
              {players[playerId!]?.ready ? 'unready' : 'ready'}
            </Button>
          )}
          {isHost && (
            <Button
              size="sm"
              className="glow"
              onClick={() => socket.emit('start-race')}
              disabled={!canStart}
            >
              {config.mode === 'marathon' ? 'start marathon' : 'start race'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
