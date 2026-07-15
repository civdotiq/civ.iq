/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Card Renderer (Satori-Compatible JSX)
 *
 * Renders trading card images at 1200x630 for social media previews.
 * Uses inline styles (Satori requirement - no Tailwind).
 * Follows Aicher/Ulm design: no shadows, no rounded corners, no gradients.
 */

import type {
  TradingCardData,
  ProfileCardData,
  MoneyCardData,
  VoteCardData,
  AlignmentCardData,
  LegislationCardData,
  RecordSummaryCardData,
} from '../types';
import {
  getPartyColor,
  getPartyAbbrev,
  formatCurrency,
  formatPercent,
  formatNumber,
  truncate,
  getCardTypeLabel,
  formatDate,
  getLocationLabel,
} from './shared';

/** Render the appropriate card based on type */
export function renderCard(data: TradingCardData, photoBase64?: string): React.ReactElement {
  switch (data.type) {
    case 'profile':
      return renderProfileCard(data, photoBase64);
    case 'money':
      return renderMoneyCard(data, photoBase64);
    case 'vote':
      return renderVoteCard(data, photoBase64);
    case 'alignment':
      return renderAlignmentCard(data, photoBase64);
    case 'legislation':
      return renderLegislationCard(data, photoBase64);
    case 'record':
      return renderRecordCard(data, photoBase64);
  }
}

/**
 * Incumbent Record Card OG image (mockup 1c): nutrition-label document.
 * Left identity rail with a 3px divider, six headline stats each carrying
 * its baseline, thick black bar, and a baked-in source/as-of footer.
 * Party color appears ONLY on the party chip.
 */
