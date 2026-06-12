import logoPng from '../../assets/logo.png';
import logoPurplePng from '../../assets/logo-purple.png';

interface MarinLogoProps {
  className?: string;
  size?: number;
  /** If true, renders only the M glyph without the rounded-square background */
  glyphOnly?: boolean;
  purple?: boolean;
}

export default function MarinLogo({ className = '', size = 24, glyphOnly = false, purple = false }: MarinLogoProps) {
  const logoSrc = purple ? logoPurplePng : logoPng;
  
  if (glyphOnly) {
    return (
      <img
        src={logoSrc}
        style={{ width: size, height: size }}
        className={`${className} object-contain`}
        alt="MarinMC"
        draggable={false}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Rounded background */}
      <div className="absolute inset-0 rounded-[20%] border border-[#2D7DD2]/30 bg-gradient-to-br from-[#0c0a10] to-[#060305] flex items-center justify-center">
        <img
          src={logoSrc}
          className="w-[60%] h-[60%] object-contain"
          alt="MarinMC Logo"
          draggable={false}
        />
      </div>
    </div>
  );
}
