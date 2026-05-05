// ELECTION — head-to-head matchup page. Real candidates from a real race.
// 2024 Senate, Ohio: Sherrod Brown (D inc.) vs Bernie Moreno (R challenger).
// Layout: hero with both candidates, finance + voting alignment + endorsements, side-by-side.

function ElectionPage() {
  const incumbent = {
    name: 'Sherrod Brown',
    short: 'Brown',
    p: 'd',
    long: 'Democrat',
    role: 'Incumbent',
    since: 2007,
    age: 71,
    raised: '$73.2M',
    cash: '$13.4M',
    burn: '$59.8M',
    smallPct: 38,
    pacPct: 22,
    indPct: 60,
    topInd: 'Lawyers & Lobbyists',
    topDonor: 'WinSenate (super PAC)',
    polls: [
      { d: 'Mar 26', v: 47 },
      { d: 'Apr 09', v: 46 },
      { d: 'Apr 23', v: 45 },
      { d: 'May 02', v: 46 },
    ],
    endorse: ['UAW', 'Sierra Club', 'Planned Parenthood', 'AFL-CIO Ohio', 'Cleveland Plain Dealer'],
  };
  const challenger = {
    name: 'Bernie Moreno',
    short: 'Moreno',
    p: 'r',
    long: 'Republican',
    role: 'Challenger',
    since: '—',
    age: 57,
    raised: '$24.9M',
    cash: '$8.1M',
    burn: '$16.8M',
    smallPct: 12,
    pacPct: 31,
    indPct: 51,
    topInd: 'Real Estate',
    topDonor: 'Sentinel Action Fund',
    polls: [
      { d: 'Mar 26', v: 44 },
      { d: 'Apr 09', v: 45 },
      { d: 'Apr 23', v: 47 },
      { d: 'May 02', v: 48 },
    ],
    endorse: ['Ohio Right to Life', 'NRA-PVF', 'Donald J. Trump', 'Fraternal Order of Police OH'],
  };

  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Elections', 'U.S. Senate', 'Ohio · 2024 general', 'Brown · Moreno']}
      crumbRight={[
        <span key="d">Election day · Nov 5, 2024</span>,
        <span key="r">Sources · FEC + Ballotpedia</span>,
      ]}
    >
      {/* TICKER STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          border: '2px solid #000',
          marginBottom: 28,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {[
          ['Days to election', '186', 'as of May 02, 2026'],
          ['Total spent', '$98.1M', 'both campaigns + outside groups'],
          ['Polling avg', 'Moreno +2', '538 average · 4 polls'],
          ['Cook rating', 'Toss-up', 'unchanged 6 weeks'],
        ].map(([l, v, c], i) => (
          <div
            key={l}
            style={{ padding: '14px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqLabel>{l}</CqLabel>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 10, color: COLORS.fg3, marginTop: 2 }}>{c}</div>
          </div>
        ))}
      </div>

      {/* HEAD-TO-HEAD HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr',
          gap: 0,
          border: '2px solid #000',
          marginBottom: 32,
        }}
      >
        <CandidateHero c={incumbent} />
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            padding: '40px 0',
            borderLeft: `1px solid ${COLORS.line}`,
            borderRight: `1px solid ${COLORS.line}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9ca3af',
              letterSpacing: '0.12em',
            }}
          >
            VS
          </span>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
            ×
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#6b7280',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Two-way race
          </span>
        </div>
        <CandidateHero c={challenger} flip />
      </div>

      {/* SIDE BY SIDE — finance, polls, endorsements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 32 }}>
        <ComparePane
          title="Money raised · 2023–24 cycle"
          left={incumbent}
          right={challenger}
          side="left"
        />
        <ComparePane
          title="Money raised · 2023–24 cycle"
          left={incumbent}
          right={challenger}
          side="right"
        />
      </div>

      {/* POLLS */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <div>
            <CqLabel>Polling · last 4 weeks · 7 surveys</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Public polling average
            </div>
          </div>
          <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
            Source · 538 polling database
          </span>
        </div>
        <div
          style={{ border: '2px solid #000', padding: '24px', position: 'relative', height: 220 }}
        >
          <PollChart i={incumbent} c={challenger} />
        </div>
      </div>

      {/* ENDORSEMENTS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '2px solid #000',
          marginBottom: 32,
        }}
      >
        <EndorsePane c={incumbent} />
        <EndorsePane c={challenger} flip />
      </div>

      <div style={{ paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.93} method="FEC bulk Q1 2024 · 538 polling DB · Ballotpedia">
          {' '}
          Polling averages and endorsement counts are aggregated from public sources. CIV.IQ does
          not predict outcomes or recommend candidates.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function CandidateHero({ c, flip = false }) {
  const align = flip ? 'flex-end' : 'flex-start';
  const ta = flip ? 'right' : 'left';
  return (
    <div
      style={{
        padding: '32px 32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: align,
        textAlign: ta,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: flip ? 'row-reverse' : 'row',
          gap: 20,
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <CqPortrait name={c.name} size={120} party={c.p} />
        <div style={{ flex: 1, textAlign: ta }}>
          <div
            style={{
              display: 'flex',
              flexDirection: flip ? 'row-reverse' : 'row',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <CqChip variant={c.p} size="sm">
              {c.long}
            </CqChip>
            <CqChip variant={c.role === 'Incumbent' ? 'ink' : 'info'} filled={false} size="sm">
              {c.role}
            </CqChip>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              lineHeight: 1.0,
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 8,
            }}
          >
            {c.role === 'Incumbent' ? `In office since ${c.since}` : `First federal run`} · Age{' '}
            {c.age}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparePane({ title, left, right, side }) {
  const c = side === 'left' ? left : right;
  const other = side === 'left' ? right : left;
  return (
    <div
      style={{
        borderTop: '2px solid #000',
        borderBottom: '2px solid #000',
        borderLeft: side === 'left' ? '2px solid #000' : 0,
        borderRight: '2px solid #000',
        padding: '24px 28px',
        background: side === 'left' ? '#fff' : COLORS.bg2,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          alignItems: 'baseline',
        }}
      >
        <CqLabel>{c.short}</CqLabel>
        <CqChip variant={c.p} size="sm">
          {c.long}
        </CqChip>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: partyColor(c.p),
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {c.raised}
      </div>
      <div
        style={{
          fontSize: 11,
          color: COLORS.fg3,
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
          marginBottom: 18,
        }}
      >
        Cash on hand · {c.cash} &nbsp;·&nbsp; Burn rate · {c.burn}
      </div>

      {[
        { l: 'Individual donors', pct: c.indPct, sub: c.indPct + '% of total' },
        { l: 'PAC contributions', pct: c.pacPct, sub: c.pacPct + '% of total' },
        { l: 'Small donors (<$200)', pct: c.smallPct, sub: c.smallPct + '% of total' },
      ].map(b => (
        <div key={b.l} style={{ marginBottom: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 600 }}>{b.l}</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{b.sub}</span>
          </div>
          <div style={{ height: 8, background: COLORS.bg3 }}>
            <div style={{ width: b.pct + '%', height: '100%', background: partyColor(c.p) }} />
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${COLORS.line}`,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: COLORS.fg2,
        }}
      >
        Top industry · <strong style={{ color: COLORS.fg1 }}>{c.topInd}</strong>
        <br />
        Top outside group · <strong style={{ color: COLORS.fg1 }}>{c.topDonor}</strong>
      </div>
    </div>
  );
}

function PollChart({ i, c }) {
  const w = 1212,
    h = 172;
  const xs = i.polls.length;
  const sx = idx => 60 + (idx / (xs - 1)) * (w - 120);
  const sy = v => 30 + (1 - (v - 40) / 12) * (h - 60);
  const path = pts => pts.map((p, idx) => `${idx ? 'L' : 'M'} ${sx(idx)} ${sy(p.v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* gridlines */}
      {[40, 44, 48, 52].map(v => (
        <g key={v}>
          <line x1={60} x2={w - 60} y1={sy(v)} y2={sy(v)} stroke={COLORS.line} strokeWidth={1} />
          <text x={20} y={sy(v) + 4} fill={COLORS.fg3} fontSize={10} fontFamily="var(--font-mono)">
            {v}%
          </text>
        </g>
      ))}
      {/* x labels */}
      {i.polls.map((p, idx) => (
        <text
          key={idx}
          x={sx(idx)}
          y={h - 6}
          fill={COLORS.fg3}
          fontSize={10}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          {p.d}
        </text>
      ))}
      <path d={path(i.polls)} fill="none" stroke={COLORS.green} strokeWidth={3} />
      <path d={path(c.polls)} fill="none" stroke={COLORS.red} strokeWidth={3} />
      {i.polls.map((p, idx) => (
        <circle key={'i' + idx} cx={sx(idx)} cy={sy(p.v)} r={4} fill={COLORS.green} />
      ))}
      {c.polls.map((p, idx) => (
        <circle key={'c' + idx} cx={sx(idx)} cy={sy(p.v)} r={4} fill={COLORS.red} />
      ))}
      <g transform="translate(70, 24)">
        <rect x={0} y={0} width={10} height={10} fill={COLORS.green} />
        <text x={16} y={9} fill={COLORS.fg1} fontSize={11} fontWeight={700}>
          BROWN
        </text>
        <rect x={90} y={0} width={10} height={10} fill={COLORS.red} />
        <text x={106} y={9} fill={COLORS.fg1} fontSize={11} fontWeight={700}>
          MORENO
        </text>
      </g>
    </svg>
  );
}

function EndorsePane({ c, flip = false }) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderRight: flip ? 0 : `1px solid ${COLORS.line}`,
        background: flip ? COLORS.bg2 : '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 12,
          alignItems: 'baseline',
        }}
      >
        <CqLabel>{c.short} · endorsements</CqLabel>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: partyColor(c.p),
          }}
        >
          {c.endorse.length}
        </span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {c.endorse.map((e, i) => (
          <li
            key={e}
            style={{
              padding: '10px 0',
              borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              fontSize: 13,
              display: 'grid',
              gridTemplateColumns: '20px 1fr',
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: partyColor(c.p),
                fontWeight: 700,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{e}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { ElectionPage });
