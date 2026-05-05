// FEC FILING DETAIL — single quarterly filing for a campaign committee.
// The "what's actually in the document" view: receipts, disbursements, end cash.

const FEC_FILING = {
  filer: 'Friends of Andy Kim',
  fec_id: 'C00567823',
  candidate: 'Andy Kim',
  candidate_office: 'U.S. Senate · NJ · Class II',
  party: 'd',
  form: 'F3',
  period: 'Q1 2026',
  period_dates: 'Jan 1 – Mar 31, 2026',
  filed: 'Apr 15, 2026',
  amended: false,
  treasurer: 'Eduardo Cruz',
  receipts: 4_287_142,
  disbursements: 2_018_330,
  cash_begin: 5_412_098,
  cash_end: 7_680_910,
  debts: 0,
  contributions_individual: 3_842_018,
  contributions_pac: 380_000,
  small_pct: 41,
  large_pct: 59,
};

function FECFilingDetail({ f = FEC_FILING }) {
  const partyClr = partyColor(f.party);
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Money', 'Committees', f.fec_id, f.period + ' filing']}
      crumbRight={[
        <span key="f">
          File · FEC-{f.fec_id}-{f.period.replace(' ', '')}
        </span>,
        <span key="c">Filed {f.filed}</span>,
      ]}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <a
          href="#"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLORS.fg3,
            textDecoration: 'none',
          }}
        >
          ← All filings · {f.fec_id}
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="FEC" id={`/${f.fec_id}/F3`} />
          <CqSourceTag compact source="docquery.fec.gov" id={f.period.replace(' ', '-')} />
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <div>
          <CqLabel>
            FEC Form {f.form} · Quarterly report · {f.period_dates}
          </CqLabel>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            {f.filer}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            Principal campaign committee · {f.candidate} · {f.candidate_office} · Treasurer ·{' '}
            {f.treasurer}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant={f.party} size="sm">
              Democrat
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {f.fec_id}
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              Form {f.form}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {f.period}
            </CqChip>
            {f.amended && (
              <CqChip variant="warn" filled size="sm">
                Amended
              </CqChip>
            )}
          </div>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Filing record</CqLabel>
          <ul
            style={{
              listStyle: 'none',
              margin: '10px 0 0',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            {[
              ['Form', 'F3 · Quarterly'],
              ['Coverage', f.period_dates],
              ['Filed', f.filed],
              ['Amended', f.amended ? 'Yes' : 'No'],
              ['FEC image', '202604159387'],
              ['Schedules', 'A · B · C · D'],
            ].map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                }}
              >
                <span style={{ color: COLORS.fg3 }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* SUMMARY OF FUNDS */}
      <div style={{ marginTop: 32, marginBottom: 14 }}>
        <CqLabel>Summary · Page 2 of Form F3</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>This period · column A</div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          { l: 'Total receipts', v: dollar(f.receipts), cap: 'Line 16', col: COLORS.green },
          { l: 'Total disbursements', v: dollar(f.disbursements), cap: 'Line 23', col: COLORS.red },
          { l: 'Cash on hand · begin', v: dollar(f.cash_begin), cap: 'Line 6(a)', col: COLORS.fg1 },
          {
            l: 'Cash on hand · end',
            v: dollar(f.cash_end),
            cap: 'Line 27 · COH',
            col: COLORS.blue,
          },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{ padding: '24px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat label={s.l} value={s.v} caption={s.cap} color={s.col} size={28} />
          </div>
        ))}
      </div>

      {/* MONEY-FLOW DIAGRAM */}
      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: COLORS.bg2,
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <CqLabel>Cash flow · this period</CqLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto 1fr',
            alignItems: 'center',
            gap: 20,
            marginTop: 16,
          }}
        >
          <FlowBox label="Begin balance" value={dollar(f.cash_begin)} accent={COLORS.fg1} />
          <Arrow text={`+ ${dollar(f.receipts)}`} color={COLORS.green} />
          <FlowBox label="Subtotal" value={dollar(f.cash_begin + f.receipts)} accent={COLORS.fg2} />
          <Arrow text={`− ${dollar(f.disbursements)}`} color={COLORS.red} />
          <FlowBox label="End balance" value={dollar(f.cash_end)} accent={COLORS.blue} bold />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 32 }}>
        <div>
          {/* SCHEDULE A — RECEIPTS */}
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Schedule A · Itemized receipts</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Where the money came from
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Source', 'This period', 'Cycle to date'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { l: 'Itemized individual ($200+)', p: 2_268_790, c: 8_402_310, k: 'ind-large' },
            { l: 'Unitemized individual (<$200)', p: 1_573_228, c: 5_881_445, k: 'ind-small' },
            { l: 'Other federal candidate cmtes', p: 0, c: 0, k: 'cand' },
            { l: 'PAC contributions', p: 380_000, c: 1_245_000, k: 'pac' },
            { l: 'Party committees', p: 25_000, c: 75_000, k: 'party' },
            { l: 'Transfers', p: 0, c: 0, k: 'xfer' },
            { l: 'Loans received', p: 0, c: 0, k: 'loan' },
            { l: 'Refunds + offsets', p: 40_124, c: 88_201, k: 'misc' },
          ].map((r, i) => (
            <div
              key={r.k}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 110px 110px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ fontSize: 12, color: COLORS.fg1 }}>{r.l}</span>
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
                {dollar(r.p)}
              </span>
              <span style={{ fontSize: 11, color: COLORS.fg3, textAlign: 'right' }}>
                {dollar(r.c)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 110px',
              gap: 12,
              padding: '14px 0',
              borderTop: '2px solid #000',
              fontFamily: 'var(--font-mono)',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Total receipts
            </span>
            <span
              style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', color: COLORS.green }}
            >
              {dollar(f.receipts)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
              {dollar(15_692_956)}
            </span>
          </div>

          {/* SCHEDULE B — DISBURSEMENTS */}
          <div style={{ marginTop: 32, marginBottom: 14 }}>
            <CqLabel>Schedule B · Itemized disbursements</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Where the money went</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Category', 'This period', '% of total'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { l: 'Media buys · TV + digital', p: 902_410, c: COLORS.blue },
            { l: 'Payroll + consulting', p: 480_220, c: COLORS.vlau },
            { l: 'Fundraising · direct mail', p: 320_115, c: COLORS.amber },
            { l: 'Travel + events', p: 142_018, c: COLORS.green },
            { l: 'Polling + research', p: 88_440, c: COLORS.greige },
            { l: 'Office + admin', p: 64_842, c: COLORS.fg3 },
            { l: 'Other', p: 20_285, c: COLORS.fg4 },
          ].map((r, i) => {
            const pct = (r.p / f.disbursements) * 100;
            return (
              <div
                key={r.l}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 110px',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: 12, color: COLORS.fg1, fontFamily: 'var(--font-mono)' }}>
                    {r.l}
                  </span>
                  <div style={{ height: 4, background: COLORS.bg3, marginTop: 6 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: r.c }} />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {dollar(r.p)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: COLORS.fg3,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}

          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              {f.filer} reported ${(f.receipts / 1e6).toFixed(2)}M raised in {f.period}, with 41%
              from small donors. Spending was concentrated on media (45%) — typical for a senate
              candidate one cycle out from re-election.
            </CqPlainReading>
          </div>
        </div>

        <aside>
          {/* PIE OF FUNDING SOURCES */}
          <div style={{ border: '2px solid #000', padding: 18, marginBottom: 14 }}>
            <CqLabel>Funding mix · this filing</CqLabel>
            <div style={{ marginTop: 12, position: 'relative', height: 180 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                {(() => {
                  const slices = [
                    { p: 53, c: COLORS.blue, l: 'Indiv ≥ $200' },
                    { p: 37, c: COLORS.blueHv, l: 'Indiv < $200' },
                    { p: 9, c: COLORS.vlau, l: 'PAC' },
                    { p: 1, c: COLORS.greige, l: 'Other' },
                  ];
                  let acc = 0;
                  return slices.map(s => {
                    const r = 40,
                      cx = 50,
                      cy = 50;
                    const a0 = (acc / 100) * Math.PI * 2 - Math.PI / 2;
                    const a1 = ((acc + s.p) / 100) * Math.PI * 2 - Math.PI / 2;
                    acc += s.p;
                    const large = s.p > 50 ? 1 : 0;
                    const x0 = cx + r * Math.cos(a0),
                      y0 = cy + r * Math.sin(a0);
                    const x1 = cx + r * Math.cos(a1),
                      y1 = cy + r * Math.sin(a1);
                    return (
                      <path
                        key={s.l}
                        d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`}
                        fill={s.c}
                        stroke="#fff"
                        strokeWidth="0.5"
                      />
                    );
                  });
                })()}
              </svg>
            </div>
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
              {[
                { l: 'Indiv ≥ $200', p: 53, c: COLORS.blue },
                { l: 'Indiv < $200', p: 37, c: COLORS.blueHv },
                { l: 'PAC', p: 9, c: COLORS.vlau },
                { l: 'Other', p: 1, c: COLORS.greige },
              ].map(s => (
                <li
                  key={s.l}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    fontSize: 11,
                  }}
                >
                  <span style={{ width: 10, height: 10, background: s.c, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{s.l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.p}%</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AMENDMENT WARNING */}
          <div
            style={{
              borderLeft: `6px solid ${COLORS.amber}`,
              background: COLORS.bg2,
              padding: '14px 16px',
            }}
          >
            <CqLabel color={COLORS.amber}>Filing notes</CqLabel>
            <p style={{ fontSize: 12, color: COLORS.fg2, margin: '8px 0 0', lineHeight: 1.5 }}>
              FEC review window for this filing: 60 days. Amendments are common in senate-tier
              campaigns. We refresh nightly from docquery.fec.gov; any change will be flagged.
            </p>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99}>
          {' '}
          Federal Election Commission · Form F3 quarterly report. All numbers are filer-reported,
          not adjudicated.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function FlowBox({ label, value, accent, bold }) {
  return (
    <div
      style={{
        border: `2px solid ${accent}`,
        padding: '14px 16px',
        background: '#fff',
        textAlign: 'center',
      }}
    >
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: bold ? 22 : 18,
          fontWeight: 700,
          marginTop: 6,
          fontFamily: 'var(--font-mono)',
          color: accent,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
function Arrow({ text, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {text}
      </span>
      <span style={{ fontSize: 18, color }}>→</span>
    </div>
  );
}
function dollar(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  if (n === 0) return '$0';
  return '$' + n.toLocaleString();
}

// ════════════════════════════════════════════════════
// INDUSTRY / SECTOR PAGE — "energy" or "real estate" as a first-class entity.
// Cross-cutting: which lawmakers take the most, which firms spend the most,
// which bills the sector is moving.
// ════════════════════════════════════════════════════

function IndustrySectorPage() {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Money', 'Industries', 'Real Estate', '2025–26 cycle']}
      crumbRight={[
        <span key="f">File · IND-REAL-ESTATE-2526</span>,
        <span key="c">Compiled Apr 26, 2026</span>,
      ]}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <a
          href="#"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLORS.fg3,
            textDecoration: 'none',
          }}
        >
          ← All industries
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="FEC" id="industry-roll-up" />
          <CqSourceTag compact source="OpenSecrets" id="F10" />
          <CqSourceTag compact source="LDA" id="real-estate" />
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 280px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            position: 'relative',
            border: '2px solid #000',
            backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: COLORS.amber,
            }}
          />
          <div
            style={{
              fontSize: 64,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
            }}
          >
            RE
          </div>
        </div>
        <div>
          <CqLabel>Industry · CRP code F10 · 2025–26 cycle</CqLabel>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            Real estate
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            Developers · landlords · REITs · brokerages · 2,481 contributors · 38 PACs · 12 lobbying
            registrants
          </p>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>This cycle · summary</CqLabel>
          <ul
            style={{
              listStyle: 'none',
              margin: '10px 0 0',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            {[
              ['Total contributions', '$48.2M'],
              ['To Democrats', '$22.1M'],
              ['To Republicans', '$25.4M'],
              ['Lobbying spend', '$94.7M'],
              ['Bills tracked', '47'],
            ].map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                }}
              >
                <span style={{ color: COLORS.fg3 }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* HEADLINE STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          { l: 'Cycle contributions', v: '$48.2M', cap: '+12% vs 2023–24', col: COLORS.blue },
          { l: 'Lobbying spend', v: '$94.7M', cap: '2025 · 4 quarters', col: COLORS.blueHv },
          { l: 'Active lobbyists', v: 318, cap: '47% formerly in govt', col: COLORS.fg1 },
          { l: 'Bills tracked', v: 47, cap: '12 advanced past committee', col: COLORS.fg1 },
          { l: 'Industry rank', v: '#7', cap: 'of 80 sectors · all giving', col: COLORS.fg1 },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat label={s.l} value={s.v} caption={s.cap} color={s.col} size={32} />
          </div>
        ))}
      </div>

      {/* PARTY SPLIT BAR */}
      <div style={{ marginTop: 24 }}>
        <CqLabel>Party split · cycle contributions</CqLabel>
        <div style={{ display: 'flex', height: 36, border: '2px solid #000', marginTop: 8 }}>
          <div
            style={{
              width: '46%',
              background: COLORS.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '2px solid #000',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              46% · $22.1M to D
            </span>
          </div>
          <div
            style={{
              width: '53%',
              background: COLORS.red,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '2px solid #000',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              53% · $25.4M to R
            </span>
          </div>
          <div style={{ width: '1%', background: COLORS.fg3 }} />
        </div>
        <div
          style={{ marginTop: 6, fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}
        >
          Other · $0.7M · 1%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
        {/* TOP RECIPIENTS */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Top recipients · cycle contributions</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Lawmakers receiving the most
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 90px 90px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['#', 'Member', 'Total', 'Party'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { n: 'Steven Scalise', d: 'R-LA-01', amt: 412_018, party: 'r' },
            { n: 'Hakeem S. Jeffries', d: 'D-NY-08', amt: 388_441, party: 'd' },
            { n: 'Chuck Schumer', d: 'D-NY · S', amt: 372_410, party: 'd' },
            { n: 'Tim Scott', d: 'R-SC · S', amt: 340_220, party: 'r' },
            { n: 'Patrick McHenry', d: 'R-NC-10', amt: 318_802, party: 'r' },
            { n: 'Maxine Waters', d: 'D-CA-43', amt: 294_115, party: 'd' },
            { n: 'Andy Kim', d: 'D-NJ · S', amt: 268_022, party: 'd' },
            { n: 'French Hill', d: 'R-AR-02', amt: 251_344, party: 'r' },
          ].map((r, i) => (
            <a
              key={r.n}
              href="#"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 90px 90px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
                textDecoration: 'none',
                color: COLORS.fg1,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {r.d}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.blue,
                }}
              >
                {dollar(r.amt)}
              </span>
              <CqChip variant={r.party} size="sm">
                {r.party === 'd' ? 'D' : 'R'}
              </CqChip>
            </a>
          ))}
        </div>

        {/* TOP CONTRIBUTORS */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Top contributors · firms + PACs</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Who's giving</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 90px 70px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['#', 'Contributor', 'Total', 'Split'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { n: 'NAR PAC', t: 'PAC · National Assoc of Realtors', amt: 4_120_000, dr: '46/54' },
            { n: 'Blackstone Inc', t: 'Firm · investment trust', amt: 1_840_000, dr: '38/62' },
            { n: 'Related Companies', t: 'Firm · developer', amt: 1_280_000, dr: '52/48' },
            { n: 'NMHC PAC', t: 'PAC · multi-housing', amt: 980_000, dr: '40/60' },
            { n: 'Brookfield Properties', t: 'Firm · REIT', amt: 820_000, dr: '48/52' },
            { n: 'Equity Residential', t: 'Firm · landlord', amt: 740_000, dr: '41/59' },
            { n: 'Tishman Speyer', t: 'Firm · developer', amt: 612_000, dr: '60/40' },
            { n: 'Stewart Title', t: 'Firm · title insurance', amt: 488_000, dr: '32/68' },
          ].map((r, i) => (
            <a
              key={r.n}
              href="#"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 90px 70px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
                textDecoration: 'none',
                color: COLORS.fg1,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {r.t}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                {dollar(r.amt)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {r.dr}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* BILLS THE SECTOR IS WATCHING */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div>
            <CqLabel>Bills · 47 in current Congress · top 6 by lobbying mentions</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              What real estate is lobbying on
            </div>
          </div>
          <a
            href="#"
            style={{
              fontSize: 11,
              color: COLORS.blueHv,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            All 47 →
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 110px 90px 80px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['Bill', 'Title', 'Status', 'Mentions', 'Stance'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {[
          {
            n: 'H.R. 4124',
            t: 'Affordable Housing Credit Improvement Act',
            st: 'In Ways & Means',
            m: 28,
            sup: 'Support',
            clr: COLORS.green,
          },
          {
            n: 'S. 1557',
            t: 'Yes In My Backyard (YIMBY) Act',
            st: 'Reported',
            m: 19,
            sup: 'Mixed',
            clr: COLORS.amber,
          },
          {
            n: 'H.R. 2814',
            t: 'Tenant Protections & Rent Stabilization',
            st: 'Hearing',
            m: 22,
            sup: 'Oppose',
            clr: COLORS.red,
          },
          {
            n: 'S. 3084',
            t: 'Section 8 Funding Reauthorization',
            st: 'In Banking',
            m: 14,
            sup: 'Support',
            clr: COLORS.green,
          },
          {
            n: 'H.R. 5910',
            t: 'REIT Modernization Act of 2025',
            st: 'Cmte action',
            m: 18,
            sup: 'Support',
            clr: COLORS.green,
          },
          {
            n: 'S. 4221',
            t: 'Algorithmic Rent-Setting Antitrust Act',
            st: 'Stalled',
            m: 11,
            sup: 'Oppose',
            clr: COLORS.red,
          },
        ].map(b => (
          <a
            key={b.n}
            href="#"
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 110px 90px 80px',
              gap: 12,
              padding: '14px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
              textDecoration: 'none',
              color: COLORS.fg1,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
              {b.n}
            </span>
            <span style={{ fontSize: 13 }}>{b.t}</span>
            <CqChip variant="info" filled={false} size="sm">
              {b.st}
            </CqChip>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {b.m}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: b.clr,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {b.sup}
            </span>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <CqPlainReading>
          Real estate gives narrowly Republican (53/46) but spreads across both parties. The
          sector's lobbying is concentrated on tax credits and resisting tenant-protection bills.
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.95}>
          {' '}
          Industry roll-up via OpenSecrets CRP code F10. Lobbying mentions counted from LDA Form
          LD-2 issue text.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { FECFilingDetail, IndustrySectorPage, FEC_FILING });
