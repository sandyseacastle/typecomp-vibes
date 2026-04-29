import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {label && (
        <label className="text-text-muted shrink-0">{label}:</label>
      )}
      <input
        className={`
          flex-1 bg-transparent border-b border-text-muted
          text-text-primary py-1 text-sm
          placeholder:text-text-muted/50
          focus:border-accent-primary focus:outline-none
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
