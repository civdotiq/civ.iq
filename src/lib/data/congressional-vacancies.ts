/**
 * Congressional Vacancies Tracker
 * Tracks vacant congressional seats and special elections for the 119th Congress.
 *
 * Data lives in vacancies.json (human-editable; also written by the weekly
 * Wikipedia sync script at scripts/sync-vacancies.ts). This module exports
 * typed helpers over that data.
 *
 * Source of truth:
 * https://en.wikipedia.org/wiki/119th_United_States_Congress#Changes_in_membership
 */

import vacanciesData from './vacancies.json';

export type VacancyReason =
  | 'death'
  | 'resignation'
  | 'expulsion'
  | 'executive_appointment'
  | 'other';

export type SuccessorMethod = 'appointed' | 'elected';

export interface VacancyMember {
  name: string;
  party: string;
  bioguideId?: string;
}

export interface VacancySpecialElection {
  date: string | null;
  runoffDate?: string | null;
  notes?: string;
}

export interface VacancySuccessor extends VacancyMember {
  installedDate: string | null;
  method: SuccessorMethod;
  notes?: string;
}

export interface CongressionalVacancy {
  state: string;
  chamber: 'House' | 'Senate';
  district: string | null;
  senateClass: '1' | '2' | '3' | null;
  vacantSince: string | null;
  reason: VacancyReason;
  reasonDetail?: string;
  previousMember: VacancyMember;
  specialElection?: VacancySpecialElection;
  successor?: VacancySuccessor;
  notes?: string;
}

interface VacanciesFile {
  congress: number;
  lastUpdated: string;
  source: string;
  vacancies: CongressionalVacancy[];
}

const data = vacanciesData as VacanciesFile;

export const CONGRESSIONAL_VACANCIES: readonly CongressionalVacancy[] = data.vacancies;
export const VACANCIES_LAST_UPDATED: string = data.lastUpdated;

function hasSuccessorInstalled(v: CongressionalVacancy): boolean {
  if (!v.successor?.installedDate) return false;
  return new Date(v.successor.installedDate) <= new Date();
}

export function isVacancyFilled(vacancy: CongressionalVacancy): boolean {
  return hasSuccessorInstalled(vacancy);
}

export function isDistrictVacant(state: string, district: string | null): boolean {
  return CONGRESSIONAL_VACANCIES.some(
    v =>
      v.chamber === 'House' &&
      v.state === state &&
      v.district === district &&
      !hasSuccessorInstalled(v)
  );
}

export function getVacancyInfo(
  state: string,
  district: string | null
): CongressionalVacancy | undefined {
  return CONGRESSIONAL_VACANCIES.find(
    v =>
      v.chamber === 'House' &&
      v.state === state &&
      v.district === district &&
      !hasSuccessorInstalled(v)
  );
}

export function getSenateVacancy(
  state: string,
  senateClass: '1' | '2' | '3'
): CongressionalVacancy | undefined {
  return CONGRESSIONAL_VACANCIES.find(
    v =>
      v.chamber === 'Senate' &&
      v.state === state &&
      v.senateClass === senateClass &&
      !hasSuccessorInstalled(v)
  );
}

export function getAllVacancies(): CongressionalVacancy[] {
  return CONGRESSIONAL_VACANCIES.filter(v => !hasSuccessorInstalled(v));
}

export function getVacancyHistory(state: string, district: string | null): CongressionalVacancy[] {
  return CONGRESSIONAL_VACANCIES.filter(v => v.state === state && v.district === district);
}

export type MemberStatus =
  | 'active'
  | 'pending_resignation'
  | 'resigned'
  | 'expelled'
  | 'deceased'
  | 'retired';

export interface MemberStatusInfo {
  status: MemberStatus;
  detail?: string;
  effectiveDate?: string | null;
  vacancy?: CongressionalVacancy;
}

interface MemberLookupArgs {
  bioguideId?: string;
  name?: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: string | null;
  senateClass?: '1' | '2' | '3' | null;
  isHistorical?: boolean;
}

function vacancyMatchesMember(v: CongressionalVacancy, m: MemberLookupArgs): boolean {
  if (v.chamber !== m.chamber || v.state !== m.state) return false;
  if (m.chamber === 'House') {
    const a = (v.district ?? '').replace(/^0+/, '');
    const b = (m.district ?? '').replace(/^0+/, '');
    if (a !== b) return false;
  } else if (m.senateClass && v.senateClass && v.senateClass !== m.senateClass) {
    return false;
  }
  if (m.bioguideId && v.previousMember.bioguideId) {
    return v.previousMember.bioguideId === m.bioguideId;
  }
  if (m.name) {
    return v.previousMember.name.toLowerCase() === m.name.toLowerCase();
  }
  return true;
}

function statusFromReason(reason: VacancyReason): MemberStatus {
  switch (reason) {
    case 'death':
      return 'deceased';
    case 'expulsion':
      return 'expelled';
    case 'resignation':
    case 'executive_appointment':
      return 'resigned';
    default:
      return 'resigned';
  }
}

export function getMemberStatus(member: MemberLookupArgs): MemberStatusInfo {
  const match = CONGRESSIONAL_VACANCIES.find(v => vacancyMatchesMember(v, member));
  if (match) {
    const pending = !match.vacantSince || new Date(match.vacantSince) > new Date();
    return {
      status: pending ? 'pending_resignation' : statusFromReason(match.reason),
      detail: match.reasonDetail,
      effectiveDate: match.vacantSince,
      vacancy: match,
    };
  }
  if (member.isHistorical) {
    return { status: 'retired' };
  }
  return { status: 'active' };
}

export function formatVacancyMessage(vacancy: CongressionalVacancy): string {
  const seatLabel =
    vacancy.chamber === 'Senate'
      ? `${vacancy.state} Senate (Class ${vacancy.senateClass})`
      : `${vacancy.state}-${vacancy.district}`;

  if (isVacancyFilled(vacancy)) {
    return `${seatLabel} was filled on ${vacancy.successor?.installedDate} by ${vacancy.successor?.name} (${vacancy.successor?.party}).`;
  }

  const electionDate = vacancy.specialElection?.date;
  if (electionDate) {
    const isPast = new Date(electionDate) < new Date();
    if (isPast) {
      return `${seatLabel} is currently vacant. Special election held ${electionDate}; awaiting results or swearing-in.`;
    }
    return `${seatLabel} is currently vacant. Special election scheduled for ${electionDate}.`;
  }

  return `${seatLabel} is currently vacant. Previous representative: ${vacancy.previousMember.name} (${vacancy.previousMember.party}). Special election date TBD.`;
}
