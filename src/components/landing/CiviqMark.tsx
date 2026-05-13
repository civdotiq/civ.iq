/**
 * CIV.IQ brand mark — red circle (head), green dome (body), four blue dots (constituents).
 * Geometric, Aicher-style, scale-independent. Uses the canonical civiq color tokens.
 */

interface CiviqMarkProps {
  className?: string;
  size?: number;
  title?: string;
}

export function CiviqMark({ className, size = 120, title = 'CIV.IQ' }: CiviqMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 188) / 120}
      viewBox="0 0 120 188"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title}
    >
      <circle cx="60" cy="28" r="28" fill="#e11d07" />
      <path d="M 32 62 A 105 105 0 0 0 88 62 L 88 140 L 32 140 Z" fill="#0a9338" />
      <circle cx="32" cy="156" r="7" fill="#3ea2d4" />
      <circle cx="50.7" cy="156" r="7" fill="#3ea2d4" />
      <circle cx="69.3" cy="156" r="7" fill="#3ea2d4" />
      <circle cx="88" cy="156" r="7" fill="#3ea2d4" />
    </svg>
  );
}
