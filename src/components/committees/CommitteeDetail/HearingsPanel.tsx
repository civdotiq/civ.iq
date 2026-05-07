import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import type { CommitteeActivityMeeting } from '@/lib/services/committee-activity.service';
import { PanelHeader } from './PanelHeader';
import { formatDate } from './helpers';

interface HearingsPanelProps {
  meetings: CommitteeActivityMeeting[];
  fetchedAt: string;
}

export function HearingsPanel({ meetings, fetchedAt }: HearingsPanelProps) {
  if (meetings.length === 0) {
    return (
      <section>
        <PanelHeader
          eyebrow="Hearings &amp; markups"
          title="Recent meetings"
          source={{ name: 'Congress.gov', id: 'committee meetings' }}
        />
        <CqPlainReading label="DATA UNAVAILABLE.">
          Congress.gov has not returned recent meetings for this committee. Hearings and markups
          appear here once the chamber publishes them.
        </CqPlainReading>
      </section>
    );
  }

  const sorted = [...meetings].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <section>
      <PanelHeader
        eyebrow={`As of ${formatDate(fetchedAt)} · ${meetings.length} recent`}
        title="Recent hearings &amp; markups"
        source={{ name: 'Congress.gov', id: 'committee meetings' }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px minmax(0, 1fr) 130px 110px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['Date', 'Title', 'Type', 'Event ID'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {sorted.map(m => (
        <Row key={m.eventId} meeting={m} />
      ))}
    </section>
  );
}

function Row({ meeting }: { meeting: CommitteeActivityMeeting }) {
  const variant: 'info' | 'd' | 'ink' = meeting.type.toLowerCase().includes('markup')
    ? 'd'
    : 'info';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px minmax(0, 1fr) 130px 110px',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDate(meeting.date)}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--fg1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={meeting.title}
      >
        {meeting.title || '(Untitled meeting)'}
      </span>
      <CqChip variant={variant} filled={false} size="sm">
        {meeting.type || 'Meeting'}
      </CqChip>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
        }}
      >
        {meeting.eventId}
      </span>
    </div>
  );
}
