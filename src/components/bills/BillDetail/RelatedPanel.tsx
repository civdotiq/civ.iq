import Link from 'next/link';
import type { Bill } from '@/types/bill';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { ExpandableList } from './ExpandableList';

interface RelatedPanelProps {
  bill: Bill;
}

export function RelatedPanel({ bill }: RelatedPanelProps) {
  const related = bill.relatedBills ?? [];

  return (
    <section style={{ marginTop: 32 }}>
      <PanelHeader
        eyebrow="Cross-referenced via Congress.gov subjects + companion identifiers"
        title="Related bills"
        source={{ name: 'Congress.gov', id: 'related-bills' }}
      />

      {related.length === 0 ? (
        <CqPlainReading label="NO RELATED BILLS.">
          Congress.gov lists no companion, identical, or successor measures to this bill.
        </CqPlainReading>
      ) : (
        <div role="table" aria-label="Related bills">
          <div
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: '120px minmax(0, 1fr) 140px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <CqLabel>Bill</CqLabel>
            <CqLabel>Title</CqLabel>
            <CqLabel>Relation</CqLabel>
          </div>
          <ExpandableList
            initial={30}
            noun="related bills"
            items={related.map(r => (
              <RelatedRow
                key={r.id ?? `${r.number}-${r.relationship}`}
                slug={r.id ?? relatedBillSlug(bill.congress, r.number)}
                billCongress={bill.congress}
                number={r.number}
                title={r.title}
                relation={r.relationship}
              />
            ))}
          />
        </div>
      )}
    </section>
  );
}

function RelatedRow({
  slug,
  billCongress,
  number,
  title,
  relation,
}: {
  slug: string | null;
  billCongress: string;
  number: string;
  title: string;
  relation: string;
}) {
  // Related bills can come from earlier Congresses — say so next to the number.
  const otherCongress = slug?.split('-')[0];
  const label =
    otherCongress && otherCongress !== billCongress ? `${number} (${otherCongress}th)` : number;
  return (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: '120px minmax(0, 1fr) 140px',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
      }}
    >
      {slug ? (
        <Link
          href={`/bill/${slug}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--civiq-blue-active)',
            fontVariantNumeric: 'tabular-nums',
            textDecoration: 'none',
          }}
        >
          {label}
        </Link>
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {label}
        </span>
      )}
      <span style={{ fontSize: 13 }}>{title}</span>
      <CqChip variant="info" filled={false} size="sm">
        {relation}
      </CqChip>
    </div>
  );
}

/** Fallback for cached bills without an id: "H.Con.Res. 87" → "<congress>-hconres-87". */
function relatedBillSlug(congress: string, number: string): string | null {
  const match = number.replace(/\./g, '').match(/^([A-Z]+)\s*(\d+)$/i);
  if (!match) return null;
  const type = match[1]?.toLowerCase().replace(/\./g, '');
  const num = match[2];
  if (!type || !num) return null;
  return `${congress}-${type}-${num}`;
}
