/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { CqChip, CqLabel } from '@/components/cq';
import { billLabel, categoryOf, formatVoteDate, shortResult } from './data';
import type { ApiVote, VotePosition } from './types';

interface VotesTableProps {
  votes: ApiVote[];
  loading: boolean;
  totalLoaded: number;
}

const COLUMNS = '60px 96px minmax(0, 1fr) 84px 130px 120px 100px';

const POSITION_VARIANT: Record<
  VotePosition,
  { variant: 'info' | 'ink' | 'warn' | 'i'; filled: boolean }
> = {
  Yea: { variant: 'info', filled: false },
  Nay: { variant: 'ink', filled: false },
  Present: { variant: 'warn', filled: false },
  'Not Voting': { variant: 'i', filled: false },
};

export function VotesTable({ votes, loading, totalLoaded }: VotesTableProps) {
  if (loading && votes.length === 0) {
    return <SkeletonRows />;
  }

  if (!loading && totalLoaded === 0) {
    return <EmptyState message="Data unavailable — no roll-call votes returned for this member." />;
  }

  if (votes.length === 0) {
    return (
      <EmptyState message="No votes match the active filters. Reset filters to see all loaded votes." />
    );
  }

  return (
    <div>
      <Header />
      {votes.map(v => (
        <Row key={v.voteId} vote={v} />
      ))}
    </div>
  );
}

function Header() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        gap: 12,
        padding: '10px 0',
        borderTop: '2px solid var(--ink)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {['Roll', 'Bill', 'Title', 'Vote', 'Topic', 'Outcome', 'Date'].map(h => (
        <CqLabel key={h}>{h}</CqLabel>
      ))}
    </div>
  );
}

function Row({ vote }: { vote: ApiVote }) {
  const positionMeta = POSITION_VARIANT[vote.position] ?? POSITION_VARIANT['Not Voting'];
  const billHref = vote.bill?.url ?? vote.congressUrl;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
        minHeight: 36,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {vote.rollNumber > 0 ? `#${vote.rollNumber}` : '—'}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {billHref ? (
          <a
            href={billHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--civiq-blue-active)', textDecoration: 'none' }}
          >
            {billLabel(vote)}
          </a>
        ) : (
          billLabel(vote)
        )}
      </span>
      <span
        style={{
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={vote.bill?.title ?? vote.question}
      >
        {vote.bill?.title ?? vote.question ?? '—'}
        {vote.isKeyVote && (
          <span
            style={{
              marginLeft: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--civiq-blue-active)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            · key
          </span>
        )}
      </span>
      <CqChip variant={positionMeta.variant} size="sm" filled={positionMeta.filled}>
        {vote.position}
      </CqChip>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg2)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {categoryOf(vote)}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={vote.result}
      >
        {shortResult(vote.result)}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatVoteDate(vote.date)}
      </span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      <Header />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
            minHeight: 36,
          }}
        >
          {Array.from({ length: 7 }).map((__, j) => (
            <div
              key={j}
              style={{
                height: 12,
                background: 'var(--bg3)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        border: '2px solid var(--ink)',
        padding: '20px 18px',
        background: 'var(--bg2)',
        fontSize: 13,
        color: 'var(--fg2)',
        lineHeight: 1.55,
      }}
    >
      {message}
    </div>
  );
}
