import Image from 'next/image';

type Party = 'd' | 'r' | 'i';

interface CqPortraitProps {
  name: string;
  size?: number;
  party?: Party;
  src?: string;
  alt?: string;
}

const PARTY_STRIPE: Record<Party, string> = {
  d: 'var(--party-democrat)',
  r: 'var(--civiq-red)',
  i: 'var(--data-vlau)',
};

export function CqPortrait({ name, size = 120, party = 'i', src, alt }: CqPortraitProps) {
  const initials = name
    .split(' ')
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        flexShrink: 0,
        backgroundImage: src
          ? undefined
          : 'repeating-linear-gradient(45deg, var(--bg2) 0 8px, var(--bg3) 8px 16px)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: PARTY_STRIPE[party],
          zIndex: 1,
        }}
      />
      {src ? (
        <Image
          src={src}
          alt={alt ?? name}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            fontSize: size * 0.32,
            letterSpacing: '-0.03em',
            color: 'var(--fg1)',
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
