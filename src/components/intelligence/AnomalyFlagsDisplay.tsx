/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { AnomalyResult, AnomalyFlag } from '@civiq/civic-statistics';
import { displaySector } from '@/lib/mesh/sector-display';

interface AnomalyFlagsDisplayProps {
  anomalies: AnomalyResult;
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)} million`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function toPlainLanguage(flag: AnomalyFlag): string {
  const val = formatDollars(flag.value);
  const med = formatDollars(flag.peerMedian);
  const sector = displaySector(flag.dimension);

  if (flag.peerMedian === 0) {
    return (
      `Received ${val} from the ${sector} sector. ` +
      'Other lawmakers on the same committees received nothing from this sector.'
    );
  }

  return (
    `Received ${val} from the ${sector} sector. ` +
    `Similar lawmakers on the same committees typically received about ${med}.`
  );
}

export function AnomalyFlagsDisplay({ anomalies }: AnomalyFlagsDisplayProps) {
  if (!anomalies.hasAnomalies || !anomalies.meetsMinimumPeers) {
    return null;
  }

  // Show at most 5 — already sorted by severity (highest Z-score first)
  const anomalyFlags = anomalies.flags.filter(f => f.isAnomaly).slice(0, 5);
  if (anomalyFlags.length === 0) return null;

  return (
    <div className="bg-gray-50 p-4">
      <h4 className="aicher-heading type-sm text-gray-900 mb-3">
        How this lawmaker&apos;s funding stands out
      </h4>
      <ul className="space-y-3">
        {anomalyFlags.map(flag => (
          <li key={flag.dimension} className="type-sm text-gray-700">
            {toPlainLanguage(flag)}
          </li>
        ))}
      </ul>
      <p className="type-xs text-gray-400 mt-3">
        We compared this lawmaker&apos;s campaign funding to others who serve on the same
        committees. Receiving more or less money does not indicate wrongdoing.
      </p>
    </div>
  );
}
