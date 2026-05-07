/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqChip, CqLabel } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

interface CommitteesPanelProps {
  legislator: EnhancedStateLegislator;
}

function chipVariant(role: string | undefined): 'info' | 'warn' | 'ink' {
  if (!role) return 'ink';
  const r = role.toLowerCase();
  if (r.includes('chair') && !r.includes('ranking')) return 'info';
  if (r.includes('ranking')) return 'warn';
  return 'ink';
}

export function CommitteesPanel({ legislator: l }: CommitteesPanelProps) {
  const committees = l.committees ?? [];
  const leadership = l.leadershipRoles ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <PanelHeader
          eyebrow={
            committees.length > 0
              ? `${committees.length} committee assignment${committees.length === 1 ? '' : 's'}`
              : 'Committee service'
          }
          title="Committee service"
          source={{ name: 'OpenStates', id: 'committees' }}
        />
        {committees.length === 0 ? (
          <div
            style={{
              border: '2px solid var(--ink)',
              padding: 24,
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Data unavailable — no committee assignments on file.
          </div>
        ) : (
          committees.map((c, i) => (
            <div
              key={`${c.id || c.name}-${i}`}
              style={{
                borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
                padding: '16px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 12,
                }}
              >
                <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{c.name}</h4>
                {c.role && (
                  <CqChip
                    variant={chipVariant(c.role)}
                    filled={chipVariant(c.role) !== 'ink'}
                    size="sm"
                  >
                    {c.role}
                  </CqChip>
                )}
              </div>
              {c.chamber && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 4,
                  }}
                >
                  {c.chamber === 'upper' ? 'Senate' : 'Lower chamber'}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <aside>
        <div style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Leadership{leadership.length > 0 ? ` · ${leadership.length}` : ''}</CqLabel>
          {leadership.length === 0 ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              No leadership roles on file.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leadership.map((role, i) => (
                <div
                  key={`${role.title}-${i}`}
                  style={{
                    display: 'flex',
                    gap: 8,
                    paddingBottom: 6,
                    borderBottom: i === leadership.length - 1 ? 0 : '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div>{role.title}</div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--fg3)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {role.chamber === 'upper' ? 'Senate' : 'House'} · {role.startDate}
                      {role.endDate ? `–${role.endDate}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
