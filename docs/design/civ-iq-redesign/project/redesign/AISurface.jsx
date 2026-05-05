// AI SURFACE — Templates 34-35.
// The brand-trust frontier. CIV.IQ is positioned as factual, nonpartisan,
// citation-anchored civic infrastructure. The AI surface is where users
// decide whether the system tells the truth.
//
// THE CHATBOT AESTHETIC IS THE WRONG MENTAL MODEL.
// These are designed as wire-bulletin Q&A columns — same Aicher chassis,
// with a Q&A primary content type. No message bubbles. No sparkle icons.
// No soft corners. No "chat", "assistant", or "bot" anywhere.
// Brand word for this surface: "Ask" or "Q&A".
//
// Templates:
//   34 · AskEntryPage      — drives /ask  · cold-start surface
//   35 · AskResultPage     — drives /ask/[slug]/[entityId] · answer surface
//   IA · /investigate      — DEPRECATE (see DeprecateInvestigateNote)

// ── Shared AI-surface primitives ────────────────────

// CqAskInput — single-shot question input. Square frame, mono caret-position
// indicator, a single SUBMIT button. Looks like a card-catalog query slip,
// not a chat composer. No multi-turn affordance.
function CqAskInput({
  value = '',
  placeholder = 'Ask a question about an official, bill, industry, or topic.',
}) {
  return (
    <div
      style={{
        border: '2px solid #000',
        background: '#fff',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
      }}
    >
      <div style={{ padding: '18px 22px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: COLORS.fg3,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Question
        </div>
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.35,
            color: value ? COLORS.fg1 : COLORS.fg4,
            fontWeight: value ? 500 : 400,
            fontFamily: 'var(--font-primary)',
            letterSpacing: '-0.005em',
            minHeight: 60,
          }}
        >
          {value || placeholder}
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: 24,
              background: COLORS.blue,
              marginLeft: 4,
              verticalAlign: '-4px',
              animation: 'none',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: COLORS.fg3,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>One question per submission · No multi-turn</span>
          <span style={{ color: COLORS.fg4 }}>·</span>
          <span>Returns 1 answer with citations</span>
        </div>
      </div>
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
          fontFamily: 'var(--font-primary)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderLeft: '2px solid #000',
        }}
      >
        Submit
        <span style={{ fontSize: 18 }}>→</span>
      </div>
    </div>
  );
}

// CqQAColumn — the wire-bulletin Q&A column. Question is in monospace as a
// bracketed line. Answer is body text. NOT a chat bubble. Single column.
function CqQAColumn({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{children}</div>;
}

// CqSuggestedQuestion — a clickable scannable line. Looks like an index entry.
function CqSuggestedQuestion({ q, scope, slug, entityId }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        padding: '12px 0',
        borderTop: `1px solid ${COLORS.line}`,
        textDecoration: 'none',
        color: COLORS.fg1,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: COLORS.fg1, fontWeight: 500, lineHeight: 1.4 }}>{q}</div>
        <div
          style={{
            fontSize: 10,
            color: COLORS.fg3,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            marginTop: 3,
          }}
        >
          {scope} · /ask/{slug}/{entityId}
        </div>
      </div>
      <span style={{ fontSize: 16, color: COLORS.fg3 }}>→</span>
    </a>
  );
}

// CqConfidenceBand — visible 0-1 score with a 1-line interpretation.
// Square 12-cell ladder, filled to the rounded confidence value. Plain
// language explanation underneath.
function CqConfidenceBand({ score = 0.86, interpretation, basis }) {
  const cells = 12;
  const filled = Math.round(score * cells);
  return (
    <div style={{ border: '2px solid #000', padding: '14px 18px', background: '#fff' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <CqLabel>Confidence</CqLabel>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {score.toFixed(2)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
        {Array.from({ length: cells }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 14,
              background: i < filled ? COLORS.blue : COLORS.bg3,
              border: `1px solid ${i < filled ? COLORS.blue : COLORS.line}`,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5 }}>
        <strong style={{ color: COLORS.fg1, marginRight: 4 }}>{interpretation}.</strong>
        {basis}
      </div>
    </div>
  );
}

// CqCitation — every claim in the answer is anchored. The source rail is
// expanded on this surface; each citation has the inline number, the source,
// the entity it points to, and the link.
function CqCitation({ n, source, entity, route, snippet }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 14,
        padding: '12px 0',
        borderTop: `1px solid ${COLORS.line}`,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.blue,
          border: `2px solid ${COLORS.blue}`,
          width: 26,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
        }}
      >
        {n}
      </span>
      <div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <CqLabel color={COLORS.fg1}>{source}</CqLabel>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: COLORS.fg3,
              letterSpacing: '0.04em',
            }}
          >
            {entity}
          </span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 4 }}>
          {snippet}
        </div>
        <a
          href="#"
          style={{
            display: 'inline-block',
            marginTop: 6,
            fontSize: 10,
            color: COLORS.blueHv,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {route} →
        </a>
      </div>
    </div>
  );
}

