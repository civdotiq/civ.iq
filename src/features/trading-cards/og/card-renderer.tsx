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
  }
}

/** Shared card shell wrapping all cards */
function CardShell({
  data,
  photoBase64,
  stats,
  cardTypeLabel,
}: {
  data: TradingCardData;
  photoBase64?: string;
  stats: React.ReactElement;
  cardTypeLabel?: string;
}): React.ReactElement {
  const partyColor = getPartyColor(data.party);
  const partyAbbrev = getPartyAbbrev(data.party);
  const location = getLocationLabel(data.state, data.district);
  const label = cardTypeLabel || getCardTypeLabel(data.type);

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '2px solid #000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Party color accent bar */}
      <div style={{ width: '100%', height: 8, backgroundColor: partyColor, display: 'flex' }} />

      {/* Header: card type, name, photo, CIV.IQ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '32px 48px 0 48px',
        }}
      >
        {/* Left: card type + name */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: partyColor,
              marginBottom: 12,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            {truncate(data.name, 28)}
          </div>
          <div
            style={{
              fontSize: 20,
              color: '#666666',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: partyColor, fontWeight: 600 }}>{partyAbbrev}</span>
            <span>{data.chamber === 'Senate' ? 'Senator' : 'Representative'}</span>
            <span style={{ color: '#999999' }}>{location}</span>
          </div>
        </div>

        {/* Photo */}
        {photoBase64 ? (
          <div
            style={{
              width: 120,
              height: 150,
              border: '2px solid #000000',
              overflow: 'hidden',
              display: 'flex',
              marginLeft: 24,
            }}
          >
            <img
              src={photoBase64}
              alt=""
              width={120}
              height={150}
              style={{ objectFit: 'cover', width: 120, height: 150 }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 120,
              height: 150,
              border: '2px solid #cccccc',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 24,
              fontSize: 48,
              color: '#cccccc',
            }}
          >
            {data.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          margin: '24px 48px',
          height: 2,
          backgroundColor: '#e5e7eb',
          display: 'flex',
        }}
      />

      {/* Stats section (card-type specific) */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          padding: '0 48px',
        }}
      >
        {stats}
      </div>

      {/* Footer divider */}
      <div
        style={{
          margin: '0 48px',
          height: 2,
          backgroundColor: '#e5e7eb',
          display: 'flex',
        }}
      />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 48px',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', color: '#000000' }}>
          civdotiq.org
        </div>
        <div style={{ fontSize: 14, color: '#999999' }}>Real government data</div>
      </div>
    </div>
  );
}

/** Stat block for the stats row */
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: color || '#000000',
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: '#999999',
          textTransform: 'uppercase',
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {truncate(data.topIndustry, 20)}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#999999',
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
      <div style={{ fontSize: 20, color: '#333333', lineHeight: 1.3 }}>
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
  const trendLabel =
    data.trend === 'increasing'
      ? 'Trending Up'
      : data.trend === 'decreasing'
        ? 'Trending Down'
        : 'Stable';

  const stats = (
    <div style={{ display: 'flex', width: '100%', gap: 32 }}>
      <StatBlock
        value={formatPercent(data.partyAlignmentPercent)}
        label="Party Alignment"
        color={getPartyColor(data.party)}
      />
      <StatBlock value={formatNumber(data.bipartisanVotes)} label="Bipartisan Votes" />
      <StatBlock value={formatNumber(data.totalVotes)} label="Total Votes" />
      {data.trend && <StatBlock value={trendLabel} label="Trend" />}
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            {data.focusAreas.slice(0, 3).join(', ')}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#999999',
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
