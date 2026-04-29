import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary:
    'border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-bg-primary',
  secondary:
    'border-text-muted text-text-secondary hover:border-text-secondary hover:text-text-primary',
  danger:
    'border-error text-error hover:bg-error hover:text-bg-primary',
  ghost:
    'border-transparent text-text-muted hover:text-text-secondary',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-5 py-1.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-mono border uppercase tracking-wider transition-colors duration-150
        focus:outline-none focus:ring-1 focus:ring-accent-primary/50
        disabled:opacity-40 disabled:cursor-not-allowed
        cursor-pointer
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
