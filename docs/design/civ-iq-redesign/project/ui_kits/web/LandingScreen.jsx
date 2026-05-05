// Landing screen — full marketing page for civdotiq.org
// "Newspaper front page meets Munich '72 poster" — dense, editorial, civic.

function LandingScreen({ onSubmit }) {
  const [addr, setAddr] = React.useState('1600 Pennsylvania Ave NW, Washington DC');

  return (
    <main style={{ background: '#fff' }}>
      {/* ──────────────────────────────────────────────────────
          MASTHEAD STRIP — newspaper-style
      ────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #000', background: '#fff' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '6px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            fontWeight: 600,
          }}
        >
          <span>VOL. III · NO. 26 · APRIL 26, 2026</span>
          <span>Independent · Nonpartisan · Open Source (MIT)</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>civdotiq.org</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
          HERO — large editorial type + address lookup + side card
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '64px 24px 56px',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 56,
            alignItems: 'start',
          }}
        >
          <div>
            <Eyebrow style={{ color: '#3ea2d4', fontSize: 12 }}>The Civic Record</Eyebrow>
            <h1
              style={{
                fontSize: 104,
                fontWeight: 700,
                lineHeight: 0.92,
                letterSpacing: '-0.035em',
                margin: '16px 0 24px',
                textTransform: 'uppercase',
              }}
            >
              Public
              <br />
              record,
              <br />
              <span style={{ color: '#3ea2d4' }}>made legible.</span>
            </h1>
            <p
              style={{
                fontSize: 19,
                lineHeight: 1.5,
                color: '#374151',
                maxWidth: 560,
                margin: '0 0 36px',
                fontWeight: 400,
              }}
            >
              Enter a home address. CIV.IQ pulls records from{' '}
              <strong>181 federal data feeds</strong>— Congress, FEC, USASpending, Senate LDA, the
              Federal Register — and presents one clear civic record per representative. Plain
              language. No ads. No signups.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                onSubmit(addr);
              }}
              style={{ display: 'flex', gap: 0, maxWidth: 640 }}
            >
              <Input
                value={addr}
                onChange={setAddr}
                placeholder="Enter your home address"
                style={{ borderRight: 'none', fontSize: 16 }}
              />
              <Button
                type="submit"
                variant="primary"
                style={{ flexShrink: 0, padding: '14px 24px', borderRadius: 0, fontSize: 13 }}
              >
                Look up →
              </Button>
            </form>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Eyebrow>Try:</Eyebrow>
              {['350 5th Ave, NYC', '500 W Temple, LA', '1 City Hall Sq, Boston'].map(s => (
                <button
                  key={s}
                  onClick={() => setAddr(s)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    color: '#3ea2d4',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Side card — sample official preview */}
          <div style={{ border: '2px solid #000', background: '#fff' }}>
            <div
              style={{
                padding: '10px 14px',
                background: '#111827',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Sample Record</span>
              <span style={{ color: '#9ca3af' }}>NY-08 · 119th Congress</span>
            </div>
            <div
              style={{
                padding: 20,
                borderBottom: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: '#0a9338',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                }}
              >
                HJ
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                  Hakeem Jeffries
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                  House Minority Leader · Brooklyn, NY-08
                  <br />
                  Democrat · Serving since 2013
                </div>
              </div>
            </div>
            {[
              { l: 'Votes this Congress', v: '247', c: '#111827' },
              { l: 'Party-line vote rate', v: '94.2%', c: '#0a9338' },
              { l: 'Bills sponsored', v: '18', c: '#111827' },
              { l: '2024 cycle receipts', v: '$3.4M', c: '#3ea2d4' },
              {
                l: 'Top contributing sector',
                v: 'Securities & Investment',
                c: '#111827',
                sm: true,
              },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '10px 20px',
                  borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#6b7280', fontSize: 12 }}>{r.l}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: r.c,
                    fontSize: r.sm ? 12 : 14,
                    fontFamily: r.sm ? 'var(--font-primary)' : 'var(--font-mono)',
                  }}
                >
                  {r.v}
                </span>
              </div>
            ))}
            <div
              style={{
                padding: '10px 20px',
                background: '#f9fafb',
                fontSize: 10,
                color: '#6b7280',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              Sources · Congress.gov · FEC.gov · Senate LDA
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          STAT BAND — proof of breadth
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', background: '#111827', color: '#fff' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
          }}
        >
          {[
            { l: 'Federal data feeds', v: '181', c: '#3ea2d4' },
            { l: 'Members of Congress', v: '535', c: '#0a9338' },
            { l: 'Bills tracked', v: '17,400+', c: '#fff' },
            { l: 'FEC filings', v: '$8.2B', c: '#e11d07' },
            { l: 'Reading level', v: '8th grade', c: '#fff' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: '28px 20px',
                borderRight: i < 4 ? '1px solid #374151' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: s.c,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  marginTop: 8,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          SAMPLE QUERIES — common civic questions
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 28,
              paddingBottom: 12,
              borderBottom: '2px solid #000',
            }}
          >
            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Common questions
            </h2>
            <Eyebrow>Question pages · /ask/...</Eyebrow>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
              border: '2px solid #000',
            }}
          >
            {[
              {
                n: '01',
                q: "Where do my senator's campaign contributions come from?",
                t: 'FEC data · Industry breakdown · Vote-finance correlation',
                c: '#3ea2d4',
              },
              {
                n: '02',
                q: 'How does this legislator vote compared to their party?',
                t: 'Party-line rate · Quarterly trends · Notable shifts',
                c: '#0a9338',
              },
              {
                n: '03',
                q: 'Who lobbied my representative last quarter?',
                t: 'Senate LDA filings · Issue codes · Spend per filing',
                c: '#e11d07',
              },
              {
                n: '04',
                q: 'What bills has my representative actually sponsored?',
                t: 'Sponsored & cosponsored · Status · Plain-language summary',
                c: '#3ea2d4',
              },
              {
                n: '05',
                q: 'What stocks did my senator trade this year?',
                t: 'STOCK Act · Per filing · Committee jurisdiction overlap',
                c: '#0a9338',
              },
              {
                n: '06',
                q: 'Which federal contracts went to my district?',
                t: 'USASpending · Top recipients · Year-over-year',
                c: '#e11d07',
              },
            ].map((q, i) => (
              <a
                key={i}
                href="#"
                style={{
                  padding: '24px',
                  textDecoration: 'none',
                  color: '#111827',
                  borderRight: i % 3 !== 2 ? '1px solid #e5e7eb' : 'none',
                  borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: '#fff',
                  transition: 'background 100ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: q.c,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  {q.n}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {q.q}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#6b7280',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginTop: 'auto',
                  }}
                >
                  {q.t}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          HOW IT WORKS — 4-step pipeline as Aicher pictogram strip
      ────────────────────────────────────────────────────────── */}
      <section
        style={{ borderBottom: '2px solid #000', padding: '64px 24px', background: '#f9fafb' }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Eyebrow style={{ color: '#3ea2d4' }}>The Pipeline</Eyebrow>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '8px 0 36px',
              textTransform: 'uppercase',
              maxWidth: 720,
              lineHeight: 1,
            }}
          >
            How a government filing
            <br />
            becomes a clear answer.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              border: '2px solid #000',
              background: '#fff',
            }}
          >
            {[
              {
                n: '01',
                t: 'Collect',
                d: 'We download new records from 181 government websites every day — votes, bills, campaign filings, and more.',
              },
              {
                n: '02',
                t: 'Connect',
                d: 'We link records about the same person across different government databases, so you see one full picture instead of scattered files.',
              },
              {
                n: '03',
                t: 'Rewrite',
                d: 'We rewrite legal and bureaucratic language into clear sentences anyone can read — no law degree required.',
              },
              {
                n: '04',
                t: 'Show the source',
                d: 'Every fact on the page links to the original government document, with the date it was filed. You can always check our work.',
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '28px 24px',
                  borderRight: i < 3 ? '1px solid #000' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Aicher-style pictogram placeholder */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    border: '2px solid #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      i === 0 ? '#3ea2d4' : i === 1 ? '#0a9338' : i === 2 ? '#e11d07' : '#111827',
                    color: '#fff',
                  }}
                >
                  {i === 0 && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="6" height="6" />
                      <rect x="14" y="4" width="6" height="6" />
                      <rect x="4" y="14" width="6" height="6" />
                      <rect x="14" y="14" width="6" height="6" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="7" cy="12" r="4" />
                      <circle cx="17" cy="12" r="4" />
                      <line x1="11" y1="12" x2="13" y2="12" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="4" width="18" height="2" />
                      <rect x="3" y="11" width="14" height="2" />
                      <rect x="3" y="18" width="10" height="2" />
                    </svg>
                  )}
                  {i === 3 && (
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="5,12 10,17 19,7" />
                    </svg>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: '#6b7280',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    textTransform: 'uppercase',
                  }}
                >
                  {s.t}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#374151' }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          LIVE DATA FEED — newspaper headlines style
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', padding: '64px 24px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '2px solid #000',
              }}
            >
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                }}
              >
                Latest votes
              </h3>
              <Eyebrow>House &amp; Senate · Today</Eyebrow>
            </div>
            {[
              {
                ts: '2:14 PM',
                t: 'H.R. 4521 — Continuing Appropriations',
                r: 'Passed',
                rc: '#0a9338',
                v: '218–214',
                d: 'Largely party-line. 3 GOP defections.',
              },
              {
                ts: '11:30 AM',
                t: 'H.R. 1216 — Federal Permitting Reform',
                r: 'Failed',
                rc: '#e11d07',
                v: '201–230',
                d: 'Sponsor: Rep. Westerman (R-AR)',
              },
              {
                ts: '9:45 AM',
                t: 'S. Amdt. 882 — Defense Auth. Act',
                r: 'Passed',
                rc: '#0a9338',
                v: '64–35',
                d: 'Bipartisan; 8 Democrats voted no.',
              },
              {
                ts: 'Yest 5:02 PM',
                t: 'H. Res. 89 — Censure motion',
                r: 'Tabled',
                rc: '#6b7280',
                v: '212–219',
                d: 'Procedural; no recorded merits vote.',
              },
            ].map((v, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 0',
                  borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: 16,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b7280' }}>
                  {v.ts}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                    {v.t}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{v.d}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: v.rc,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {v.r}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: '#111827',
                      marginTop: 2,
                    }}
                  >
                    {v.v}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '2px solid #000',
              }}
            >
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                }}
              >
                Recent filings
              </h3>
              <Eyebrow>FEC · Senate LDA · This week</Eyebrow>
            </div>
            {[
              {
                src: 'Senate LDA',
                who: 'Microsoft Corp.',
                amt: '$2.4M',
                topic: 'AI safety, cloud procurement, antitrust',
                q: 'Q1 2026',
              },
              {
                src: 'FEC F3',
                who: 'Sherrod Brown for Senate',
                amt: '$4.1M',
                topic: 'Q1 receipts · 84% individual contributions',
                q: 'Q1 2026',
              },
              {
                src: 'Senate LDA',
                who: 'Pharmaceutical Research & Manufacturers',
                amt: '$8.7M',
                topic: 'Drug pricing, IRA implementation',
                q: 'Q1 2026',
              },
              {
                src: 'FEC F24',
                who: 'Senate Majority PAC',
                amt: '$1.2M',
                topic: 'Independent expenditure · Ohio race',
                q: 'Apr 22',
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{ padding: '14px 0', borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: '#3ea2d4',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    {f.src}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    {f.amt}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                  {f.who}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{f.topic}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{f.q}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          COVERAGE HONESTY — three tiers
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Eyebrow>Coverage, Honestly</Eyebrow>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '8px 0 12px',
              textTransform: 'uppercase',
              maxWidth: 880,
              lineHeight: 1,
            }}
          >
            What we have. What we don't.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#374151',
              maxWidth: 720,
              marginBottom: 32,
              lineHeight: 1.5,
            }}
          >
            When a record is missing, we say so — clearly, on the page. We never show a blank space
            and let you assume there's nothing to find.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
              border: '2px solid #000',
            }}
          >
            {[
              {
                tier: 'Federal',
                tag: 'Complete',
                color: '#0a9338',
                pct: '100%',
                barColor: '#0a9338',
                lines: [
                  '535 members of Congress',
                  'All bills, all roll calls',
                  'FEC + LDA + USASpending',
                  '15 wired domains',
                ],
              },
              {
                tier: 'State',
                tag: 'Mostly complete',
                color: '#3ea2d4',
                pct: '85%',
                barColor: '#3ea2d4',
                lines: [
                  'Every state legislature, all 50 states',
                  '7,383 state legislators',
                  'Bills, votes, and committee assignments',
                  'State-level campaign finance — not yet available',
                ],
              },
              {
                tier: 'Local',
                tag: 'Pilot',
                color: '#d97706',
                pct: '10 cities',
                barColor: '#d97706',
                lines: [
                  'Austin, Boston, Chicago, Denver, Detroit',
                  'Minneapolis, Oakland, Philadelphia',
                  'Portland, Seattle',
                  "Other cities: we tell you we don't have it yet",
                ],
              },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  padding: 28,
                  borderRight: i < 2 ? '1px solid #000' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <h3
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {t.tier}
                  </h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 24,
                      fontWeight: 700,
                      color: t.color,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {t.pct}
                  </span>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    background: t.color,
                    color: '#fff',
                    padding: '3px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {t.tag}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {t.lines.map((l, j) => (
                    <li
                      key={j}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: '#374151',
                        padding: '6px 0',
                        borderBottom: j < t.lines.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      {l.includes('not available') ||
                      l.includes('went offline') ||
                      l.includes("don't have") ? (
                        <span>
                          <span style={{ color: '#e11d07', fontWeight: 700 }}>—</span> {l}
                        </span>
                      ) : (
                        <span>
                          <span style={{ color: t.color, fontWeight: 700 }}>+</span> {l}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          WHO USES IT — audience strip
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: '2px solid #000',
          padding: '64px 24px',
          background: '#111827',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Eyebrow style={{ color: '#3ea2d4' }}>
            Built for civic infrastructure, not lobbyists
          </Eyebrow>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '8px 0 36px',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            Wikipedia for
            <br />
            civic data.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              { who: 'Citizens', d: 'Looking up their own representatives. Nothing to log into.' },
              {
                who: 'Journalists',
                d: 'Checking a lead. One canonical source, every claim cited.',
              },
              {
                who: 'Civics teachers',
                d: 'Print-ready records for any U.S. address. Free forever.',
              },
              {
                who: 'Researchers + AI',
                d: 'A versioned, public REST + MCP API. No key, 60 req/min.',
              },
            ].map((a, i) => (
              <div key={i} style={{ borderTop: '2px solid #3ea2d4', paddingTop: 16 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {a.who}
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>{a.d}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 36,
              paddingTop: 24,
              borderTop: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <p
              style={{ margin: 0, fontSize: 14, color: '#9ca3af', maxWidth: 720, lineHeight: 1.5 }}
            >
              Most civic tech is either expensive enterprise software (Quorum, FiscalNote) built for
              lobbyists, or single-issue dashboards that go dark when the grant ends. CIV.IQ is
              built as <strong style={{ color: '#fff' }}>infrastructure</strong>.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" style={{ borderRadius: 0 }}>
                Read the manifesto →
              </Button>
              <Button
                variant="secondary"
                style={{
                  borderRadius: 0,
                  background: 'transparent',
                  color: '#fff',
                  borderColor: '#fff',
                }}
              >
                API docs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          API STRIP — for developers
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', padding: '56px 24px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr',
            gap: 48,
            alignItems: 'start',
          }}
        >
          <div>
            <Eyebrow style={{ color: '#3ea2d4' }}>For Developers</Eyebrow>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '8px 0 16px',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Free public API.
              <br />
              No key required.
            </h2>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, marginBottom: 20 }}>
              The same data that powers civdotiq.org is exposed as a versioned REST API and a Model
              Context Protocol server. Newsrooms, researchers, and AI assistants plug in directly.
              60 requests/minute, no signups, no marketing emails.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip variant="info" outlined size="sm">
                REST · OpenAPI 3.0
              </Chip>
              <Chip variant="info" outlined size="sm">
                MCP · 16 tools
              </Chip>
              <Chip variant="d" outlined size="sm">
                MIT licensed
              </Chip>
            </div>
          </div>

          <div
            style={{
              background: '#0b0f17',
              color: '#e5e7eb',
              border: '2px solid #000',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                background: '#111827',
                borderBottom: '1px solid #1f2937',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#9ca3af',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>curl · GET /api/v1/representatives/J000294</span>
              <span style={{ color: '#3ea2d4' }}>200 OK</span>
            </div>
            <pre style={{ margin: 0, padding: 18, overflow: 'auto' }}>{`{
  "data": {
    "bioguideId": "J000294",
    "name": "Hakeem Jeffries",
    "state": "NY",
    "district": 8,
    "party": "D",
    "chamber": "house",
    "served_since": "2013-01-03"
  },
  "dataQuality": "complete",
  "sourceStatus": [
    { "source": "Congress.gov v3", "ok": true, "ts": "2026-04-26T14:02Z" }
  ]
}`}</pre>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          FAQ — accordions
      ────────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '2px solid #000', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <Eyebrow>FAQ</Eyebrow>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '8px 0 32px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Common questions.
          </h2>
          {[
            {
              q: 'Is CIV.IQ nonpartisan?',
              a: "Yes. Republicans are red, Democrats are green, because that's what the logo encodes — a graphic convention, not an editorial position. CIV.IQ does not score, rate, or rank officials. It presents the public record.",
            },
            {
              q: 'Where does the data come from?',
              a: 'Authoritative government sources only: Congress.gov, FEC, Senate LDA, USASpending, Federal Register, Census, BLS, GovInfo, SEC EDGAR, OpenStates. No private aggregators, no inferred data.',
            },
            {
              q: 'How do you handle missing data?',
              a: "When we don't have something, we say so on the page — clearly, in plain English. A blank space is never a stand-in for missing information. If a government source is offline, we tell you that too.",
            },
            {
              q: 'Why no signups?',
              a: "CIV.IQ is civic infrastructure, not a product. There's nothing to convert you to. The data is yours by virtue of being a citizen — not in exchange for an email address.",
            },
            {
              q: 'How is this funded?',
              a: "Currently out of pocket (~$150/mo for AI + hosting). Open to grants from civic-tech and public-interest-AI funders. No ads, no subscriptions, no enterprise tier — that's a permanent commitment.",
            },
            {
              q: 'Can I use this commercially?',
              a: 'Yes. MIT licensed. Newsrooms, civic-tech tools, and research projects build on top of it. Attribution appreciated, not required.',
            },
          ].map((f, i) => (
            <details key={i} style={{ borderBottom: '1px solid #e5e7eb', padding: '18px 0' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#111827',
                  letterSpacing: '-0.01em',
                }}
              >
                <span>{f.q}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: '#3ea2d4' }}>
                  +
                </span>
              </summary>
              <p
                style={{
                  fontSize: 14,
                  color: '#4b5563',
                  lineHeight: 1.6,
                  margin: '12px 0 0',
                  maxWidth: 720,
                }}
              >
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          BOTTOM CTA
      ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 24px',
          background: '#3ea2d4',
          color: '#fff',
          borderBottom: '2px solid #000',
        }}
      >
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
              textTransform: 'uppercase',
              lineHeight: 0.95,
            }}
          >
            Look up your representatives.
          </h2>
          <p
            style={{
              fontSize: 17,
              maxWidth: 560,
              margin: '0 auto 32px',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.5,
            }}
          >
            One address. Every level of government. Plain language. No ads. No signups.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              onSubmit(addr);
            }}
            style={{ display: 'flex', gap: 0, maxWidth: 560, margin: '0 auto' }}
          >
            <Input
              value={addr}
              onChange={setAddr}
              placeholder="Enter your home address"
              style={{ borderRight: 'none', borderColor: '#fff', fontSize: 16 }}
            />
            <Button
              type="submit"
              style={{
                flexShrink: 0,
                padding: '14px 24px',
                borderRadius: 0,
                fontSize: 13,
                background: '#111827',
                borderColor: '#111827',
                color: '#fff',
              }}
            >
              Look up →
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { LandingScreen });
