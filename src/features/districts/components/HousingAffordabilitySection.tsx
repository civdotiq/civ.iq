/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';

// ── Types ────────────────────────────────────────────────────────────

interface FairMarketRent {
  countyName: string;
  metroName: string | null;
  year: number;
  efficiency: number;
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
}

interface IncomeLimitBySize {
  person1: number;
  person2: number;
  person3: number;
  person4: number;
}

interface IncomeLimit {
  countyName: string;
  year: number;
  medianIncome: number;
  veryLow: IncomeLimitBySize;
  extremelyLow: IncomeLimitBySize;
  low: IncomeLimitBySize;
}

interface HousingResponse {
  districtId: string;
  state: string;
  fairMarketRents: FairMarketRent | null;
  incomeLimits: IncomeLimit | null;
  dataSource: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ── Component ────────────────────────────────────────────────────────

export function HousingAffordabilitySection({ districtId }: { districtId: string }) {
  const { data, isLoading, error } = useSWR<HousingResponse>(
    `/api/district/${districtId}/housing`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600_000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 animate-pulse">
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-48 mb-4" />
        <div className="h-24 bg-gray-200 border-2 border-gray-300" />
      </div>
    );
  }

  if (error || !data || (!data.fairMarketRents && !data.incomeLimits)) {
    return null; // Silently skip if HUD data unavailable
  }

  const fmr = data.fairMarketRents;
  const il = data.incomeLimits;

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Housing Affordability</h2>
      <p className="text-sm text-gray-600 mb-4">
        HUD fair market rents and income limits help citizens understand if housing policy matches
        their community&apos;s reality.
      </p>

      {/* Fair Market Rents */}
      {fmr && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Fair market rents ({fmr.year})
          </h3>
          {fmr.countyName && (
            <p className="text-xs text-gray-500 mb-2">
              {fmr.countyName}
              {fmr.metroName ? ` (${fmr.metroName})` : ''}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <RentBox label="Studio" value={fmr.efficiency} />
            <RentBox label="1 BR" value={fmr.oneBedroom} />
            <RentBox label="2 BR" value={fmr.twoBedroom} />
            <RentBox label="3 BR" value={fmr.threeBedroom} />
            <RentBox label="4 BR" value={fmr.fourBedroom} />
          </div>
        </div>
      )}

      {/* Income Limits */}
      {il && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
            Income limits ({il.year})
          </h3>
          <div className="border-2 border-gray-200 p-3 mb-3">
            <span className="text-xs text-gray-500">Area median income</span>
            <p className="text-xl font-bold text-gray-900">{formatDollars(il.medianIncome)}</p>
          </div>
          <div className="space-y-2">
            <IncomeRow
              label="Low income (80% AMI)"
              amount={il.low.person4}
              description="Family of 4"
            />
            <IncomeRow
              label="Very low income (50% AMI)"
              amount={il.veryLow.person4}
              description="Family of 4"
            />
            <IncomeRow
              label="Extremely low income (30% AMI)"
              amount={il.extremelyLow.person4}
              description="Family of 4"
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Source: {data.dataSource}</p>
    </div>
  );
}

function RentBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-gray-200 p-2 text-center">
      <div className="text-lg font-bold text-gray-900">{formatDollars(value)}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function IncomeRow({
  label,
  amount,
  description,
}: {
  label: string;
  amount: number;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-gray-900">{label}</span>
        <span className="text-gray-400 ml-2 text-xs">{description}</span>
      </div>
      <span className="font-medium text-gray-900 tabular-nums">{formatDollars(amount)}</span>
    </div>
  );
}
