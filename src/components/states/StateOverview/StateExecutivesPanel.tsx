/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import type { StateExecutiveSummary, StateExecutivesSummary } from './types';

interface StateExecutivesPanelProps {
  executives: StateExecutivesSummary | null;
}

export function StateExecutivesPanel({ executives }: StateExecutivesPanelProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <CqLabel>Statewide elected officials</CqLabel>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: '4px 0 0',
            letterSpacing: '-0.01em',
          }}
        >
          State leadership
        </h2>
      </div>

      {!executives ? (
        <CqPlainReading label="DATA UNAVAILABLE.">
          State executive data not yet available from Wikidata for this state.
        </CqPlainReading>
      ) : (
        <div style={{ border: '2px solid var(--ink)' }}>
          {executives.governor && (
            <ExecRow exec={executives.governor} highlight isFirst index={0} />
          )}
          {executives.others.slice(0, 6).map((exec, i) => (
            <ExecRow
              key={exec.id}
              exec={exec}
              isFirst={!executives.governor && i === 0}
              index={executives.governor ? i + 1 : i}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ExecRow({
  exec,
  highlight = false,
  isFirst,
  index,
}: {
  exec: StateExecutiveSummary;
  highlight?: boolean;
  isFirst: boolean;
  index: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60px minmax(0, 1fr) auto',
        gap: 14,
        padding: '14px 18px',
        borderTop: isFirst ? 0 : '1px solid var(--line)',
        background: highlight ? 'var(--bg2)' : 'transparent',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-label)',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginBottom: 2,
            flexWrap: 'wrap',
          }}
        >
          <CqChip variant={exec.party} size="sm">
            {exec.party === 'd' ? 'D' : exec.party === 'r' ? 'R' : 'I'}
          </CqChip>
          <CqLabel>{exec.position}</CqLabel>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={exec.name}
        >
          {exec.name}
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        {exec.termEndYear ? `Term ends ${exec.termEndYear}` : '—'}
      </span>
    </div>
  );
}
