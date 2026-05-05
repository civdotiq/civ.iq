import type { EnhancedRepresentative } from '@/types/representative';

export type PartyKey = 'd' | 'r' | 'i';

export function partyKey(party: string | undefined): PartyKey {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

export function partyLong(party: string | undefined): string {
  const k = partyKey(party);
  if (k === 'd') return 'Democratic';
  if (k === 'r') return 'Republican';
  return 'Independent';
}

export function partyColorVar(key: PartyKey): string {
  if (key === 'd') return 'var(--civiq-green)';
  if (key === 'r') return 'var(--civiq-red)';
  return 'var(--data-vlau)';
}

export interface ProfileHybridProps {
  representative: EnhancedRepresentative;
}
