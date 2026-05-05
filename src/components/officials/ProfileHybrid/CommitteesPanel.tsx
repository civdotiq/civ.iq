import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { EnhancedRepresentative } from '@/types/representative';

interface CommitteesPanelProps {
  representative: EnhancedRepresentative;
}

function chipVariant(role: string | undefined): 'd' | 'r' | 'i' | 'info' | 'warn' | 'ink' {
  if (!role) return 'ink';
  const r = role.toLowerCase();
  if (r.includes('chair') && !r.includes('ranking')) return 'info';
  if (r.includes('ranking')) return 'warn';
  return 'ink';
}

interface CommitteeWithId {
  name: string;
  role?: string;
  id?: string;
  thomas_id?: string;
}

export function CommitteesPanel({ representative: r }: CommitteesPanelProps) {
  const committees = (r.committees ?? []) as CommitteeWithId[];
  const caucuses = r.caucuses ?? [];

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
          source={{ name: 'Congress.gov', id: 'committees' }}
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
          committees.map((c, i) => {
            const href = c.id
              ? `/committee/${c.id}`
              : c.thomas_id
                ? `/committee/${c.thomas_id}`
                : null;
            return (
              <div
                key={`${c.name}-${i}`}
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
                  <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {href ? (
                      <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </h4>
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
              </div>
            );
          })
        )}
      </div>

      <aside>
        <div style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Caucuses{caucuses.length > 0 ? ` · ${caucuses.length}` : ''}</CqLabel>
          {caucuses.length === 0 ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Caucus membership data unavailable for this member.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {caucuses.map((c, i) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    gap: 8,
                    paddingBottom: 6,
                    borderBottom: i === caucuses.length - 1 ? 0 : '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
