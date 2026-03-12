/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { InfluenceClusterData } from '@/lib/intelligence/clusters/types';

const MOCK_CLUSTER_DATA: InfluenceClusterData = {
  generatedAt: '2026-03-10T00:00:00Z',
  legislatorCount: 5,
  clusterCount: 2,
  noisePoints: 1,
  crossPartyClusters: 1,
  legislators: [
    {
      bioguideId: 'A000001',
      party: 'D',
      chamber: 'House',
      state: 'CA',
      x: 1.0,
      y: 2.0,
      clusterId: 0,
      topSectors: [],
    },
    {
      bioguideId: 'B000002',
      party: 'R',
      chamber: 'House',
      state: 'TX',
      x: 1.5,
      y: 2.5,
      clusterId: 0,
      topSectors: [],
    },
    {
      bioguideId: 'C000003',
      party: 'D',
      chamber: 'Senate',
      state: 'NY',
      x: 5.0,
      y: 6.0,
      clusterId: 1,
      topSectors: [],
    },
    {
      bioguideId: 'D000004',
      party: 'D',
      chamber: 'Senate',
      state: 'IL',
      x: 5.5,
      y: 6.5,
      clusterId: 1,
      topSectors: [],
    },
    {
      bioguideId: 'E000005',
      party: 'I',
      chamber: 'Senate',
      state: 'VT',
      x: 10.0,
      y: 10.0,
      clusterId: -1,
      topSectors: [],
    },
  ],
  clusters: {
    0: {
      memberCount: 2,
      topSectors: [
        { sector: 'Defense', meanPct: 0.35 },
        { sector: 'Finance/Insurance/Real Estate', meanPct: 0.25 },
      ],
      partyComposition: { D: 1, R: 1, I: 0 },
      isCrossParty: true,
    },
    1: {
      memberCount: 2,
      topSectors: [
        { sector: 'Health', meanPct: 0.4 },
        { sector: 'Labor', meanPct: 0.2 },
      ],
      partyComposition: { D: 2, R: 0, I: 0 },
      isCrossParty: false,
    },
  },
};

// We need to test the functions directly with injected data
// Since the module uses require() which won't find the JSON in tests,
// we test the logic by importing and resetting

describe('Influence Clusters', () => {
  // Use dynamic require to get access to the module functions
  let getInfluenceClusters: () => InfluenceClusterData | null;
  let getLegislatorCluster: (
    id: string
  ) => ReturnType<(typeof import('@/lib/intelligence/clusters'))['getLegislatorCluster']>;
  let getCrossPartyClusters: () => ReturnType<
    (typeof import('@/lib/intelligence/clusters'))['getCrossPartyClusters']
  >;
  let _resetForTesting: () => void;

  beforeEach(() => {
    // Reset module cache to get fresh imports
    jest.resetModules();

    // Mock fs.readFileSync to return the cluster data
    // The module uses readFileSync to load influence-clusters.json
    jest.doMock('fs', () => ({
      ...jest.requireActual('fs'),
      readFileSync: jest.fn().mockReturnValue(JSON.stringify(MOCK_CLUSTER_DATA)),
    }));

    // Re-require the module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/lib/intelligence/clusters');
    getInfluenceClusters = mod.getInfluenceClusters;
    getLegislatorCluster = mod.getLegislatorCluster;
    getCrossPartyClusters = mod.getCrossPartyClusters;
    _resetForTesting = mod._resetForTesting;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInfluenceClusters', () => {
    it('loads cluster data', () => {
      const data = getInfluenceClusters();
      expect(data).not.toBeNull();
      expect(data!.legislatorCount).toBe(5);
      expect(data!.clusterCount).toBe(2);
    });

    it('caches loaded data', () => {
      const data1 = getInfluenceClusters();
      const data2 = getInfluenceClusters();
      expect(data1).toBe(data2); // Same reference
    });
  });

  describe('getLegislatorCluster', () => {
    it('returns legislator with cluster info', () => {
      const result = getLegislatorCluster('A000001');
      expect(result).not.toBeNull();
      expect(result!.point.bioguideId).toBe('A000001');
      expect(result!.point.clusterId).toBe(0);
      expect(result!.cluster).not.toBeNull();
      expect(result!.cluster!.isCrossParty).toBe(true);
      expect(result!.clusterMembers.length).toBe(2);
    });

    it('returns null for unknown bioguideId', () => {
      const result = getLegislatorCluster('UNKNOWN');
      expect(result).toBeNull();
    });

    it('handles noise points (clusterId = -1)', () => {
      const result = getLegislatorCluster('E000005');
      expect(result).not.toBeNull();
      expect(result!.point.clusterId).toBe(-1);
      expect(result!.cluster).toBeNull();
      expect(result!.clusterMembers.length).toBe(0);
    });

    it('returns all cluster members', () => {
      const result = getLegislatorCluster('B000002');
      expect(result).not.toBeNull();
      const memberIds = result!.clusterMembers.map(m => m.bioguideId);
      expect(memberIds).toContain('A000001');
      expect(memberIds).toContain('B000002');
    });
  });

  describe('getCrossPartyClusters', () => {
    it('returns only cross-party clusters', () => {
      const clusters = getCrossPartyClusters();
      expect(clusters.length).toBe(1);
      expect(clusters[0].clusterId).toBe(0);
      expect(clusters[0].metadata.isCrossParty).toBe(true);
    });

    it('includes cluster members', () => {
      const clusters = getCrossPartyClusters();
      expect(clusters[0].members.length).toBe(2);
    });
  });
});
