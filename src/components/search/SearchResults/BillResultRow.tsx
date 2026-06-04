import Link from 'next/link';
import { CqChip, type CqChipVariant } from '@/components/cq';
import { buildBillUrl } from '@/lib/helpers/url-builders';
import type { BillResult } from './data';

interface BillResultRowProps {
  b: BillResult;
  first: boolean;
}

function billHref(b: BillResult): string {
  // Canonical <congress>-<type>-<number> slug — the prior type-first form
  // (hr8814-119) is only "recoverable" and 308-redirects.
  return buildBillUrl(b.congress, b.type, b.number);
}

function statusFor(b: BillResult): { label: string; variant: CqChipVariant; filled: boolean } {
  const s = (b.status ?? '').toLowerCase();
  if (s.includes('became law') || s.includes('enacted'))
    return { label: 'Became law', variant: 'd', filled: true };
  if (s.includes('failed') || s.includes('vetoed'))
    return { label: 'Failed', variant: 'r', filled: true };
  if (s.includes('passed')) return { label: 'Passed', variant: 'info', filled: false };
  if (s.includes('introduced')) return { label: 'Introduced', variant: 'ink', filled: false };
  return { label: 'Active', variant: 'info', filled: false };
}

export function BillResultRow({ b, first }: BillResultRowProps) {
  const status = statusFor(b);
  return (
    <Link
      href={billHref(b)}
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 130px 110px 30px',
        gap: 16,
        padding: '14px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {b.number}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{b.title}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
            letterSpacing: '0.04em',
          }}
        >
          {b.congress}th Congress · Title match
        </div>
      </div>
      <CqChip variant={status.variant} filled={status.filled} size="sm">
        {status.label}
      </CqChip>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {b.updateDate ?? '—'}
      </span>
      <span style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }} aria-hidden>
        →
      </span>
    </Link>
  );
}
