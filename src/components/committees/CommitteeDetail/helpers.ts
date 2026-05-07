import type { Committee, CommitteeMember } from '@/types/committee';
import type { PartyKey } from './types';

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatYear(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getUTCFullYear());
}

export function countByParty(members: CommitteeMember[]): {
  d: number;
  r: number;
  i: number;
} {
  let d = 0;
  let r = 0;
  let i = 0;
  for (const m of members) {
    const p = (m.representative.party ?? '').toLowerCase();
    if (p.startsWith('d')) d += 1;
    else if (p.startsWith('r')) r += 1;
    else i += 1;
  }
  return { d, r, i };
}

export function committeeAbbr(committee: Committee, fallbackId: string): string {
  const name = committee.name ?? '';
  const stripped = name
    .replace(/^House Committee on (the )?/i, '')
    .replace(/^Senate Committee on (the )?/i, '')
    .replace(/^House Permanent Select Committee on /i, '')
    .replace(/^House Select Committee on /i, '')
    .replace(/^Senate Select Committee on /i, '')
    .replace(/^Joint Committee on (the )?/i, '');
  const head = stripped.split(/[ ,]/)[0] ?? '';
  if (head.length >= 3) return head.slice(0, 4).toUpperCase();
  return fallbackId.slice(0, 4).toUpperCase();
}

export function partyChipVariant(key: PartyKey): 'd' | 'r' | 'i' {
  return key;
}

export function rolePriority(role: CommitteeMember['role']): number {
  if (role === 'Chair') return 0;
  if (role === 'Ranking Member') return 1;
  if (role === 'Vice Chair') return 2;
  return 3;
}

export function sortedMembers(members: CommitteeMember[]): CommitteeMember[] {
  return [...members].sort((a, b) => {
    const ra = rolePriority(a.role);
    const rb = rolePriority(b.role);
    if (ra !== rb) return ra - rb;
    return a.representative.name.localeCompare(b.representative.name);
  });
}
