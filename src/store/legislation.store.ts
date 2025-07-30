/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Bill {
  id: string;
  congress: number;
  type: string;
  number: string;
  title: string;
  shortTitle?: string;
  summary?: string;
  sponsor: {
    bioguideId: string;
    name: string;
    party: string;
    state: string;
  };
  cosponsors: number;
  committees: string[];
  status: string;
  lastAction: {
    date: string;
    description: string;
  };
  introducedDate: string;
  subjects: string[];
  relatedBills: string[];
}

export interface Vote {
  id: string;
  billId?: string;
  date: string;
  chamber: 'house' | 'senate';
  question: string;
  result: string;
  yeas: number;
  nays: number;
  present: number;
  notVoting: number;
  representativeVote?: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

interface LegislationFilters {
  congress: number | null;
  chamber: 'all' | 'house' | 'senate';
  status: string;
  sponsor: string;
  subject: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface LegislationState {
  // Bills data
  bills: Bill[];
  selectedBill: Bill | null;
  billsLoading: boolean;
  billsError: string | null;

  // Votes data
  votes: Vote[];
  selectedVote: Vote | null;
  votesLoading: boolean;
  votesError: string | null;

  // Filters
  filters: LegislationFilters;

  // Actions - Bills
  setBills: (bills: Bill[]) => void;
  addBills: (bills: Bill[]) => void;
  setSelectedBill: (bill: Bill | null) => void;
  setBillsLoading: (loading: boolean) => void;
  setBillsError: (error: string | null) => void;

  // Actions - Votes
  setVotes: (votes: Vote[]) => void;
  addVotes: (votes: Vote[]) => void;
  setSelectedVote: (vote: Vote | null) => void;
  setVotesLoading: (loading: boolean) => void;
  setVotesError: (error: string | null) => void;

  // Actions - Filters
  setFilters: (filters: Partial<LegislationFilters>) => void;
  resetFilters: () => void;

  // Computed
  getFilteredBills: () => Bill[];
  getFilteredVotes: () => Vote[];
}

const initialFilters: LegislationFilters = {
  congress: null,
  chamber: 'all',
  status: '',
  sponsor: '',
  subject: '',
  dateRange: {
    start: null,
    end: null,
  },
};

export const useLegislationStore = create<LegislationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        bills: [],
        selectedBill: null,
        billsLoading: false,
        billsError: null,
        votes: [],
        selectedVote: null,
        votesLoading: false,
        votesError: null,
        filters: initialFilters,

        // Bill actions
        setBills: bills => set({ bills, billsError: null }, false, 'setBills'),

        addBills: newBills =>
          set(
            state => ({
              bills: [...state.bills, ...newBills],
              billsError: null,
            }),
            false,
            'addBills'
          ),

        setSelectedBill: selectedBill => set({ selectedBill }, false, 'setSelectedBill'),

        setBillsLoading: billsLoading => set({ billsLoading }, false, 'setBillsLoading'),

        setBillsError: billsError =>
          set({ billsError, billsLoading: false }, false, 'setBillsError'),

        // Vote actions
        setVotes: votes => set({ votes, votesError: null }, false, 'setVotes'),

        addVotes: newVotes =>
          set(
            state => ({
              votes: [...state.votes, ...newVotes],
              votesError: null,
            }),
            false,
            'addVotes'
          ),

        setSelectedVote: selectedVote => set({ selectedVote }, false, 'setSelectedVote'),

        setVotesLoading: votesLoading => set({ votesLoading }, false, 'setVotesLoading'),

        setVotesError: votesError =>
          set({ votesError, votesLoading: false }, false, 'setVotesError'),

        // Filter actions
        setFilters: newFilters =>
          set(
            state => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'setFilters'
          ),

        resetFilters: () => set({ filters: initialFilters }, false, 'resetFilters'),

        // Computed
        getFilteredBills: () => {
          const state = get();
          const { bills, filters } = state;

          return bills.filter(bill => {
            // Congress filter
            if (filters.congress && bill.congress !== filters.congress) return false;

            // Chamber filter
            if (filters.chamber !== 'all') {
              const billChamber = bill.type.startsWith('H') ? 'house' : 'senate';
              if (billChamber !== filters.chamber) return false;
            }

            // Status filter
            if (filters.status && bill.status !== filters.status) return false;

            // Sponsor filter
            if (
              filters.sponsor &&
              !bill.sponsor.name.toLowerCase().includes(filters.sponsor.toLowerCase())
            ) {
              return false;
            }

            // Subject filter
            if (
              filters.subject &&
              !bill.subjects.some(s => s.toLowerCase().includes(filters.subject.toLowerCase()))
            ) {
              return false;
            }

            // Date range filter
            if (filters.dateRange.start || filters.dateRange.end) {
              const billDate = new Date(bill.introducedDate);
              if (filters.dateRange.start && billDate < filters.dateRange.start) return false;
              if (filters.dateRange.end && billDate > filters.dateRange.end) return false;
            }

            return true;
          });
        },

        getFilteredVotes: () => {
          const state = get();
          const { votes, filters } = state;

          return votes.filter(vote => {
            // Chamber filter
            if (filters.chamber !== 'all' && vote.chamber !== filters.chamber) return false;

            // Date range filter
            if (filters.dateRange.start || filters.dateRange.end) {
              const voteDate = new Date(vote.date);
              if (filters.dateRange.start && voteDate < filters.dateRange.start) return false;
              if (filters.dateRange.end && voteDate > filters.dateRange.end) return false;
            }

            return true;
          });
        },
      }),
      {
        name: 'legislation-storage',
        partialize: state => ({
          filters: state.filters,
          // Don't persist bills/votes data or loading states
        }),
      }
    ),
    {
      name: 'LegislationStore',
    }
  )
);
