interface CqSearchGlyphProps {
  size?: number;
  color?: string;
}

export function CqSearchGlyph({ size = 14, color = 'currentColor' }: CqSearchGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" />
      <line x1="15" y1="15" x2="20" y2="20" />
    </svg>
  );
}
