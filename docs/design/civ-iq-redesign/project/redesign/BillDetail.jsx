// BILL DETAIL — directly linked from the new profile.
// Same vocabulary as ProfileHybrid: black masthead crumb, hero w/ chip row,
// 5-stat strip + secondary alignment row, sticky tab bar, source rail, plain-reading callout.
// The "vote" is the headline action — same way the profile foregrounds what the rep DID.

function BillDetail({ bill }) {
  const [tab, setTab] = React.useState('summary');

  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Federal', bill.chamber, `${bill.congress} Congress`, bill.number]}
      crumbRight={[
        <span key="f">
          File · {bill.number.replace(/[. ]/g, '')}-{bill.congress}
        </span>,
        <span key="c">Compiled Apr 26, 2026</span>,
        <span key="s">Sources · 4</span>,
      ]}
    >
      {/* Sources rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <a href="#" style={{ ...crumbBack }}>
          ← {bill.chamber} · {bill.congress} Congress
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="Congress.gov" id={bill.number} />
          <CqSourceTag compact source="House Clerk" id="roll-call-2024" />
          <CqSourceTag compact source="GovInfo" id="PLAW-cite" />
          <CqLabel color={COLORS.fg3}>+1 more</CqLabel>
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 240px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        {/* Bill mark — square plate with bill number, party-stem stripe, mono caption */}
        <div
          style={{
            width: 120,
            height: 120,
            position: 'relative',
            border: '2px solid #000',
            background: '#fff',
            backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: COLORS.blue,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '0 0 0 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            <div style={{ fontSize: 11, color: COLORS.fg3, letterSpacing: '0.08em' }}>BILL</div>
            <div
              style={{ fontSize: 22, color: COLORS.fg1, marginTop: 2, letterSpacing: '-0.01em' }}
            >
              {bill.number}
            </div>
            <div style={{ fontSize: 10, color: COLORS.fg3, marginTop: 6, letterSpacing: '0.04em' }}>
              {bill.congress}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant="info" size="sm">
              {bill.chamber} · {bill.type}
            </CqChip>
            <CqChip variant={bill.statusVariant} filled={bill.statusFilled} size="sm">
              {bill.status}
            </CqChip>
            {bill.publicLaw && (
              <CqChip variant="d" size="sm">
                Public law · {bill.publicLaw}
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              margin: '0 0 10px',
              textTransform: 'uppercase',
            }}
          >
            {bill.title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: COLORS.fg2,
              margin: 0,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Introduced {bill.introduced} · Sponsor {bill.sponsor} · {bill.cosponsors} co-sponsors
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Track this bill
          </CqButton>
          <CqButton variant="primary" size="sm">
            View full text →
          </CqButton>
          <span
            style={{
              fontSize: 10,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {bill.pages} pp · {bill.amendments} amendments
          </span>
        </div>
      </div>

      {/* HEADLINE STATS — what HAPPENED to the bill, then party-vote secondary row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {[
          {
            label: 'Final vote',
            value: bill.final.vote,
            caption: bill.final.outcome,
            color: bill.final.color,
          },
          {
            label: 'Yeas / Nays',
            value: bill.final.tally,
            caption: bill.final.body,
            color: COLORS.fg1,
          },
          {
            label: 'Co-sponsors',
            value: bill.cosponsors,
            caption: `${bill.bipartisanShare}% bipartisan`,
            color: COLORS.fg1,
          },
          {
            label: 'Days in Congress',
            value: bill.daysInCongress,
            caption: `Introduced ${bill.introduced}`,
            color: COLORS.fg1,
          },
          {
            label: 'Subjects',
            value: bill.subjects.length,
            caption: bill.subjects.slice(0, 2).join(', '),
            color: COLORS.fg1,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...s} size={32} />
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '2px solid #000',
          background: COLORS.bg2,
        }}
      >
        {[
          { l: 'D yeas', v: `${bill.final.dYea} of ${bill.final.dTotal}`, c: COLORS.green },
          { l: 'R yeas', v: `${bill.final.rYea} of ${bill.final.rTotal}`, c: COLORS.red },
          { l: 'I yeas', v: `${bill.final.iYea} of ${bill.final.iTotal}`, c: COLORS.fg1 },
        ].map((r, i) => (
          <div
            key={r.l}
            style={{
              padding: '10px 18px',
              borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CqLabel>{r.l}</CqLabel>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: r.c,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      {/* TAB BAR — sticky */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#fff',
          marginTop: 0,
          display: 'flex',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          ['summary', 'Plain summary'],
          ['timeline', 'Timeline'],
          ['vote', 'Roll-call vote'],
          ['text', 'Bill text'],
          ['related', 'Related bills'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              background: tab === k ? '#000' : 'transparent',
              color: tab === k ? '#fff' : COLORS.fg1,
              border: 0,
              padding: '14px 18px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 28 }}>
        {tab === 'summary' && <SummaryPanel bill={bill} />}
        {tab === 'timeline' && <TimelinePanel bill={bill} />}
        {tab === 'vote' && <VotePanel bill={bill} />}
        {tab === 'text' && <TextPanel bill={bill} />}
        {tab === 'related' && <RelatedPanel bill={bill} />}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.97}>
          {' '}
          Source: Congress.gov + House Clerk roll-call. Methodology at civ.iq/methodology.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

// ── Panels ─────────────────────────────────────────────

function SummaryPanel({ bill }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <CqLabel>Plain-language summary · 8th-grade reading level</CqLabel>
        <h3 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 14px' }}>What this bill does</h3>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: COLORS.fg1, margin: '0 0 14px' }}>
          {bill.plain.lead}
        </p>
        <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
          {bill.plain.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                padding: '10px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                display: 'grid',
                gridTemplateColumns: '32px 1fr',
                gap: 12,
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{b}</span>
            </li>
          ))}
        </ul>

        <CqPlainReading>{bill.plain.reading}</CqPlainReading>

        {/* Subjects */}
        <div style={{ marginTop: 24 }}>
          <CqLabel>Subjects</CqLabel>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bill.subjects.map(s => (
              <CqChip key={s} variant="ink" filled={false} size="sm">
                {s}
              </CqChip>
            ))}
          </div>
        </div>
      </div>

      <aside>
        <div style={{ border: '2px solid #000', padding: '18px' }}>
          <CqLabel>Sponsor</CqLabel>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '48px 1fr', gap: 10 }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: '2px solid #000',
                background: '#fff',
                backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 6px, ${COLORS.bg3} 6px 12px)`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: bill.sponsorParty === 'd' ? COLORS.green : COLORS.red,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {bill.sponsor
                  .split(' ')
                  .map(s => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{bill.sponsor}</div>
              <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {bill.sponsorParty === 'd' ? 'Democrat' : 'Republican'} · {bill.sponsorDistrict}
              </div>
              <a href="#" style={asideLink}>
                View profile →
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            borderLeft: `6px solid ${COLORS.blue}`,
            background: COLORS.bg2,
            padding: '14px 16px',
            marginTop: 14,
          }}
        >
          <CqLabel>Most-recent action</CqLabel>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
            {bill.lastAction.title}
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            {bill.lastAction.date} · {bill.lastAction.body}
          </div>
        </div>

        <div style={{ marginTop: 14, border: '2px solid #000', padding: '16px' }}>
          <CqLabel>Cost estimate</CqLabel>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginTop: 6,
              color: COLORS.blue,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {bill.cost}
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            CBO · 10-yr projection
          </div>
        </div>
      </aside>
    </div>
  );
}

function TimelinePanel({ bill }) {
  return (
    <div>
      <PanelHeader
        eyebrow={`${bill.actions.length} official actions · House + Senate`}
        title="Legislative timeline"
      />
      <div style={{ position: 'relative', borderTop: '2px solid #000', paddingTop: 8 }}>
        {bill.actions.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 28px 1fr 140px',
              gap: 0,
              padding: '14px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: COLORS.fg3,
                paddingTop: 2,
              }}
            >
              {a.date}
            </span>
            <div
              style={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  background:
                    a.kind === 'pass'
                      ? COLORS.green
                      : a.kind === 'fail'
                        ? COLORS.red
                        : a.kind === 'sign'
                          ? COLORS.blue
                          : COLORS.fg1,
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {i < bill.actions.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    bottom: -14,
                    left: '50%',
                    width: 2,
                    background: COLORS.fg1,
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: COLORS.fg2, marginTop: 2 }}>{a.detail}</div>
            </div>
            <span
              style={{
                fontSize: 10,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: 'right',
                paddingTop: 4,
              }}
            >
              {a.body}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VotePanel({ bill }) {
  // Simplified per-state aggregation; the real product breaks down per member.
  const blocks = bill.voteBlocks;
  return (
    <div>
      <PanelHeader
        eyebrow={`Roll call ${bill.final.rollCall} · ${bill.final.outcome} · ${bill.final.date}`}
        title={`${bill.final.body} · ${bill.final.tally}`}
        right={
          <CqButton variant="secondary" size="sm">
            Download CSV
          </CqButton>
        }
      />

      {/* Stacked party bar */}
      <div style={{ display: 'flex', height: 48, border: '2px solid #000', marginBottom: 16 }}>
        {[
          {
            l: 'D · Yea',
            n: bill.final.dYea,
            c: COLORS.green,
            total: bill.final.totalYea + bill.final.totalNay,
          },
          {
            l: 'R · Yea',
            n: bill.final.rYea,
            c: COLORS.red,
            total: bill.final.totalYea + bill.final.totalNay,
          },
          {
            l: 'I · Yea',
            n: bill.final.iYea,
            c: COLORS.fg1,
            total: bill.final.totalYea + bill.final.totalNay,
          },
          {
            l: 'D · Nay',
            n: bill.final.dNay,
            c: COLORS.bg3,
            stripe: COLORS.green,
            total: bill.final.totalYea + bill.final.totalNay,
          },
          {
            l: 'R · Nay',
            n: bill.final.rNay,
            c: COLORS.bg3,
            stripe: COLORS.red,
            total: bill.final.totalYea + bill.final.totalNay,
          },
        ].map(seg => {
          const pct = (seg.n / seg.total) * 100;
          return (
            <div
              key={seg.l}
              style={{
                width: `${pct}%`,
                background: seg.c,
                borderRight: '2px solid #000',
                backgroundImage: seg.stripe
                  ? `repeating-linear-gradient(45deg, ${seg.c} 0 6px, ${seg.stripe} 6px 8px)`
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              {pct >= 6 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: seg.stripe ? COLORS.fg1 : '#fff',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {seg.n}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 24 }}>
        <div>
          <CqLabel>How blocs voted</CqLabel>
          <div style={{ marginTop: 12 }}>
            {blocks.map((b, i) => (
              <div
                key={b.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr 60px 60px',
                  gap: 14,
                  alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                    {b.size} members
                  </div>
                </div>
                <div style={{ height: 10, background: COLORS.bg3, position: 'relative' }}>
                  <div style={{ height: '100%', background: b.color, width: `${b.yeaPct}%` }} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: COLORS.fg3,
                    textAlign: 'right',
                  }}
                >
                  {b.yeaPct}%
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                  }}
                >
                  {b.yea}–{b.nay}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <CqLabel>Sample of votes</CqLabel>
          <div style={{ marginTop: 12 }}>
            {bill.sampleVotes.map((s, i) => (
              <div
                key={s.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 60px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                    {s.party === 'd' ? 'D' : 'R'} · {s.district}
                  </div>
                </div>
                <CqChip
                  variant={s.vote === 'Yea' ? 'd' : s.vote === 'Nay' ? 'r' : 'ink'}
                  filled={false}
                  size="sm"
                >
                  {s.vote}
                </CqChip>
                <a href="#" style={{ ...asideLink, textAlign: 'right' }}>
                  View →
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <CqPlainReading>{bill.plain.voteReading}</CqPlainReading>
      </div>
    </div>
  );
}

function TextPanel({ bill }) {
  return (
    <div>
      <PanelHeader
        eyebrow={`${bill.pages} pages · ${bill.amendments} amendments · GovInfo`}
        title="Bill text"
        right={
          <CqButton variant="secondary" size="sm">
            Open PDF →
          </CqButton>
        }
      />
      <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: '220px 1fr' }}>
        <div
          style={{ background: COLORS.bg2, borderRight: '2px solid #000', padding: '20px 18px' }}
        >
          <CqLabel>Sections</CqLabel>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
            {bill.sections.map((s, i) => (
              <a
                key={s}
                href="#"
                style={{
                  fontSize: 12,
                  color: i === 0 ? COLORS.fg1 : COLORS.fg2,
                  fontFamily: 'var(--font-mono)',
                  padding: '8px 0',
                  borderBottom: i === bill.sections.length - 1 ? 0 : `1px solid ${COLORS.line}`,
                  fontWeight: i === 0 ? 700 : 500,
                  textDecoration: 'none',
                }}
              >
                <span style={{ color: COLORS.fg3, marginRight: 8 }}>§{i + 1}</span>
                {s}
              </a>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: '24px 28px',
            fontSize: 13,
            color: COLORS.fg2,
            lineHeight: 1.7,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            § 1 — Short title
          </div>
          <p style={{ margin: '0 0 16px' }}>This Act may be cited as the "{bill.title}".</p>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '16px 0 14px',
            }}
          >
            § 2 — Findings
          </div>
          <p style={{ margin: '0 0 16px' }}>
            Congress finds that — (1) [excerpt redacted in this preview]; (2) {bill.findingsExcerpt}
            .
          </p>
          <a
            href="#"
            style={{ color: COLORS.blueHv, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Read full bill text on GovInfo →
          </a>
        </div>
      </div>
    </div>
  );
}

function RelatedPanel({ bill }) {
  return (
    <div>
      <PanelHeader
        eyebrow="Cross-referenced via Congress.gov subjects + companion identifiers"
        title="Related bills"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr 110px 100px 110px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid #000',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {['Bill', 'Title', 'Status', 'Relation', 'Introduced'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {bill.related.map((r, i) => (
        <div
          key={r.n}
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 110px 100px 110px',
            gap: 12,
            padding: '14px 0',
            borderBottom: `1px solid ${COLORS.line}`,
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.n}</span>
          <span style={{ fontSize: 13 }}>{r.t}</span>
          <CqChip variant="info" filled={false} size="sm">
            {r.st}
          </CqChip>
          <span style={{ fontSize: 11, color: COLORS.fg2 }}>{r.rel}</span>
          <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
            {r.d}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────

function PanelHeader({ eyebrow, title, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 14,
      }}
    >
      <div>
        <CqLabel>{eyebrow}</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

const crumbBack = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: COLORS.fg3,
  textDecoration: 'none',
  fontFamily: 'var(--font-primary)',
};

const asideLink = {
  fontSize: 11,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
  display: 'inline-block',
  marginTop: 4,
};

// ── Mock data ──────────────────────────────────────────

const BILL_HR3684 = {
  number: 'H.R. 3684',
  type: 'Public bill',
  chamber: 'House',
  congress: '117th',
  title: 'Infrastructure Investment and Jobs Act',
  introduced: 'Jun 4, 2021',
  sponsor: 'Peter A. DeFazio',
  sponsorParty: 'd',
  sponsorDistrict: 'OR-04',
  cosponsors: 4,
  bipartisanShare: 75,
  daysInCongress: 154,
  publicLaw: '117-58',
  pages: 2702,
  amendments: 47,
  statusVariant: 'd',
  statusFilled: true,
  status: 'Became law',
  cost: '$1.20T',
  subjects: [
    'Transportation',
    'Public lands',
    'Energy',
    'Water resources',
    'Broadband',
    'Workforce',
    'Tax law',
  ],
  sections: [
    'Short title',
    'Findings',
    'Federal-aid highways',
    'Public transportation',
    'Passenger rail',
    'Highway safety',
    'Motor carriers',
    'Hazmat',
    'Broadband deployment',
    'Drinking water',
  ],
  findingsExcerpt:
    'investments in surface transportation, water, broadband, and energy infrastructure are necessary to support a 21st-century economy',
  final: {
    rollCall: '369',
    date: 'Nov 5, 2021',
    outcome: 'Passed · sent to President',
    body: 'House · final passage',
    vote: '228–206',
    tally: '228 / 206',
    color: COLORS.green,
    dYea: 215,
    dNay: 6,
    dTotal: 221,
    rYea: 13,
    rNay: 200,
    rTotal: 213,
    iYea: 0,
    iNay: 0,
    iTotal: 0,
    totalYea: 228,
    totalNay: 206,
  },
  lastAction: {
    title: 'Became Public Law No. 117-58',
    date: 'Nov 15, 2021',
    body: 'Signed by President Biden',
  },
  plain: {
    lead: 'A federal infrastructure law that funds roads, bridges, public transit, passenger rail, broadband internet, water systems, and the electric grid over 5 years.',
    bullets: [
      '$110B for roads, bridges, and major projects — the largest single investment in 70 years.',
      '$66B for passenger and freight rail — the largest since Amtrak was created.',
      '$65B to expand broadband internet access in rural and low-income areas.',
      '$55B to upgrade drinking-water systems and replace lead service lines.',
      '$73B to modernize the electric grid and add new transmission lines.',
      'Paid for by repurposing unused pandemic relief funds and other offsets — no new general tax increase.',
    ],
    reading:
      'This bill became law on Nov 15, 2021. It is a 5-year, $1.2 trillion package covering physical infrastructure — roads, rail, broadband, water, and the power grid. It does NOT include health, education, or family policy, which were debated separately.',
    voteReading:
      'The House passed the bill 228–206. 13 Republicans voted yes; 6 Democrats voted no. The bill had already passed the Senate on a 69–30 bipartisan vote in August 2021.',
  },
  voteBlocks: [
    { name: 'House Democrats', size: 221, color: COLORS.green, yea: 215, nay: 6, yeaPct: 97 },
    { name: 'House Republicans', size: 213, color: COLORS.red, yea: 13, nay: 200, yeaPct: 6 },
    { name: 'Problem Solvers Caucus', size: 58, color: COLORS.blue, yea: 56, nay: 2, yeaPct: 97 },
    {
      name: 'Congressional Black Caucus',
      size: 58,
      color: COLORS.vlau,
      yea: 56,
      nay: 2,
      yeaPct: 97,
    },
    { name: 'Freedom Caucus', size: 35, color: COLORS.greige, yea: 0, nay: 35, yeaPct: 0 },
  ],
  sampleVotes: [
    { name: 'Hakeem S. Jeffries', party: 'd', district: 'NY-08', vote: 'Yea' },
    { name: 'Mike Johnson', party: 'r', district: 'LA-04', vote: 'Nay' },
    { name: 'Don Bacon', party: 'r', district: 'NE-02', vote: 'Yea' },
    { name: 'Jared Golden', party: 'd', district: 'ME-02', vote: 'Nay' },
    { name: 'Lisa Murkowski', party: 'r', district: 'AK', vote: 'Yea' },
  ],
  actions: [
    {
      date: 'Jun 4, 2021',
      kind: 'intro',
      title: 'Introduced in House',
      detail: 'Sponsor: DeFazio (D-OR-04). Referred to Transportation & Infrastructure.',
      body: 'House',
    },
    {
      date: 'Jun 9, 2021',
      kind: 'cmte',
      title: 'Committee markup',
      detail: 'Reported with amendments, 38–26.',
      body: 'T&I Committee',
    },
    {
      date: 'Jul 1, 2021',
      kind: 'pass',
      title: 'Passed House',
      detail: 'Initial House passage 221–201, mostly party-line.',
      body: 'House floor',
    },
    {
      date: 'Aug 10, 2021',
      kind: 'pass',
      title: 'Passed Senate with substitute',
      detail: 'Bipartisan 69–30, including 19 Republican yeas.',
      body: 'Senate floor',
    },
    {
      date: 'Nov 5, 2021',
      kind: 'pass',
      title: 'House agreed to Senate amendments',
      detail: 'Final passage 228–206. 13 Republicans voted yes, 6 Democrats no.',
      body: 'House floor',
    },
    {
      date: 'Nov 15, 2021',
      kind: 'sign',
      title: 'Signed by the President · Public Law 117-58',
      detail: 'Took effect immediately.',
      body: 'Executive',
    },
  ],
  related: [
    {
      n: 'S. 2377',
      t: 'Surface Transportation Investment Act of 2021',
      st: 'Incorporated',
      rel: 'Companion',
      d: 'Jul 21, 2021',
    },
    {
      n: 'H.R. 5376',
      t: 'Inflation Reduction Act of 2022',
      st: 'Became law',
      rel: 'Successor',
      d: 'Sep 27, 2021',
    },
    {
      n: 'H.R. 3076',
      t: 'Postal Service Reform Act',
      st: 'Became law',
      rel: 'Same Congress',
      d: 'May 11, 2021',
    },
    {
      n: 'H.R. 4521',
      t: 'America COMPETES Act',
      st: 'Became law',
      rel: 'Same subject',
      d: 'Jul 19, 2021',
    },
  ],
};

Object.assign(window, { BillDetail, BILL_HR3684 });
