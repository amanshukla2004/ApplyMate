import React from 'react';

export interface RingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
}

export const Ring: React.FC<RingProps> = ({ percentage, size = 124, strokeWidth, strokeColor }) => {
  const normalizedPercent = Math.min(100, Math.max(0, percentage));
  const sw = strokeWidth ?? (size <= 84 ? 9 : 12);
  const center = size / 2;
  const radius = center - sw / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalizedPercent / 100);

  const activeColor = strokeColor || (normalizedPercent === 100 ? '#10B981' : 'var(--accent)');

  return (
    <div
      className="ring"
      style={
        {
          '--c': `${circumference}`,
          '--o': `${offset}`,
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          flex: 'none',
        } as React.CSSProperties
      }
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={sw}
        />
        <circle
          className="v"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={sw}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <b
        style={{
          position: 'absolute',
          fontSize: size <= 64 ? '13px' : size <= 84 ? '17px' : '28px',
          fontWeight: 700,
          color: normalizedPercent === 100 && strokeColor === undefined ? '#10B981' : '#FFFFFF',
          letterSpacing: '-0.5px',
        }}
      >
        {normalizedPercent}%
      </b>
    </div>
  );
};
