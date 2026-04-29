import { useRef, useEffect, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { TypingState } from '../hooks/useTypingEngine';

interface TypingAreaProps {
  typingState: TypingState;
}

export function TypingArea({ typingState }: TypingAreaProps) {
  const text = useGameStore((s) => s.text);
  const { cursorPosition, typedChars, isComplete } = typingState;
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (typedChars.get(i) === 'correct') count++;
      else break;
    }
    return count;
  }, [cursorPosition, typedChars]);

  useEffect(() => {
    if (cursorRef.current && containerRef.current) {
      const container = containerRef.current;
      const cursor = cursorRef.current;
      const containerRect = container.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();
      if (cursorRect.bottom > containerRect.bottom - 40) {
        container.scrollTop += cursorRect.bottom - containerRect.bottom + 60;
      }
    }
  }, [cursorPosition]);

  return (
    <div className="card p-3 h-full flex flex-col">
      <div
        ref={containerRef}
        className="typing-text flex-1 overflow-y-auto select-none min-h-0"
        tabIndex={-1}
      >
        {text.split('').map((char, i) => {
          const status = typedChars.get(i);
          const isCursor = i === cursorPosition && !isComplete;
          const isJustTyped = i === cursorPosition - 1 && status !== undefined;

          let className = 'text-text-muted';
          if (status === 'correct') {
            className = isJustTyped ? 'char-pop text-correct' : 'text-correct';
          } else if (status === 'incorrect') {
            className = isJustTyped
              ? 'char-shake text-incorrect underline'
              : 'text-incorrect underline';
          }

          if (isCursor) className += ' cursor-block';

          return (
            <span
              key={i}
              ref={isCursor ? cursorRef : null}
              className={className}
            >
              {char === ' ' && status === 'incorrect' ? '\u00B7' : char}
            </span>
          );
        })}
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between mt-2 pt-2 border-t border-border text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {streak >= 10 && (
            <span className={`${streak >= 50 ? 'text-accent-secondary streak-pulse' : streak >= 25 ? 'text-accent-secondary' : 'text-text-secondary'}`}>
              streak: {streak}
            </span>
          )}
        </div>
        <div>
          {isComplete ? (
            <span className="text-success">complete // waiting...</span>
          ) : (
            <span>{cursorPosition}/{text.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}
