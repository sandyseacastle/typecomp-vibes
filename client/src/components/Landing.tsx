import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const taglines = [
  'race your friends. prove your speed.',
  'every keystroke counts.',
  'type fast. type first.',
  'show them who is fastest.',
  'fingers ready? lets go.',
];

export function Landing() {
  const socket = useSocket();
  const connected = useGameStore((s) => s.connected);
  const setRoom = useGameStore((s) => s.setRoom);

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tagline, setTagline] = useState('');
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = taglines[taglineIndex];
    if (!isDeleting && charIndex < current.length) {
      const timeout = setTimeout(() => setCharIndex((c) => c + 1), 40 + Math.random() * 30);
      return () => clearTimeout(timeout);
    }
    if (!isDeleting && charIndex === current.length) {
      const timeout = setTimeout(() => setIsDeleting(true), 2500);
      return () => clearTimeout(timeout);
    }
    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => setCharIndex((c) => c - 1), 20);
      return () => clearTimeout(timeout);
    }
    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setTaglineIndex((i) => (i + 1) % taglines.length);
    }
  }, [charIndex, isDeleting, taglineIndex]);

  useEffect(() => {
    setTagline(taglines[taglineIndex].slice(0, charIndex));
  }, [charIndex, taglineIndex]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    socket.emit('create-room', name.trim(), (response) => {
      setLoading(false);
      if (response.roomCode) {
        setRoom(response.roomCode, response.playerId);
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    setLoading(true);
    setError('');
    socket.emit(
      'join-room',
      { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() },
      (response) => {
        setLoading(false);
        if (response.success && response.playerId) {
          setRoom(roomCode.trim().toUpperCase(), response.playerId);
        } else {
          setError(response.error || 'failed to join room');
        }
      }
    );
  };

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Terminal header */}
        <div className="mb-8">
          <div className="text-2xl font-bold text-glow mb-1">
            typecomp
          </div>
          <div className="text-text-muted text-xs mb-3">
            real-time typing competition system v1.0
          </div>
          <div className="text-text-secondary text-sm h-5">
            {'> '}{tagline}<span className="typewriter-cursor">_</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className={connected ? 'text-success' : 'text-error'}>
              {connected ? '[*]' : '[o]'}
            </span>
            <span className="text-text-muted">
              {connected ? 'connected' : 'connecting...'}
            </span>
          </div>
        </div>

        {mode === 'choice' && (
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full glow"
              onClick={() => setMode('create')}
              disabled={!connected}
            >
              create room
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => setMode('join')}
              disabled={!connected}
            >
              join room
            </Button>
            <p className="text-text-muted text-xs mt-4">
              {'// no account needed'}
            </p>
          </div>
        )}

        {mode === 'create' && (
          <div className="card p-4">
            <div className="text-xs text-text-muted mb-4">{'> create room'}</div>
            <div className="space-y-3">
              <Input
                label="handle"
                placeholder="enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              {error && <p className="text-error text-xs">{'! '}{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMode('choice'); setError(''); }}
                >
                  back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!name.trim() || loading}
                >
                  {loading ? 'creating...' : 'go'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="card p-4">
            <div className="text-xs text-text-muted mb-4">{'> join room'}</div>
            <div className="space-y-3">
              <Input
                label="handle"
                placeholder="enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <Input
                label="room"
                placeholder="6-char code"
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(e.target.value.toUpperCase().slice(0, 6))
                }
                maxLength={6}
                className="tracking-[0.3em] uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              {error && <p className="text-error text-xs">{'! '}{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMode('choice'); setError(''); }}
                >
                  back
                </Button>
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={!name.trim() || roomCode.length !== 6 || loading}
                >
                  {loading ? 'joining...' : 'connect'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
