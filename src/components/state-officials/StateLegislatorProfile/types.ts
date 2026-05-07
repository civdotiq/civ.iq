/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedStateLegislator } from '@/types/state-legislature';

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

export interface StateLegislatorProfileProps {
  legislator: EnhancedStateLegislator;
  /** Base64-encoded OpenStates ID, used to fetch panel data */
  legislatorIdBase64: string;
  /** Two-letter state code (uppercase), e.g. "NY" */
  stateCode: string;
  /** Human state name, e.g. "New York" */
  stateName: string;
}
