import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import type { Difficulty, GameMode, RoomConfig as RoomConfigType } from '@typecomp/shared';

const wordCounts: RoomConfigType['wordCount'][] = [25, 50, 100];
const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
const modes: { value: GameMode; label: string }[] = [
  { value: 'sprint', label: 'sprint' },
  { value: 'marathon', label: 'marathon' },
];
const durations: RoomConfigType['marathonDuration'][] = [3, 5, 10];

function TerminalSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderLabel,
  disabled,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (val: T) => void;
  renderLabel?: (val: T) => string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-text-muted w-12 shrink-0 text-right">{label}:</span>
      <div className="flex gap-1">
        {options.map((opt) => {
          const isSelected = value === opt;
          const text = renderLabel ? renderLabel(opt) : String(opt);
          return (
            <button
              key={String(opt)}
              onClick={() => !disabled && onChange(opt)}
              disabled={disabled}
              className={`cursor-pointer transition-colors px-1 py-0.5 ${
                isSelected
                  ? 'text-accent-primary'
                  : 'text-text-muted hover:text-text-secondary'
              } ${disabled ? 'cursor-default' : ''}`}
            >
              {isSelected ? `[${text}]` : text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RoomConfig() {
  const socket = useSocket();
  const config = useGameStore((s) => s.config);
  const isHost = useGameStore((s) => s.isHost);

  if (!isHost) {
    return (
      <div className="text-xs text-text-muted space-y-0.5">
        <div>mode: <span className="text-text-secondary">{config.mode}</span></div>
        <div>words: <span className="text-text-secondary">{config.wordCount}</span></div>
        <div>diff: <span className="text-text-secondary">{config.difficulty}</span></div>
        {config.mode === 'marathon' && (
          <div>time: <span className="text-text-secondary">{config.marathonDuration}m</span></div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <TerminalSelect
        label="mode"
        options={modes.map((m) => m.value)}
        value={config.mode}
        onChange={(mode) => socket.emit('update-config', { mode })}
        renderLabel={(val) => modes.find((m) => m.value === val)!.label}
      />
      <TerminalSelect
        label="words"
        options={wordCounts}
        value={config.wordCount}
        onChange={(wordCount) => socket.emit('update-config', { wordCount })}
      />
      <TerminalSelect
        label="diff"
        options={difficulties}
        value={config.difficulty}
        onChange={(difficulty) => socket.emit('update-config', { difficulty })}
      />
      {config.mode === 'marathon' && (
        <TerminalSelect
          label="time"
          options={durations}
          value={config.marathonDuration}
          onChange={(marathonDuration) =>
            socket.emit('update-config', { marathonDuration })
          }
          renderLabel={(val) => `${val}m`}
        />
      )}
    </div>
  );
}
