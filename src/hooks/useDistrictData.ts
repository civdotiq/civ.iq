/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';

interface DistrictData {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
    imageUrl?: string;
    yearsInOffice?: number;
  };
  demographics?: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
    white_percent: number;
    black_percent: number;
    hispanic_percent: number;
    asian_percent: number;
    poverty_rate: number;
    bachelor_degree_percent: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
  wikidata?: {
    established?: string;
    area?: number;
    previousRepresentatives?: string[];
    wikipediaUrl?: string;
    capital?: string;
    governor?: string;
    motto?: string;
    nickname?: string;
  } | null;
}

interface UseDistrictDataResult {
  data: DistrictData | null;
  loading: boolean;
  error: string | null;
}

export function useDistrictData(districtId: string | null): UseDistrictDataResult {
  const [data, setData] = useState<DistrictData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!districtId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchDistrictData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/districts/${districtId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch district data: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to load district data');
        }

        setData(result.district);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load district data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDistrictData();
  }, [districtId]);

  return { data, loading, error };
}
