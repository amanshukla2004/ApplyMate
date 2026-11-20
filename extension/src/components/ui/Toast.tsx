import React from 'react';

export interface ToastProps {
  show: boolean;
  message: string;
  variant?: 'success' | 'error';
  onRetry?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  show,
  message,
  variant = 'success',
  onRetry,
}) => {
  return (
    <div
      className={`toast ${variant === 'error' ? 'bad' : ''} ${show ? 'show' : ''}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {variant === 'error' && onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
};
