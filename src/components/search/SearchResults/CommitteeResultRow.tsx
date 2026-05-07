import Link from 'next/link';
import { CqChip } from '@/components/cq';
import type { CommitteeResult } from './data';

interface CommitteeResultRowProps {
  c: CommitteeResult;
  first: boolean;
}

export function CommitteeResultRow({ c, first }: CommitteeResultRowProps) {
  return (
    <Link
      href={`/committee/${c.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 30px',
        gap: 16,
        padding: '14px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
            letterSpacing: '0.04em',
          }}
        >
          {c.id}
        </div>
      </div>
      <CqChip variant="ink" filled={false} size="sm">
        {c.chamber}
      </CqChip>
      <span style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }} aria-hidden>
        →
      </span>
    </Link>
  );
}
