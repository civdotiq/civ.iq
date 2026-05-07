import Link from 'next/link';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import type { CommitteeActivityBill } from '@/lib/services/committee-activity.service';
import { PanelHeader } from './PanelHeader';
import { formatDate } from './helpers';

interface BillsPanelProps {
  bills: CommitteeActivityBill[];
  congress: string;
}

export function BillsPanel({ bills, congress }: BillsPanelProps) {
  if (bills.length === 0) {
    return (
      <section>
        <PanelHeader
          eyebrow={`${congress} Congress · bills referred`}
          title="Recent bills"
          source={{ name: 'Congress.gov', id: 'committee bills' }}
        />
        <CqPlainReading label="DATA UNAVAILABLE.">
          Congress.gov has not returned bills referred to this committee in the recent window. The
          listing reappears once new bills are referred or the chamber clerk updates the feed.
        </CqPlainReading>
      </section>
    );
  }

  return (
    <section>
      <PanelHeader
        eyebrow={`${congress} Congress · ${bills.length} recent`}
        title="Recently referred bills"
        source={{ name: 'Congress.gov', id: 'committee bills' }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px minmax(0, 1fr) 130px 110px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['Bill', 'Title', 'Status', 'Date'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {bills.map(b => (
        <Row key={b.billId} bill={b} />
      ))}
    </section>
  );
}

function Row({ bill }: { bill: CommitteeActivityBill }) {
  const billHref = billPath(bill);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px minmax(0, 1fr) 130px 110px',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
      }}
    >
      <Link
        href={billHref}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--civiq-blue-active)',
          textDecoration: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {bill.billNumber}
      </Link>
      <Link
        href={billHref}
        style={{
          fontSize: 13,
          color: 'var(--fg1)',
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={bill.title}
      >
        {bill.title || '(Untitled bill)'}
      </Link>
      <CqChip variant="info" filled={false} size="sm">
        {bill.status || '—'}
      </CqChip>
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDate(bill.introducedDate)}
      </span>
    </div>
  );
}

function billPath(bill: CommitteeActivityBill): string {
  // billId from the activity service is typically formatted like "hr-1234-119"
  // The civic-side bill route accepts the canonical billId slug.
  return `/bill/${bill.billId}`;
}
