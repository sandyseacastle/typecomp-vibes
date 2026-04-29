import { useSocketEvents } from './hooks/useSocketEvents';
import { useAntiCheat } from './hooks/useAntiCheat';
import { useGameStore } from './stores/gameStore';
import { Landing } from './components/Landing';
import { Lobby } from './components/Lobby';
import { Countdown } from './components/Countdown';
import { Race } from './components/Race';
import { Results } from './components/Results';
import { Marathon } from './components/Marathon';
import { HostView } from './components/HostView';

function App() {
  useSocketEvents();
  useAntiCheat();

  const roomCode = useGameStore((s) => s.roomCode);
  const roomState = useGameStore((s) => s.roomState);
  const isHost = useGameStore((s) => s.isHost);

  if (!roomCode) return <Landing />;

  if (isHost) return <HostView />;

  switch (roomState) {
    case 'lobby':
      return <Lobby />;
    case 'countdown':
      return <Countdown />;
    case 'racing':
      return <Race />;
    case 'marathon':
      return <Marathon />;
    case 'finished':
      return <Results />;
    default:
      return <Landing />;
  }
}

export default App;
