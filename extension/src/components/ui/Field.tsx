import React from 'react';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      <label className="f" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="hint err" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
};