function renderRecordCard(data: RecordSummaryCardData, photoBase64?: string): React.ReactElement {
  const partyColor = getPartyColor(data.party);
  const seatLabel =
    data.chamber === 'House'
      ? `${data.state}-${(data.district ?? '').padStart(2, '0')}`
      : `${data.state} — U.S. Senate`;

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '3px solid #000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#111827',
      }}
    >
      <div style={{ display: 'flex', flex: 1, gap: 32, padding: 32 }}>
        {/* Left identity rail */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 296,
            borderRight: '3px solid #000000',
            paddingRight: 32,
          }}
        >
          {photoBase64 ? (
            <img
              src={photoBase64}
              alt=""
              width={160}
              height={160}
              style={{ width: 160, height: 160, objectFit: 'cover', border: '2px solid #000000' }}
            />
          ) : (
            <div
              style={{
                width: 160,
                height: 160,
                border: '2px solid #000000',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                color: '#9ca3af',
              }}
            >
              {data.name.charAt(0)}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.1,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {truncate(data.name, 24)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: partyColor,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 2,
              }}
            >
              {data.party}
            </div>
            <div style={{ display: 'flex', fontSize: 14, fontWeight: 500 }}>{seatLabel}</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.5,
              color: '#4b5563',
            }}
          >
            <span>
              U.S. {data.chamber} · {data.congress}th Congress
            </span>
            {data.inOfficeSince && (
              <span>
                In office since {data.inOfficeSince} · {data.termOrdinalLabel}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Incumbent Record
          </div>
        </div>

        {/* Stats grid: 3 columns, up to 2 rows */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexWrap: 'wrap',
            alignContent: 'flex-start',
          }}
        >
          {data.stats.map((stat, i) => (
            <div
              key={`${stat.label}-${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '33.33%',
                paddingRight: 32,
                paddingTop: 12,
                paddingBottom: 24,
                borderTop: '2px solid #000000',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 48,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: '#000000',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#4b5563',
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 2,
                  fontSize: 12,
                  letterSpacing: '0.025em',
                  color: '#6b7280',
                }}
              >
                {stat.baseline}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thick nutrition bar */}
      <div style={{ display: 'flex', width: '100%', height: 8, backgroundColor: '#000000' }} />

      {/* Source footer — baked into the pixels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          fontSize: 14,
          letterSpacing: '0.025em',
          color: '#4b5563',
        }}
      >
        <span>
          Sources: {data.sourcesLabel} — {data.asOfLabel}
        </span>
        <span style={{ fontWeight: 700, color: '#111827' }}>{data.recordUrl}</span>
      </div>
    </div>
  );
}

/** Source-line text per card type, shown in the footer. */
const CARD_SOURCES: Record<string, string> = {
  profile: 'Congress.gov · FEC',
  money: 'FEC',
  vote: 'Congress.gov · House Clerk',
  alignment: 'Congress.gov',
  legislation: 'Congress.gov',
  record: 'Congress.gov · FEC · USASpending',
};

/**
 * Shared card shell — link-preview design language: eyebrow row, centered
 * hero (name + party chip + photo), a ticker-style stat row above a
 * party-color accent bar, and a sources/CTA footer. Matches the site OG card
 * and the Incumbent Record card.
 */
function CardShell({
  data,
  photoBase64,
  stats,
  cardTypeLabel,
  sourceLabel,
}: {
  data: TradingCardData;
  photoBase64?: string;
  stats: React.ReactElement;
  cardTypeLabel?: string;
  sourceLabel?: string;
}): React.ReactElement {
  const partyColor = getPartyColor(data.party);
  const partyAbbrev = getPartyAbbrev(data.party);
  const location = getLocationLabel(data.state, data.district);
  const label = cardTypeLabel || getCardTypeLabel(data.type);
  const roleLabel = data.chamber === 'Senate' ? 'Senator' : 'Representative';
  const sources = sourceLabel || CARD_SOURCES[data.type] || 'Official government sources';

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '3px solid #000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#111827',
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '32px 48px 0',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          civdotiq.org
        </span>
      </div>

      {/* Hero: name + party/role/location + photo */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          padding: '20px 48px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {truncate(data.name, 26)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: partyColor,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: 2,
              }}
            >
              {partyAbbrev}
            </div>
            <span style={{ display: 'flex', fontSize: 20, color: '#4b5563' }}>
              {roleLabel} · {location}
            </span>
          </div>
        </div>

        {photoBase64 ? (
          <img
            src={photoBase64}
            alt=""
            width={132}
            height={165}
            style={{ width: 132, height: 165, objectFit: 'cover', border: '2px solid #000000' }}
          />
        ) : (
          <div
            style={{
              width: 132,
              height: 165,
              border: '2px solid #000000',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              color: '#9ca3af',
            }}
          >
            {data.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Stats (card-type specific), sitting just above the accent bar */}
      <div style={{ display: 'flex', padding: '24px 48px 28px' }}>{stats}</div>

      {/* Party accent bar */}
      <div style={{ display: 'flex', width: '100%', height: 8, backgroundColor: partyColor }} />

      {/* Footer: sources + CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 48px',
          fontSize: 14,
          letterSpacing: '0.025em',
          color: '#4b5563',
        }}
      >
        <span>Sources: {sources}</span>
        <span style={{ fontWeight: 700, color: '#111827' }}>Look up your representative →</span>
      </div>
    </div>
  );
}

/** Stat block — ticker style: baseline rule, big number, uppercase label. */
function StatBlock({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        borderTop: '2px solid #000000',
        paddingTop: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 44,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: color || '#111827',
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 8,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#4b5563',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// --- Individual card renderers ---

function renderProfileCard(data: ProfileCardData, photoBase64?: string): React.ReactElement {
  const stats = (
    <div style={{ display: 'flex', width: '100%', gap: 32 }}>
      <StatBlock
        value={data.billsSponsored !== undefined ? formatNumber(data.billsSponsored) : '--'}
        label="Bills Sponsored"
      />
      <StatBlock
        value={data.totalRaised !== undefined ? formatCurrency(data.totalRaised) : '--'}
        label="Total Raised"
      />
      <StatBlock
        value={data.committees !== undefined ? String(data.committees) : '--'}
        label="Committees"
      />
      <StatBlock
        value={data.votesParticipated !== undefined ? formatNumber(data.votesParticipated) : '--'}
        label="Votes Cast"
      />
    </div>
  );

  return <CardShell data={data} photoBase64={photoBase64} stats={stats} />;
}

function renderMoneyCard(data: MoneyCardData, photoBase64?: string): React.ReactElement {
  const stats = (
    <div style={{ display: 'flex', width: '100%', gap: 32 }}>
      <StatBlock value={formatCurrency(data.totalRaised)} label="Total Raised" />
      <StatBlock value={formatPercent(data.individualPercent)} label="Individuals" />
      <StatBlock value={formatPercent(data.pacPercent)} label="PACs" />
      {data.topIndustry ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            borderTop: '2px solid #000000',
            paddingTop: 12,
          }}
        >
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
            {truncate(data.topIndustry, 20)}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#4b5563',
              textTransform: 'uppercase',
            }}
          >
            Top Industry
          </div>
        </div>
      ) : (
        <StatBlock value={String(data.cycle)} label="Cycle" />
      )}
    </div>
  );

  return <CardShell data={data} photoBase64={photoBase64} stats={stats} />;
}

function renderVoteCard(data: VoteCardData, photoBase64?: string): React.ReactElement {
  const positionColor =
    data.position === 'Yea' ? '#0a9338' : data.position === 'Nay' ? '#e11d07' : '#666666';

  const stats = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
      {/* Bill title */}
      <div style={{ display: 'flex', fontSize: 20, color: '#4b5563', lineHeight: 1.3 }}>
        {truncate(data.billTitle, 80)}
      </div>
      {/* Position + vote totals */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
        <StatBlock
          value={data.position}
          label={`Voted ${formatDate(data.voteDate)}`}
          color={positionColor}
        />
        {data.totalYea !== undefined && (
          <StatBlock value={String(data.totalYea)} label="Total Yea" color="#0a9338" />
        )}
        {data.totalNay !== undefined && (
          <StatBlock value={String(data.totalNay)} label="Total Nay" color="#e11d07" />
        )}
      </div>
    </div>
  );

  return (
    <CardShell
      data={data}
      photoBase64={photoBase64}
      stats={stats}
      cardTypeLabel={`VOTE: ${data.billNumber.toUpperCase()}`}
    />
  );
}

function renderAlignmentCard(data: AlignmentCardData, photoBase64?: string): React.ReactElement {
  const peerDiff =
    data.peerAveragePercent != null
      ? Math.round(data.partyAlignmentPercent) - Math.round(data.peerAveragePercent)
      : null;

  const stats = (
    <div style={{ display: 'flex', width: '100%', gap: 32 }}>
      <StatBlock
        value={formatPercent(data.partyAlignmentPercent)}
        label="Party Alignment"
        color={getPartyColor(data.party)}
      />
      <StatBlock value={formatNumber(data.votesAgainstParty)} label="Against Party" />
      <StatBlock value={formatNumber(data.totalVotes)} label="Total Votes" />
      {peerDiff != null && (
        <StatBlock
          value={`${peerDiff > 0 ? '+' : ''}${peerDiff}%`}
          label={peerDiff >= 0 ? 'Above Avg' : 'Below Avg'}
        />
      )}
    </div>
  );

  return <CardShell data={data} photoBase64={photoBase64} stats={stats} />;
}

function renderLegislationCard(
  data: LegislationCardData,
  photoBase64?: string
): React.ReactElement {
  const stats = (
    <div style={{ display: 'flex', width: '100%', gap: 32 }}>
      <StatBlock value={formatNumber(data.billsSponsored)} label="Bills Sponsored" />
      <StatBlock value={formatNumber(data.billsEnacted)} label="Became Law" color="#0a9338" />
      {data.focusAreas.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 2,
            borderTop: '2px solid #000000',
            paddingTop: 12,
          }}
        >
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, lineHeight: 1.25 }}>
            {data.focusAreas.slice(0, 3).join(', ')}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#4b5563',
              textTransform: 'uppercase',
            }}
          >
            Focus Areas
          </div>
        </div>
      )}
    </div>
  );

  return <CardShell data={data} photoBase64={photoBase64} stats={stats} />;
}
