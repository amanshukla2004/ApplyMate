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
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cursive 'h' Ascender Loop, Vertical Stem and Arch */}
        <path
          d="M 33 89 C 40 76, 50 48, 58 28 C 63 17, 70 16, 74 21 C 77 27, 73 40, 65 58 L 52 98 C 50 102, 53 103, 56 96 L 62 76 C 68 58, 80 50, 90 52 C 100 54, 103 66, 99 80 L 95 94 C 94 99, 100 102, 106 96"
          fill="none"
          stroke="#FCF0DA"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cheerful Warm Gold Spark Accent */}
        <circle cx="98" cy="28" r="6.5" fill="#F2C46A" />
      </svg>
    </span>
  );
};

// Backward-compatible aliases for existing imports
export const HappliedLogo = HapplyMateLogo;
export const ApplyMateLogo = HapplyMateLogo;
export default HapplyMateLogo;
