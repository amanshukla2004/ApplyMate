import React from 'react';

export interface RingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const Ring: React.FC<RingProps> = ({ percentage, size = 124, strokeWidth }) => {
  const normalizedPercent = Math.min(100, Math.max(0, percentage));
  const sw = strokeWidth ?? (size <= 84 ? 9 : 12);
  const center = size / 2;
  const radius = center - sw / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalizedPercent / 100);

  return (
    <div
      className="ring"
      style={
        {
          '--c': `${circumference}`,
          '--o': `${offset}`,
        } as React.CSSProperties
      }
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={sw}
        />
        <circle
          className="v"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
      <b style={{ fontSize: size <= 84 ? '20px' : '28px' }}>{normalizedPercent}%</b>
    </div>
  );
};
