import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: ReactNode;
}

const variants = {
  default: 'text-text-muted',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`font-mono text-xs ${variants[variant]}`}>
      [{children}]
    </span>
  );
}
