interface CqLogoMarkProps {
  size?: number;
  title?: string;
}

export function CqLogoMark({ size = 24, title = 'CIV.IQ' }: CqLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      style={{ flexShrink: 0 }}
    >
      <title>{title}</title>
      <circle cx="6" cy="5" r="2.4" fill="var(--civiq-red)" />
      <rect x="3.6" y="9" width="4.8" height="13" fill="var(--civiq-green)" />
      <rect x="11.5" y="9" width="3.2" height="3.2" fill="var(--civiq-blue)" />
      <rect x="15.7" y="9" width="3.2" height="3.2" fill="var(--civiq-blue)" />
      <rect x="11.5" y="13.2" width="3.2" height="3.2" fill="var(--civiq-blue)" />
      <rect x="15.7" y="13.2" width="3.2" height="3.2" fill="var(--civiq-blue)" />
    </svg>
  );
}
