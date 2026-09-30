import type { Bill } from '@/types/bill';
import { CqPlainReading } from '@/components/cq';
import { RepLink } from '@/components/shared/links/EntityLinks';
import { PanelHeader } from './PanelHeader';
import { ExpandableList } from './ExpandableList';
import { formatDate } from './helpers';

interface CosponsorsPanelProps {
  bill: Bill;
}

export function CosponsorsPanel({ bill }: CosponsorsPanelProps) {
  const cosponsors = bill.cosponsors ?? [];

  return (
    <section id="cosponsors" style={{ marginTop: 32, scrollMarginTop: 80 }}>
      <PanelHeader
        eyebrow={`${cosponsors.length} member${cosponsors.length === 1 ? '' : 's'} · in order joined`}
        title="Co-sponsors"
        source={{ name: 'Congress.gov', id: 'cosponsors' }}
      />
      {cosponsors.length === 0 ? (
        <CqPlainReading label="NO CO-SPONSORS.">
          No member has signed on as a co-sponsor yet. Members can join while the bill is pending.
        </CqPlainReading>
      ) : (
        <ExpandableList
          initial={10}
          noun="co-sponsors"
          containerStyle={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            borderTop: '2px solid var(--ink)',
          }}
          items={cosponsors.map(c => {
            const rep = c.representative;
            const party = rep.party?.toUpperCase().charAt(0) ?? '';
            const district = rep.district ? `-${String(rep.district).padStart(2, '0')}` : '';
            return (
              <div
                key={rep.bioguideId || rep.name}
                style={{
                  padding: '12px 12px 12px 0',
                  borderBottom: '1px solid var(--line)',
                  opacity: c.withdrawn ? 0.6 : 1,
                  minWidth: 0,
                }}
              >
                <RepLink
                  bioguideId={rep.bioguideId}
                  name={rep.name}
                  className="text-sm font-bold block truncate"
                />
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: 2,
                  }}
                >
                  {party} · {rep.state}
                  {district} · {c.withdrawn ? 'Withdrawn' : `Joined ${formatDate(c.date)}`}
                </div>
              </div>
            );
          })}
        />
      )}
    </section>
  );
}
