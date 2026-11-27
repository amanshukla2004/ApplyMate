import React from 'react';

/**
 * #TODO: [Brand & Identity]
 * Design custom vector SVG and multi-resolution PNG icons for HapplyMate:
 * - 16x16 px (Browser tab favicon, extension tray)
 * - 32x32 px (Chrome extension management & high-DPI displays)
 * - 48x48 px (Chrome extension menu & permissions dialog)
 * - 128x128 px (Chrome Web Store official icon & installation banner)
 * Motif requirements: A joyful, modern geometric emblem uniting 'H' & 'A' with
 * an upward launch arrow and a subtle optimistic smile curve in brand charcoal and sage (#4C4541 -> #AEAC78).
 */

export interface HapplyMateLogoProps {
  size?: number;
  className?: string;
}

export const HapplyMateLogo: React.FC<HapplyMateLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <span
      className={`logo ${className}`.trim()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.28)}px`,
        background: 'linear-gradient(135deg, #4C4541 0%, #35302E 50%, #201D1C 100%)',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        boxShadow: '0 4px 14px rgba(76, 69, 65, 0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* Subtle glassmorphism highlight sheen */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: `${Math.round(size * 0.28)}px ${Math.round(size * 0.28)}px 0 0`,
          pointerEvents: 'none',
        }}
      />
      <svg
        width={Math.round(size * 0.65)}
        height={Math.round(size * 0.65)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Modern HapplyMate glyph: Dynamic Upward Arrow + Cheerful Smile Arc */}
        <path
          d="M12 2.5L3.5 15.5H8.5V20.5H15.5V15.5H20.5L12 2.5Z"
          fill="#ffffff"
        />
        {/* Inner joyful chevron highlight */}
        <path
          d="M12 7.2L8 13.5H16L12 7.2Z"
          fill="#AEAC78"
        />
        {/* Subtle optimistic smile arc accent at the base */}
        <path
          d="M7 21.5C9.5 23 14.5 23 17 21.5"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
};

// Backward-compatible alias for existing imports
export const ApplyMateLogo = HapplyMateLogo;
export default HapplyMateLogo;
