import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`in ${error ? 'border-red-500' : ''} ${className}`.trim()}
      {...props}
    />
  );
});

Input.displayName = 'Input';
