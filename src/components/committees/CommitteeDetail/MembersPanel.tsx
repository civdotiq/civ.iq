import Link from 'next/link';
import { CqChip, CqLabel, CqPlainReading, CqPortrait } from '@/components/cq';
import type { Committee, CommitteeMember } from '@/types/committee';
import { PanelHeader } from './PanelHeader';
import { countByParty, sortedMembers } from './helpers';
import { partyKey } from './types';

interface MembersPanelProps {
  committee: Committee;
}

const TILE_SIZE = 80;

export function MembersPanel({ committee }: MembersPanelProps) {
  const members = sortedMembers(committee.members ?? []);
  const total = members.length;

  if (total === 0) {
    return (
      <section>
        <PanelHeader
          eyebrow={`${committee.chamber} · roster`}
          title="Members"
          source={{ name: 'Congress.gov', id: 'committee members' }}
        />
        <CqPlainReading label="DATA UNAVAILABLE.">
          Congress.gov has not published a member roster for this committee yet. Once the chamber
          clerk posts the roster, members appear here.
        </CqPlainReading>
      </section>
    );
  }

  const counts = countByParty(members);

  return (
    <section>
      <PanelHeader
        eyebrow={`${committee.chamber} · ${total} members`}
        title="Members"
        source={{ name: 'Congress.gov', id: 'committee members' }}
        right={
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {counts.d}D · {counts.r}R{counts.i > 0 ? ` · ${counts.i}I` : ''}
          </span>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${TILE_SIZE}px)`,
          gap: 12,
          padding: '14px 0 6px',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {members.map(m => (
          <MemberTile key={m.representative.bioguideId} member={m} />
        ))}
      </div>

      <p
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 12,
          letterSpacing: '0.04em',
        }}
      >
        Chair and ranking member listed first. Click any tile for the full official record.
      </p>
    </section>
  );
}

function MemberTile({ member }: { member: CommitteeMember }) {
  const r = member.representative;
  const pKey = partyKey(r.party);
  const districtLabel = r.district ? `${r.state}-${String(r.district).padStart(2, '0')}` : r.state;
  const role = member.role;
  const lastName = r.fullName?.last ?? r.lastName ?? r.name.split(' ').slice(-1)[0] ?? r.name;
  const portraitSrc = `/api/representative-photo/${r.bioguideId.toUpperCase()}`;

  return (
    <Link
      href={`/representative/${r.bioguideId}`}
      title={`${r.name} (${r.party} · ${districtLabel})${role !== 'Member' ? ` — ${role}` : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <CqPortrait
          name={r.name}
          size={TILE_SIZE}
          party={pKey}
          src={portraitSrc}
          alt={`${r.name} portrait`}
        />
        {(role === 'Chair' || role === 'Ranking Member' || role === 'Vice Chair') && (
          <div
            style={{
              position: 'absolute',
              left: 6,
              right: 0,
              bottom: 0,
              padding: '2px 0',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              textAlign: 'center',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {role === 'Ranking Member' ? 'Ranking' : role}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: TILE_SIZE,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {lastName}
      </span>
      <span
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          letterSpacing: '0.04em',
        }}
      >
        {pKey === 'd' ? 'D' : pKey === 'r' ? 'R' : 'I'} · {districtLabel}
      </span>
    </Link>
  );
}

interface CompositionAsideProps {
  committee: Committee;
}

export function CompositionAside({ committee }: CompositionAsideProps) {
  const members = committee.members ?? [];
  const total = members.length;
  if (total === 0) return null;
  const counts = countByParty(members);
  const rows: ReadonlyArray<{ label: string; n: number; color: string }> = [
    { label: 'Democrats', n: counts.d, color: 'var(--party-democrat)' },
    { label: 'Republicans', n: counts.r, color: 'var(--civiq-red)' },
    { label: 'Independent', n: counts.i, color: 'var(--data-vlau)' },
  ];

  return (
    <div style={{ border: '2px solid var(--ink)', padding: 18 }}>
      <CqLabel>Composition</CqLabel>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows
          .filter(r => r.n > 0)
          .map(r => {
            const pct = Math.round((r.n / total) * 100);
            return (
              <div key={r.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {r.n} · {pct}%
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', marginTop: 4 }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: r.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function LeadershipCallout({ committee }: { committee: Committee }) {
  const chair = committee.leadership.chair?.representative;
  const ranking = committee.leadership.rankingMember?.representative;
  if (!chair && !ranking) return null;
  return (
    <div
      style={{
        borderLeft: '6px solid var(--civiq-blue)',
        background: 'var(--bg2)',
        padding: '14px 16px',
        marginTop: 14,
      }}
    >
      <CqLabel>Leadership</CqLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {chair && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CqChip variant="ink" size="sm">
                Chair
              </CqChip>
            </div>
            <Link
              href={`/representative/${chair.bioguideId}`}
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--fg1)',
                textDecoration: 'none',
              }}
            >
              {chair.name}
            </Link>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 2,
              }}
            >
              {chair.party} · {chair.state}
              {chair.district ? `-${chair.district}` : ''}
            </div>
          </div>
        )}
        {ranking && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CqChip variant="ink" size="sm" filled={false}>
                Ranking
              </CqChip>
            </div>
            <Link
              href={`/representative/${ranking.bioguideId}`}
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--fg1)',
                textDecoration: 'none',
              }}
            >
              {ranking.name}
            </Link>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 2,
              }}
            >
              {ranking.party} · {ranking.state}
              {ranking.district ? `-${ranking.district}` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
