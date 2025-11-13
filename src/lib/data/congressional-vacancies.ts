/**
 * Congressional Vacancies Tracker
 * Tracks known vacant congressional seats and special elections
 *
 * This file should be updated when:
 * - A member dies, resigns, or is expelled
 * - A special election is scheduled
 * - A special election winner is sworn in
 *
 * Data source: Manual updates based on news + congress.gov
 */

export interface CongressionalVacancy {
  state: string;
  district: string; // "07" for House, null for Senate
  chamber: 'House' | 'Senate';
  vacantSince: string; // ISO date
  reason: 'death' | 'resignation' | 'expulsion' | 'other';
  previousMember: {
    name: string;
    party: string;
    bioguideId?: string;
  };
  specialElection?: {
    date: string; // ISO date
    candidates?: Array<{
      name: string;
      party: string;
    }>;
    winner?: {
      name: string;
      party: string;
      swornInDate?: string; // ISO date
    };
  };
  notes?: string;
}

/**
 * Current congressional vacancies (119th Congress)
 * Last updated: November 13, 2025
 */
export const CONGRESSIONAL_VACANCIES: CongressionalVacancy[] = [
  {
    state: 'AZ',
    district: '07',
    chamber: 'House',
    vacantSince: '2025-03-13',
    reason: 'death',
    previousMember: {
      name: 'Raúl Grijalva',
      party: 'Democrat',
      bioguideId: 'G000551',
    },
    specialElection: {
      date: '2025-09-23',
      winner: {
        name: 'Adelita Grijalva',
        party: 'Democrat',
        swornInDate: '2025-11-12',
      },
    },
    notes: 'Seat filled Nov 12, 2025. Awaiting congress-legislators data update.',
  },
  {
    state: 'TN',
    district: '07',
    chamber: 'House',
    vacantSince: '2025-07-20',
    reason: 'resignation',
    previousMember: {
      name: 'Mark Green',
      party: 'Republican',
      bioguideId: 'G000590',
    },
    specialElection: {
      date: '2025-12-02',
      candidates: [
        { name: 'Matt Van Epps', party: 'Republican' },
        { name: 'Aftyn Behn', party: 'Democrat' },
      ],
    },
    notes: 'Special election December 2, 2025. Seat currently vacant.',
  },
];

/**
 * Check if a district is currently vacant
 */
export function isDistrictVacant(state: string, district: string | null): boolean {
  return CONGRESSIONAL_VACANCIES.some(
    v =>
      v.state === state &&
      v.district === district &&
      (!v.specialElection?.winner?.swornInDate ||
        new Date(v.specialElection.winner.swornInDate) > new Date())
  );
}

/**
 * Get vacancy information for a district
 */
export function getVacancyInfo(
  state: string,
  district: string | null
): CongressionalVacancy | undefined {
  return CONGRESSIONAL_VACANCIES.find(
    v =>
      v.state === state &&
      v.district === district &&
      (!v.specialElection?.winner?.swornInDate ||
        new Date(v.specialElection.winner.swornInDate) > new Date())
  );
}

/**
 * Get all current vacancies
 */
export function getAllVacancies(): CongressionalVacancy[] {
  return CONGRESSIONAL_VACANCIES.filter(
    v =>
      !v.specialElection?.winner?.swornInDate ||
      new Date(v.specialElection.winner.swornInDate) > new Date()
  );
}

/**
 * Check if vacancy is filled (winner sworn in)
 */
export function isVacancyFilled(vacancy: CongressionalVacancy): boolean {
  if (!vacancy.specialElection?.winner?.swornInDate) {
    return false;
  }
  return new Date(vacancy.specialElection.winner.swornInDate) <= new Date();
}

/**
 * Format vacancy message for API responses
 */
export function formatVacancyMessage(vacancy: CongressionalVacancy): string {
  if (isVacancyFilled(vacancy)) {
    return `${vacancy.state}-${vacancy.district} was recently filled on ${vacancy.specialElection?.winner?.swornInDate}. Data will update automatically within a few days.`;
  }

  if (vacancy.specialElection) {
    const electionDate = new Date(vacancy.specialElection.date);
    const isPast = electionDate < new Date();

    if (isPast) {
      return `${vacancy.state}-${vacancy.district} is currently vacant. Special election held ${vacancy.specialElection.date}, awaiting results.`;
    } else {
      return `${vacancy.state}-${vacancy.district} is currently vacant. Special election scheduled for ${vacancy.specialElection.date}.`;
    }
  }

  return `${vacancy.state}-${vacancy.district} is currently vacant. Previous representative: ${vacancy.previousMember.name} (${vacancy.previousMember.party}).`;
}
