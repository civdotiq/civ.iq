import Link from 'next/link';
import { CqLabel, CqPlainReading } from '@/components/cq';
import type { Committee, Subcommittee } from '@/types/committee';
import { PanelHeader } from './PanelHeader';

interface SubsPanelProps {
  committee: Committee;
}

export function SubsPanel({ committee }: SubsPanelProps) {
  const subs = committee.subcommittees ?? [];

  if (subs.length === 0) {
    return (
      <section>
        <PanelHeader
          eyebrow={`${committee.chamber} · subcommittees`}
          title="Subcommittees"
          source={{ name: 'Congress.gov', id: 'subcommittees' }}
        />
        <CqPlainReading label="NO SUBCOMMITTEES.">
          This committee does not have subcommittees. Some standing committees handle their work in
          the full committee rather than splitting it into subordinate panels.
        </CqPlainReading>
      </section>
    );
  }

  return (
    <section>
      <PanelHeader
        eyebrow={`${committee.chamber} · ${subs.length} subcommittee${subs.length === 1 ? '' : 's'}`}
        title="Subcommittees"
        source={{ name: 'Congress.gov', id: 'subcommittees' }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 0,
          border: '2px solid var(--ink)',
        }}
      >
        {subs.map((s, i) => (
          <SubCard key={s.id} sub={s} index={i} total={subs.length} />
        ))}
      </div>
    </section>
  );
}

function SubCard({ sub, index, total }: { sub: Subcommittee; index: number; total: number }) {
  const memberCount = sub.members?.length ?? 0;
  const isLastRow = index >= total - 2 + (total % 2);
  const borderRight = index % 2 === 0 ? '1px solid var(--line)' : 0;
  const borderBottom = isLastRow ? 0 : '1px solid var(--line)';
  const chairName = sub.chair?.name;
  const rankingName = sub.rankingMember?.name;

  return (
    <Link
      href={`/committee/${sub.id}`}
      style={{
        padding: '18px 20px',
        borderRight,
        borderBottom,
        textDecoration: 'none',
        color: 'var(--fg1)',
        display: 'block',
      }}
    >
      <CqLabel>Sub · {String(index + 1).padStart(2, '0')}</CqLabel>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, lineHeight: 1.25 }}>
        {sub.name}
      </div>
      {(chairName || rankingName) && (
        <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 6 }}>
          {chairName ? `Chair: ${chairName}` : ''}
          {chairName && rankingName ? ' · ' : ''}
          {rankingName ? `Ranking: ${rankingName}` : ''}
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {memberCount > 0
          ? `${memberCount} member${memberCount === 1 ? '' : 's'}`
          : 'Roster pending'}
        {sub.focus ? ` · ${sub.focus}` : ''}
      </div>
    </Link>
  );
}
