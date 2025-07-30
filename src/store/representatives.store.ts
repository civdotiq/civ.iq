/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Representative } from '@/features/representatives/services/congress-api';

interface RepresentativeFilters {
  state: string;
  party: string;
  chamber: string;
  searchQuery: string;
}

interface RepresentativesState {
  // Data
  representatives: Representative[];
  selectedRepresentative: Representative | null;

  // UI State
  loading: boolean;
  error: string | null;
  filters: RepresentativeFilters;

  // Actions
  setRepresentatives: (representatives: Representative[]) => void;
  setSelectedRepresentative: (representative: Representative | null) => void;
  setFilters: (filters: Partial<RepresentativeFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredRepresentatives: () => Representative[];
}

const initialFilters: RepresentativeFilters = {
  state: '',
  party: '',
  chamber: '',
  searchQuery: '',
};

export const useRepresentativesStore = create<RepresentativesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        representatives: [],
        selectedRepresentative: null,
        loading: false,
        error: null,
        filters: initialFilters,

        // Actions
        setRepresentatives: representatives =>
          set({ representatives, error: null }, false, 'setRepresentatives'),

        setSelectedRepresentative: selectedRepresentative =>
          set({ selectedRepresentative }, false, 'setSelectedRepresentative'),

        setFilters: newFilters =>
          set(
            state => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'setFilters'
          ),

        resetFilters: () => set({ filters: initialFilters }, false, 'resetFilters'),

        setLoading: loading => set({ loading }, false, 'setLoading'),

        setError: error => set({ error, loading: false }, false, 'setError'),

        // Computed
        getFilteredRepresentatives: () => {
          const state = get();
          const { representatives, filters } = state;

          return representatives.filter(rep => {
            // State filter
            if (filters.state && rep.state !== filters.state) return false;

            // Party filter
            if (filters.party && rep.party !== filters.party) return false;

            // Chamber filter
            if (filters.chamber && rep.chamber !== filters.chamber) return false;

            // Search query
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const matchesName = rep.name.toLowerCase().includes(query);
              const matchesState = rep.state.toLowerCase().includes(query);
              const matchesDistrict = rep.district?.toLowerCase().includes(query);

              if (!matchesName && !matchesState && !matchesDistrict) return false;
            }

            return true;
          });
        },
      }),
      {
        name: 'representatives-storage',
        partialize: state => ({
          filters: state.filters,
          // Don't persist representatives data or loading states
        }),
      }
    ),
    {
      name: 'RepresentativesStore',
    }
  )
);
