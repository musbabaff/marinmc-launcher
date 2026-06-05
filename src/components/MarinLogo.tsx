/**
 * MarinMC "M" Logo Component
 * Premium geometric M letterform with blue-indigo gradient.
 * Use this component everywhere instead of inline SVG M paths.
 */

interface MarinLogoProps {
  className?: string;
  size?: number;
  /** If true, renders only the M glyph without the rounded-square background */
  glyphOnly?: boolean;
}

export default function MarinLogo({ className = '', size = 24, glyphOnly = false }: MarinLogoProps) {
  if (glyphOnly) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mGlyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#2D7DD2" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <path
          d="M3 20V4 L7 4 L12 13 L17 4 L21 4 V20"
          stroke="url(#mGlyphGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#2D7DD2" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="mLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0c0a10" />
          <stop offset="100%" stopColor="#060305" />
        </linearGradient>
        <filter id="mGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Rounded background */}
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#mLogoBg)" stroke="url(#mLogoGrad)" strokeWidth="1.5" opacity="0.95" />
      {/* M letterform */}
      <g filter="url(#mGlow)">
        <path d="M 24,74 V 26" stroke="url(#mLogoGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M 24,26 L 50,54" stroke="url(#mLogoGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 50,54 L 76,26" stroke="url(#mLogoGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 76,26 V 74" stroke="url(#mLogoGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
