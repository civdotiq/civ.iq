/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface StateChamberSummary {
  name: string;
  title: string;
  totalSeats: number;
  democraticSeats: number;
  republicanSeats: number;
  otherSeats: number;
}

export interface StateLegislatureSession {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'in-recess' | 'adjourned' | 'upcoming';
  daysIntoSession?: number;
  daysUntilAdjournment?: number;
}

export interface StateLegislatureCalendarEvent {
  id: string;
  name: string;
  start_date: string;
  classification?: string;
  location?: { name?: string };
}

export interface StateLegislatureRecentBill {
  id: string;
  identifier: string;
  title: string;
  chamber: 'upper' | 'lower';
  status: string;
  sponsorName?: string;
  sponsorParty?: 'd' | 'r' | 'i';
  sponsorDistrict?: string;
  lastActionDate?: string;
}

export interface StateLegislaturePageData {
  stateCode: string;
  stateName: string;
  upper: StateChamberSummary | null;
  lower: StateChamberSummary | null;
  totalSeats: number;
  isUnicameral: boolean;
  session: StateLegislatureSession | null;
  upcomingEvents: StateLegislatureCalendarEvent[];
  recentBills: StateLegislatureRecentBill[];
  fetchedAt: string;
}
