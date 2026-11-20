import React from 'react';

export interface ApplyMateLogoProps {
  size?: number;
  className?: string;
}

export const ApplyMateLogo: React.FC<ApplyMateLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <span
      className={`logo ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.28)}px`,
        background: 'linear-gradient(135deg, #8B74F0 0%, #6366F1 100%)',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        boxShadow: '0 4px 12px rgba(139, 116, 240, 0.35)',
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.625)}
        height={Math.round(size * 0.625)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Geometric "A" with upward launch trajectory */}
        <path
          d="M12 3L3 21H7.5L9.5 16.5H14.5L16.5 21H21L12 3Z"
          fill="#ffffff"
        />
        <path
          d="M12 8.5L13.8 13.5H10.2L12 8.5Z"
          fill="#8B74F0"
        />
        {/* Dynamic crossbar accent */}
        <path
          d="M9.5 14.5L14.5 14.5L12 9.5Z"
          fill="#ffffff"
          opacity="0.9"
        />
      </svg>
    </span>
  );
};
