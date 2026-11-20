import React from 'react';

export type PillVariant = 'm' | 'r' | 'a' | 'u' | 'i';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
  children: React.ReactNode;
}

export const Pill: React.FC<PillProps> = ({ variant = 'i', children, className = '', ...props }) => {
  return (
    <span className={`pill ${variant} ${className}`} {...props}>
      {children}
    </span>
  );
};
