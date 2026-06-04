import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { buildBillUrl } from '@/lib/helpers/url-builders';
import type { BillResult } from './data';

interface TopMatchBillProps {
  bill: BillResult;
}

function billHref(b: BillResult): string {
  // Canonical <congress>-<type>-<number> slug — the prior type-first form
  // (hr8814-119) is only "recoverable" and 308-redirects.
  return buildBillUrl(b.congress, b.type, b.number);
}

export function TopMatchBill({ bill }: TopMatchBillProps) {
  const number = bill.number;
  const numericPart = number.replace(/[^0-9]/g, '');
  const typePart = number.replace(/[0-9\s]/g, '').toUpperCase();
  return (
    <Link
      href={billHref(bill)}
      style={{
        border: '2px solid var(--ink)',
        display: 'grid',
        gridTemplateColumns: '110px 1fr 220px',
        marginBottom: 28,
        textDecoration: 'none',
        color: 'var(--fg1)',
        background: 'var(--bg1)',
      }}
    >
      <div
        style={{
          background: 'var(--bg2)',
          borderRight: '2px solid var(--ink)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--bg2) 0 8px, var(--bg3) 8px 16px)',
          position: 'relative',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: 'var(--civiq-blue)',
          }}
        />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Bill
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            fontWeight: 700,
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {typePart} {numericPart}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg3)',
            marginTop: 6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bill.congress}th
        </div>
      </div>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <CqChip variant="info" filled={false} size="sm">
            Top match
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Title match
          </CqChip>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {bill.title}
        </div>
      </div>
      <div
        style={{
          padding: '20px 18px',
          borderLeft: '1px solid var(--line)',
          background: 'var(--bg2)',
        }}
      >
        <CqLabel>Latest action</CqLabel>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--fg1)',
            lineHeight: 1.05,
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bill.updateDate ?? 'Unavailable'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--civiq-blue)',
            fontFamily: 'var(--font-primary)',
            marginTop: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          View bill →
        </div>
      </div>
    </Link>
  );
}
