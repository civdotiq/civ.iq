import type { Bill, BillAction } from '@/types/bill';
import { CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { formatDate, timelineDotKind } from './helpers';

interface TimelinePanelProps {
  bill: Bill;
}

const DOT_COLOR: Record<ReturnType<typeof timelineDotKind>, string> = {
  pass: 'var(--civiq-green)',
  fail: 'var(--civiq-red)',
  sign: 'var(--civiq-blue)',
  intro: 'var(--fg1)',
  cmte: 'var(--fg2)',
  other: 'var(--fg2)',
};

export function TimelinePanel({ bill }: TimelinePanelProps) {
  const actions = bill.status.timeline ?? [];

  if (actions.length === 0) {
    return (
      <section style={{ marginTop: 32 }}>
        <PanelHeader
          eyebrow={`${bill.chamber} · ${bill.congress} Congress`}
          title="Legislative timeline"
          source={{ name: 'Congress.gov', id: 'actions' }}
        />
        <CqPlainReading label="DATA UNAVAILABLE.">
          Congress.gov has no recorded actions for this bill yet. The timeline appears once the
          chamber clerk publishes the first action.
        </CqPlainReading>
      </section>
    );
  }

  // Show actions oldest -> newest. Cap to 30 to keep the page scannable; the
  // full action history lives on Congress.gov via the source link.
  const ordered = [...actions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30);

  return (
    <section style={{ marginTop: 32 }}>
      <PanelHeader
        eyebrow={`${actions.length} official action${actions.length === 1 ? '' : 's'} · House + Senate`}
        title="Legislative timeline"
        source={{ name: 'Congress.gov', id: 'actions' }}
      />
      <div style={{ borderTop: '2px solid var(--ink)', paddingTop: 8 }}>
        {ordered.map((action, i) => (
          <TimelineRow
            key={`${action.date}-${i}`}
            action={action}
            isLast={i === ordered.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function TimelineRow({ action, isLast }: { action: BillAction; isLast: boolean }) {
  const kind = timelineDotKind(action);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 28px minmax(0, 1fr) 140px',
        gap: 0,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          paddingTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDate(action.date)}
      </span>
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          alignSelf: 'stretch',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            background: DOT_COLOR[kind],
            marginTop: 4,
            flexShrink: 0,
            border: '1px solid var(--ink)',
          }}
        />
        {!isLast && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              bottom: -14,
              left: '50%',
              width: 2,
              background: 'var(--ink)',
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{action.description}</div>
        {action.actionCode && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            Action code · {action.actionCode}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          textAlign: 'right',
          paddingTop: 4,
        }}
      >
        {action.chamber ?? '—'}
      </span>
    </div>
  );
}
