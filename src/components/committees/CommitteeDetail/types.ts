import type { Committee } from '@/types/committee';
import type {
  CommitteeActivityBill,
  CommitteeActivityMeeting,
} from '@/lib/services/committee-activity.service';

export type PartyKey = 'd' | 'r' | 'i';

export function partyKey(party: string | undefined): PartyKey {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

export interface CommitteeActivity {
  bills: CommitteeActivityBill[];
  meetings: CommitteeActivityMeeting[];
  /** When the saved hearing list was read; null when none is saved (never the render time). */
  fetchedAt: string | null;
}

export interface CommitteeDetailProps {
  committee: Committee;
  activity: CommitteeActivity;
  committeeId: string;
}
