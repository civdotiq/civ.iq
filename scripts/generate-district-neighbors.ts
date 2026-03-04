/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Generate District Neighbor Data
 *
 * Computes nearest congressional district neighbors from centroid proximity
 * using the Census Bureau district gazetteer data (440 districts).
 *
 * Algorithm:
 * - Multi-district states: closest N districts within the same state (by Haversine distance)
 * - At-large states (1 district): closest districts from any state
 *
 * Usage: npm run generate-district-neighbors
 *
 * Source: U.S. Census Bureau 2024 Gazetteer - 119th Congress Congressional Districts
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GazetteerDistrict {
  landAreaSqMi: number;
  waterAreaSqMi: number;
  centroid: { lat: number; lng: number };
}

interface GazetteerData {
  source: string;
  totalDistricts: number;
  districts: Record<string, GazetteerDistrict>;
}

// ---------------------------------------------------------------------------
// Haversine distance (from district-boundary-utils.ts)
// ---------------------------------------------------------------------------

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const MAX_NEIGHBORS = 5;

function generate(): void {
  const gazetteerPath = path.join(__dirname, '..', 'src', 'data', 'district-gazetteer.json');
  const raw = fs.readFileSync(gazetteerPath, 'utf-8');
  const gazetteer: GazetteerData = JSON.parse(raw);

  const districtIds = Object.keys(gazetteer.districts).sort();
  console.log(`Processing ${districtIds.length} districts from gazetteer...`);

  // Group by state
  const byState = new Map<string, string[]>();
  for (const id of districtIds) {
    const state = id.split('-')[0]!;
    if (!byState.has(state)) byState.set(state, []);
    byState.get(state)!.push(id);
  }

  const neighbors: Record<string, string[]> = {};

  for (const id of districtIds) {
    const state = id.split('-')[0]!;
    const stateDistricts = byState.get(state)!;
    const centroid = gazetteer.districts[id]!.centroid;

    if (stateDistricts.length > 1) {
      // Multi-district state: find closest within same state
      const distances: Array<{ id: string; dist: number }> = [];

      for (const otherId of stateDistricts) {
        if (otherId === id) continue;
        const otherCentroid = gazetteer.districts[otherId]!.centroid;
        const dist = haversineDistance(
          centroid.lat,
          centroid.lng,
          otherCentroid.lat,
          otherCentroid.lng
        );
        distances.push({ id: otherId, dist });
      }

      distances.sort((a, b) => a.dist - b.dist);
      neighbors[id] = distances.slice(0, MAX_NEIGHBORS).map(d => d.id);
    } else {
      // At-large state: find closest districts from any state
      const distances: Array<{ id: string; dist: number }> = [];

      for (const otherId of districtIds) {
        if (otherId === id) continue;
        const otherCentroid = gazetteer.districts[otherId]!.centroid;
        const dist = haversineDistance(
          centroid.lat,
          centroid.lng,
          otherCentroid.lat,
          otherCentroid.lng
        );
        distances.push({ id: otherId, dist });
      }

      distances.sort((a, b) => a.dist - b.dist);
      neighbors[id] = distances.slice(0, MAX_NEIGHBORS).map(d => d.id);
    }
  }

  // Write output
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'district-neighbors.ts');
  const lines = [
    '/**',
    ' * Copyright (c) 2019-2025 Mark Sandford',
    ' * Licensed under the MIT License. See LICENSE and NOTICE files.',
    ' */',
    '',
    '/**',
    ' * District neighbor data generated from Census Bureau gazetteer centroids.',
    ' * Multi-district states: closest districts within the same state.',
    ' * At-large states: closest districts from any state.',
    ' *',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Source: ${gazetteer.source}`,
    ` * Districts: ${districtIds.length}`,
    ' *',
    ' * DO NOT EDIT — regenerate with: npm run generate-district-neighbors',
    ' */',
    '',
    'export const DISTRICT_NEIGHBORS: Record<string, string[]> = {',
  ];

  for (const id of districtIds) {
    const neighborList = neighbors[id]!;
    lines.push(`  '${id}': [${neighborList.map(n => `'${n}'`).join(', ')}],`);
  }

  lines.push('};');
  lines.push('');

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

  // Stats
  const totalEntries = Object.keys(neighbors).length;
  const atLargeStates = [...byState.entries()].filter(([, ids]) => ids.length === 1).length;
  console.log(`Written ${totalEntries} entries to ${outputPath}`);
  console.log(`  Multi-district states: ${byState.size - atLargeStates}`);
  console.log(`  At-large states: ${atLargeStates}`);
}

generate();
