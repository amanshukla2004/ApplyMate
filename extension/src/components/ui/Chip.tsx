import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ active = false, children, className = '', ...props }) => {
  return (
    <button
      type="button"
      className={`chip ${className}`.trim()}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
};
