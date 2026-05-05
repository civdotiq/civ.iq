// Address result — list of officials for a location

const OFFICIALS = [
  {
    id: 'jeffries',
    name: 'Hakeem S. Jeffries',
    role: 'U.S. Representative',
    district: 'NY-08',
    party: 'd',
    since: 2013,
    funding: '$2.4M',
    party_vote: 87,
  },
  {
    id: 'schumer',
    name: 'Charles E. Schumer',
    role: 'U.S. Senator',
    district: 'NY',
    party: 'd',
    since: 1999,
    funding: '$31.8M',
    party_vote: 94,
  },
  {
    id: 'gillib',
    name: 'Kirsten E. Gillibrand',
    role: 'U.S. Senator',
    district: 'NY',
    party: 'd',
    since: 2009,
    funding: '$12.1M',
    party_vote: 92,
  },
];

function AddressResultScreen({ address, onSelect, onBack }) {
  return (
    <main style={{ padding: '48px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            padding: 0,
            marginBottom: 20,
          }}
        >
          ← Change address
        </button>

        <Eyebrow>Your federal officials</Eyebrow>
        <h2
          style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 6px' }}
        >
          {address}
        </h2>
        <p
          style={{
            fontSize: 15,
            color: '#6b7280',
            margin: '0 0 32px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Matched to Brooklyn, NY · 11201 · District NY-08
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {OFFICIALS.map((o, i) => (
            <OfficialRow key={o.id} official={o} onClick={() => onSelect(o.id)} first={i === 0} />
          ))}
        </div>
      </div>
    </main>
  );
}

function OfficialRow({ official, onClick, first }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 160px 160px 80px',
        gap: 24,
        padding: '24px 0',
        borderTop: first ? '2px solid #000' : '1px solid #e5e7eb',
        borderBottom: '1px solid transparent',
        cursor: 'pointer',
        background: hover ? '#f9fafb' : 'transparent',
        alignItems: 'center',
        paddingLeft: hover ? 12 : 0,
        transition: 'all 150ms cubic-bezier(0.25,0.1,0.25,1)',
      }}
    >
      <div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <Chip variant={official.party} size="sm">
            {official.party === 'd' ? 'D' : official.party === 'r' ? 'R' : 'I'} ·{' '}
            {official.district}
          </Chip>
          <Eyebrow>{official.role}</Eyebrow>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {official.name}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          In office since {official.since}
        </div>
      </div>
      <div>
        <Eyebrow>Party vote</Eyebrow>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#0a9338',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {official.party_vote}%
        </div>
      </div>
      <div>
        <Eyebrow>Raised 2024</Eyebrow>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#3ea2d4',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {official.funding}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 24, color: hover ? '#3ea2d4' : '#9ca3af' }}>
        →
      </div>
    </div>
  );
}

Object.assign(window, { AddressResultScreen, OFFICIALS });