// CqInlineCite — superscript-style number rendered inline in the answer.
function CqInlineCite({ n }) {
  return (
    <a
      href={`#cite-${n}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        marginLeft: 2,
        marginRight: 1,
        verticalAlign: '2px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.blue,
        border: `1px solid ${COLORS.blue}`,
        background: '#fff',
        textDecoration: 'none',
        letterSpacing: '-0.02em',
      }}
    >
      {n}
    </a>
  );
}

// CqMethodologyBlock — prose, not jargon. Which sources, which retrieval
// method, which model. Square frame, paper background, monospace title.
function CqMethodologyBlock({ sources = [], retrieval, model, refresh }) {
  return (
    <div style={{ border: '2px solid #000', background: '#fff' }}>
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '10px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        How this answer was built
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <CqLabel>Sources used</CqLabel>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sources.map(s => (
              <div
                key={s.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  gap: 12,
                  fontSize: 12,
                  color: COLORS.fg2,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: COLORS.fg1, fontWeight: 700 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 5,
                      height: 5,
                      background: COLORS.blue,
                      marginRight: 6,
                      verticalAlign: 'middle',
                    }}
                  />
                  {s.name}
                </span>
                <span>{s.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
            paddingTop: 12,
            borderTop: `1px solid ${COLORS.line}`,
          }}
        >
          <div>
            <CqLabel>Retrieval</CqLabel>
            <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 4 }}>
              {retrieval}
            </div>
          </div>
          <div>
            <CqLabel>Generation</CqLabel>
            <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 4 }}>
              {model}
            </div>
          </div>
          <div>
            <CqLabel>Refresh</CqLabel>
            <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 4 }}>
              {refresh}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CqLimitations — what this answer cannot tell you. Amber left bar — not red,
// because red is reserved for party. Amber is the system's reserved error/
// caution color.
function CqLimitations({ items = [] }) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${COLORS.amber}`,
        padding: '12px 18px',
        background: COLORS.bg2,
      }}
    >
      <CqLabel color={COLORS.amber}>What this answer cannot tell you</CqLabel>
      <ul
        style={{
          margin: '8px 0 0',
          padding: '0 0 0 18px',
          fontSize: 12,
          color: COLORS.fg2,
          lineHeight: 1.55,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Template 34 · AskEntryPage ──────────────────────
// Drives /ask. The cold-start surface. No chat. Reference-encyclopedia
// front page. Primary input + suggested questions by entity type + recent
// answered + "what this can and cannot answer" footer.

function AskEntryPage() {
  const suggested = [
    {
      group: 'About an official',
      icon: 'OFC',
      questions: [
        {
          q: 'How does Hakeem Jeffries vote on housing?',
          scope: 'Official · J000294',
          slug: 'voting-record-housing',
          entityId: 'J000294',
        },
        {
          q: 'Who funds Lisa Murkowski?',
          scope: 'Official · M001153',
          slug: 'top-donors',
          entityId: 'M001153',
        },
      ],
    },
    {
      group: 'About a bill',
      icon: 'BIL',
      questions: [
        {
          q: "What's in H.R. 3684?",
          scope: 'Bill · H.R. 3684',
          slug: 'plain-summary',
          entityId: 'HR3684-117',
        },
        {
          q: 'Who sponsored the 2024 NDAA?',
          scope: 'Bill · H.R. 2670',
          slug: 'sponsor-cosponsors',
          entityId: 'HR2670-118',
        },
      ],
    },
    {
      group: 'About an industry',
      icon: 'IND',
      questions: [
        {
          q: 'Who funds real estate PACs?',
          scope: 'Industry · NAICS 531',
          slug: 'top-pac-donors',
          entityId: 'naics-531',
        },
        {
          q: 'How much did energy spend in 2024?',
          scope: 'Industry · NAICS 211',
          slug: 'cycle-totals',
          entityId: 'naics-211',
        },
      ],
    },
    {
      group: 'About a topic',
      icon: 'TOP',
      questions: [
        {
          q: "What's the federal stance on rent control?",
          scope: 'Topic · Housing',
          slug: 'federal-position',
          entityId: 'housing',
        },
        {
          q: 'Which bills address methane emissions?',
          scope: 'Topic · Climate',
          slug: 'matching-bills',
          entityId: 'climate',
        },
      ],
    },
  ];

  const recent = [
    { q: 'How does Jeffries vote on housing?', asked: '12 hrs ago', answers: 1 },
    { q: 'Who funds Cassidy in the 2025–26 cycle?', asked: 'Yesterday', answers: 1 },
    { q: "What's in the 2024 Israel-Ukraine supplemental?", asked: '2 days ago', answers: 1 },
    { q: 'Which committees report on energy policy?', asked: '3 days ago', answers: 1 },
  ];

  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Ask', 'Reference Q&A', 'Citation-anchored answers']}
      crumbRight={[
        <span key="t">Q&A · Indexed Apr 26, 2026</span>,
        <span key="i">19 sources · 0 fabricated facts</span>,
      ]}
    >
      {/* Hero — wire-bulletin headline. Not a chat composer. */}
      <div style={{ paddingBottom: 24, borderBottom: '2px solid #000', marginBottom: 28 }}>
        <CqLabel>Reference Q&A</CqLabel>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
            margin: '6px 0 12px',
            textTransform: 'uppercase',
            textWrap: 'balance',
          }}
        >
          Ask one question.
          <br />
          <span style={{ color: COLORS.fg3 }}>Get one answer with sources.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: COLORS.fg2,
            lineHeight: 1.55,
            maxWidth: 720,
            margin: 0,
          }}
        >
          Every answer is built from the 19 government sources that drive the rest of CIV.IQ. Every
          claim is cited. No multi-turn chat — one question, one answer, one citation rail. If the
          data isn't there, the answer says so.
        </p>
      </div>

      {/* Single primary input */}
      <div style={{ marginBottom: 32 }}>
        <CqAskInput value="" />
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: COLORS.fg3,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>Try: "How does Jeffries vote on housing?"</span>
          <span style={{ color: COLORS.fg4 }}>·</span>
          <span>"What's in H.R. 3684?"</span>
          <span style={{ color: COLORS.fg4 }}>·</span>
          <span>"Who funds real estate PACs?"</span>
        </div>
      </div>

      {/* 4-column suggested questions */}
      <div style={{ marginBottom: 36 }}>
        <SectionHead
          label="Suggested questions · 8"
          right={
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: COLORS.fg3,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Grouped by entity type
            </span>
          }
        />
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 28,
          }}
        >
          {suggested.map(g => (
            <div
              key={g.group}
              style={{ border: '2px solid #000', padding: '18px 22px', background: '#fff' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <CqLabel>{g.group}</CqLabel>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: COLORS.fg3,
                    border: `1px solid ${COLORS.line}`,
                    padding: '1px 5px',
                    letterSpacing: '0.08em',
                  }}
                >
                  {g.icon}
                </span>
              </div>
              <div>
                {g.questions.map(q => (
                  <CqSuggestedQuestion key={q.q} {...q} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently answered — social proof */}
      <div style={{ marginBottom: 36 }}>
        <SectionHead
          label={`Recently answered · ${recent.length}`}
          right={
            <a href="#" style={{ ...asideLinkStyle }}>
              View all answered questions →
            </a>
          }
        />
        <div style={{ marginTop: 8 }}>
          {recent.map((r, i) => (
            <a
              key={i}
              href="#"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 24px',
                gap: 16,
                padding: '14px 0',
                borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                textDecoration: 'none',
                color: COLORS.fg1,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.q}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: COLORS.fg3,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Asked {r.asked}
              </span>
              <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
            </a>
          ))}
        </div>
      </div>

      {/* What this can and cannot answer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 28,
          marginBottom: 24,
        }}
      >
        <div style={{ border: '2px solid #000', padding: '22px 26px', background: '#fff' }}>
          <CqLabel color={COLORS.green}>What this can answer</CqLabel>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 18px',
              fontSize: 13,
              color: COLORS.fg2,
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <li>How a member voted on a specific bill or topic.</li>
            <li>Who funded a campaign, by donor, PAC, or industry.</li>
            <li>What a bill text says, in plain language.</li>
            <li>Which bills, regulations, or filings address a topic.</li>
            <li>Federal spending by program code or recipient.</li>
            <li>Lobbying registrations and quarterly reports.</li>
          </ul>
        </div>
        <div style={{ border: '2px solid #000', padding: '22px 26px', background: '#fff' }}>
          <CqLabel color={COLORS.amber}>What this cannot answer</CqLabel>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 18px',
              fontSize: 13,
              color: COLORS.fg2,
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <li>Why a member voted a certain way. CIV.IQ tracks behavior, not motive.</li>
            <li>Predictions, projections, or political handicapping.</li>
            <li>Committee deliberations — only floor votes are tracked.</li>
            <li>State campaign finance — federal only.</li>
            <li>Any question requiring opinion or editorial framing.</li>
            <li>Local government below state legislatures (expanding incrementally).</li>
          </ul>
        </div>
      </div>

      <CqDisclaimer confidence={0.94}>
        {' '}
        Q&A surface uses retrieval over the same 19 sources as the rest of the system. No claim
        survives without a source-rail anchor.
      </CqDisclaimer>
    </CqPage>
  );
}

// ── Template 35 · AskResultPage ─────────────────────
// Drives /ask/[slug]/[entityId]. The answer surface. Echo question (parsed +
// structured). Answer paragraph (plain language, ≤8th-grade). Citations
// panel. Methodology. Confidence band. Limitations. Related questions.
// Open-the-data CTAs.

function AskResultPage() {
  const citations = [
    {
      n: 1,
      source: 'House Clerk',
      entity: 'Roll call 421 · 117th',
      route: '/vote/2021-117-roll-421',
      snippet:
        'H.R. 3684 final passage · Nov 5, 2021 · 228 yea / 206 nay. Jeffries (NY-08) voted YEA.',
    },
    {
      n: 2,
      source: 'House Clerk',
      entity: 'Roll call 144 · 118th',
      route: '/vote/2024-118-roll-144',
      snippet:
        'H.R. 7065 — Affordable Housing Bond Enhancement Act · Mar 22, 2024 · 219 yea / 211 nay. Jeffries voted YEA.',
    },
    {
      n: 3,
      source: 'Congress.gov',
      entity: 'H.R. 4351 · cosponsor list',
      route: '/bill/HR4351-118',
      snippet:
        'Housing is a Human Right Act of 2023 — Rep. Jeffries listed as cosponsor as of Jul 14, 2023.',
    },
    {
      n: 4,
      source: 'OpenSecrets',
      entity: 'N00033640 · industry totals',
      route: '/officials/J000294/donors',
      snippet:
        'Real estate sector contributed $187,420 to Jeffries 2023–24 cycle. Securities & Investment is the top sector at $602,300.',
    },
    {
      n: 5,
      source: 'House Clerk',
      entity: 'Roll call 87 · 118th',
      route: '/vote/2023-118-roll-87',
      snippet:
        'H.R. 4350 — Yes In My Backyard Act · Apr 17, 2023 · 218 yea / 207 nay. Jeffries voted YEA.',
    },
    {
      n: 6,
      source: 'Congress.gov',
      entity: 'Sponsorship index · 119th',
      route: '/officials/J000294/sponsored',
      snippet:
        'Jeffries has sponsored 0 bills under the "housing" subject heading in the 119th Congress (as of Apr 26, 2026); 4 cosponsorships.',
    },
  ];

  const related = [
    {
      q: 'How does Jeffries vote on healthcare?',
      scope: 'Same official · different topic',
      slug: 'voting-record-healthcare',
      entityId: 'J000294',
    },
    {
      q: 'Who funds Hakeem Jeffries?',
      scope: 'Same official · funding lens',
      slug: 'top-donors',
      entityId: 'J000294',
    },
    {
      q: 'How does the rest of NY-08 delegation vote on housing?',
      scope: 'Same topic · different officials',
      slug: 'voting-record-housing',
      entityId: 'NY-delegation',
    },
    {
      q: 'Which housing bills passed the 119th Congress?',
      scope: 'Same topic · bill index',
      slug: 'passed-bills',
      entityId: 'housing',
    },
  ];

  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Ask', 'voting-record-housing', 'J000294 · Jeffries']}
      crumbRight={[
        <span key="t">Answered Apr 26, 2026 · 1.4s</span>,
        <span key="i">6 citations · Confidence 0.91</span>,
      ]}
    >
      {/* QUESTION ECHO — parsed + structured. Not free-text. */}
      <div style={{ paddingBottom: 20, borderBottom: '2px solid #000', marginBottom: 24 }}>
        <CqLabel>Question</CqLabel>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: '6px 0 14px',
            textWrap: 'balance',
          }}
        >
          How does Hakeem Jeffries vote on housing?
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <CqChip variant="d" size="sm">
            Official · J000294
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Topic · Housing
          </CqChip>
          <CqChip variant="info" filled={false} size="sm">
            Lens · Voting record
          </CqChip>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: COLORS.fg3,
              letterSpacing: '0.04em',
            }}
          >
            Parsed by entity resolver · Apr 26, 2026 · 1.4s
          </span>
        </div>
      </div>

      {/* TWO COLUMN: ANSWER + CITATIONS | METHOD + CONFIDENCE + LIMITS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 36,
          alignItems: 'flex-start',
        }}
      >
        {/* ANSWER COLUMN */}
        <div>
          {/* Header with the official it's about */}
          <div
            style={{
              border: '2px solid #000',
              display: 'grid',
              gridTemplateColumns: '88px 1fr',
              marginBottom: 24,
            }}
          >
            <CqPortrait name="Hakeem S. Jeffries" size={88} party="d" />
            <div style={{ padding: '14px 18px' }}>
              <CqLabel>Answer about</CqLabel>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                Hakeem S. Jeffries
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 6,
                  flexWrap: 'wrap',
                }}
              >
                <CqChip variant="d" size="sm">
                  D · NY-08 · House
                </CqChip>
                <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  In office since 2013 · House Minority Leader
                </span>
              </div>
            </div>
          </div>

          {/* The Q&A column itself — wire-bulletin form. Not a bubble. */}
          <CqQAColumn>
            <div>
              <CqLabel>Answer · Plain language</CqLabel>
              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.fg1,
                  marginTop: 10,
                  maxWidth: 760,
                  letterSpacing: '-0.005em',
                }}
              >
                <p style={{ margin: '0 0 14px' }}>
                  Jeffries votes <strong style={{ color: COLORS.green }}>for</strong> federal
                  housing investment most of the time. In the 117th Congress he voted yea on the
                  Infrastructure Investment and Jobs Act
                  <CqInlineCite n={1} />, which carries roughly $48.8 billion for water, broadband,
                  and resilience programs that touch housing infrastructure.
                </p>
                <p style={{ margin: '0 0 14px' }}>
                  In the 118th Congress he voted yea on three of the chamber's recorded housing
                  votes: the Affordable Housing Bond Enhancement Act
                  <CqInlineCite n={2} />, the Yes In My Backyard Act
                  <CqInlineCite n={5} />, and he is a cosponsor of the Housing is a Human Right Act
                  <CqInlineCite n={3} />. He has not voted against a Democratic-leadership-backed
                  housing bill in the period covered (2021–2026).
                </p>
                <p style={{ margin: 0 }}>
                  He has sponsored zero housing-subject bills in the 119th Congress
                  <CqInlineCite n={6} /> — typical for House leadership, who route legislation
                  through committee chairs. The real estate sector contributed roughly $187,420 to
                  his 2024 cycle
                  <CqInlineCite n={4} />; that places real estate well below his top funding
                  sectors.
                </p>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: COLORS.fg3,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: 14,
                }}
              >
                Reading level · 7.6 (Flesch-Kincaid) · 187 words · Below 8th-grade ceiling
              </div>
            </div>

            {/* CITATIONS PANEL */}
            <div>
              <SectionHead
                label={`Citations · ${citations.length}`}
                right={
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: COLORS.fg3,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Every claim anchored
                  </span>
                }
              />
              <div>
                {citations.map(c => (
                  <CqCitation key={c.n} {...c} />
                ))}
              </div>
            </div>

            {/* OPEN UNDERLYING DATA CTAs */}
            <div>
              <SectionHead label="Open the underlying data" />
              <div
                style={{
                  marginTop: 16,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 14,
                }}
              >
                {[
                  ['/officials/J000294/votes', 'Voting record', '2,118 votes · 119th'],
                  ['/officials/J000294/donors', 'Donor breakdown', '$3.42M · 2024 cycle'],
                  ['/topic/housing', 'Housing topic', '47 bills · 12 regulations'],
                ].map(([route, title, sub]) => (
                  <a
                    key={route}
                    href="#"
                    style={{
                      border: `2px solid ${COLORS.ink}`,
                      padding: '16px 18px',
                      background: '#fff',
                      textDecoration: 'none',
                      color: COLORS.fg1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: COLORS.blueHv,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {route}
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {title} <span style={{ color: COLORS.fg3 }}>→</span>
                    </span>
                    <span
                      style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}
                    >
                      {sub}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* RELATED QUESTIONS */}
            <div>
              <SectionHead
                label="Related questions"
                right={
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: COLORS.fg3,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Same entity · different lens
                  </span>
                }
              />
              <div style={{ marginTop: 4 }}>
                {related.map(r => (
                  <CqSuggestedQuestion key={r.q} {...r} />
                ))}
              </div>
            </div>
          </CqQAColumn>
        </div>

        {/* RIGHT RAIL — methodology + confidence + limitations */}
        <aside
          style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <CqConfidenceBand
            score={0.91}
            interpretation="High"
            basis="Based on 6 floor votes plus 1 cosponsorship and 1 industry-total filing across the 117th–119th Congresses."
          />

          <CqMethodologyBlock
            sources={[
              { name: 'House Clerk', note: 'Roll-call votes 117th–119th' },
              { name: 'Congress.gov', note: 'Bill text + sponsor / cosponsor lists' },
              { name: 'OpenSecrets', note: 'Industry-coded contribution totals' },
            ]}
            retrieval="Entity-scoped query: official J000294 + topic 'housing'. Returned all roll-call votes tagged with subject 'housing-subject', plus all sponsored / cosponsored bills under same."
            model="Synthesis pass — extractive only. No claim survives without a source-rail anchor; numbers are quoted from records, not estimated."
            refresh="House Clerk votes refresh nightly; OpenSecrets industry totals lag FEC by 7–14 days."
          />

          <CqLimitations
            items={[
              'We track recorded floor votes only. Committee deliberations are not in the dataset.',
              'Subject tagging on bills comes from Congress.gov; some housing-adjacent bills filed under "tax" or "banking" may not surface here.',
              'Industry totals are bulk; CIV.IQ does not infer motive from donor patterns. Correlation does not imply causation.',
              'No state-level housing votes are included — Jeffries has been a federal official since 2013.',
            ]}
          />

          <CqDisclaimer
            confidence={0.91}
            method="Retrieval + extractive synthesis · No interpretation"
          />
        </aside>
      </div>
    </CqPage>
  );
}

// ── /investigate IA — DEPRECATE (Option 1) ────────────
// The brief: "pick one, don't return a third option."
// Decision: DEPRECATE.
// Rationale: CIV.IQ's product memory says it is infrastructure, not an
// investigation tool. Reframing /investigate as a research workspace creates
// a second chassis variant (different interactions, more state) that
// duplicates the Q&A surface's purpose at higher complexity. Reframing as
// open-data is fine but already covered by /api and /downloads — calling
// it /investigate misnames it.
// The route retires in PR 0.5. Comparison-style queries are handled by the
// Q&A surface with multi-entity slugs (/ask/voting-record-housing/NY-delegation).

function DeprecateInvestigateNote() {
  return (
    <div
      style={{
        width: 1080,
        background: '#fff',
        padding: '32px 36px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ paddingBottom: 18, borderBottom: '2px solid #000' }}>
        <CqLabel>IA decision</CqLabel>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 8px',
            textTransform: 'uppercase',
          }}
        >
          /investigate · Deprecate
        </h2>
        <p style={{ fontSize: 14, color: COLORS.fg2, lineHeight: 1.55, margin: 0, maxWidth: 720 }}>
          The brief asked for a binary call. Picked: deprecate the route in PR 0.5, right after the
          rename. No template required.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        <div
          style={{ border: `2px solid ${COLORS.ink}`, padding: '20px 22px', background: '#fff' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: COLORS.green,
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Picked
          </div>
          <CqLabel>Option 1</CqLabel>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }}
          >
            Deprecate
          </div>
          <p style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 8 }}>
            Redirect /investigate → /ask. Product memory says CIV.IQ is infrastructure, not an
            investigation tool. The Q&A surface already takes the "follow this entity" use case.
          </p>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 16px',
              fontSize: 11,
              color: COLORS.fg3,
              lineHeight: 1.55,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <li>Route retires PR 0.5</li>
            <li>301 → /ask</li>
            <li>0 templates needed</li>
          </ul>
        </div>

        <div
          style={{
            border: `2px solid ${COLORS.line}`,
            padding: '20px 22px',
            background: COLORS.bg2,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: COLORS.fg4,
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Rejected
          </div>
          <CqLabel>Option 2</CqLabel>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }}
          >
            Research workspace
          </div>
          <p style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 8 }}>
            Different chassis, multi-step state, journalist-scoped. Creates a second product
            personality that contradicts "infrastructure, not investigation."
          </p>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 16px',
              fontSize: 11,
              color: COLORS.fg3,
              lineHeight: 1.55,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <li>
              Multi-entity comparisons → handled by /ask with delegation IDs (e.g.
              /ask/voting-record-housing/NY-delegation)
            </li>
            <li>Avoids second chassis</li>
          </ul>
        </div>

        <div
          style={{
            border: `2px solid ${COLORS.line}`,
            padding: '20px 22px',
            background: COLORS.bg2,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: COLORS.fg4,
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Rejected
          </div>
          <CqLabel>Option 3</CqLabel>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }}
          >
            Open data hub
          </div>
          <p style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, marginTop: 8 }}>
            Already covered by the Builders footer block (API · MCP · bulk download · GitHub) and
            the /api landing. Calling it /investigate misnames it.
          </p>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 0 0 16px',
              fontSize: 11,
              color: COLORS.fg3,
              lineHeight: 1.55,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <li>If wanted: rename to /data, not /investigate</li>
            <li>Out of scope for this brief</li>
          </ul>
        </div>
      </div>

      <div
        style={{
          borderLeft: `3px solid ${COLORS.blue}`,
          padding: '14px 18px',
          background: COLORS.bg2,
          fontSize: 13,
          color: COLORS.fg2,
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: COLORS.fg1, marginRight: 6 }}>FOLLOW-UP.</strong>
        The "compare 5 reps' votes on a topic" use case in Option 2 is real — it's just better
        solved as a Q&A query with a multi-entity slug. Listed as a future entity-resolver
        enhancement (not a separate canvas).
      </div>
    </div>
  );
}

// SectionHead + asideLinkStyle — local copies so this file stands alone.
function SectionHead({ label, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 8,
        marginBottom: 0,
        borderBottom: '2px solid #000',
      }}
    >
      <CqLabel>{label}</CqLabel>
      {right}
    </div>
  );
}
const asideLinkStyle = {
  fontSize: 11,
  color: COLORS.blueHv,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

Object.assign(window, {
  CqAskInput,
  CqQAColumn,
  CqSuggestedQuestion,
  CqConfidenceBand,
  CqCitation,
  CqInlineCite,
  CqMethodologyBlock,
  CqLimitations,
  AskEntryPage,
  AskResultPage,
  DeprecateInvestigateNote,
});
