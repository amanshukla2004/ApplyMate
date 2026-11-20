import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ glass = true, children, className = '', ...props }) => {
  return (
    <div className={`${glass ? 'glass' : ''} card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
