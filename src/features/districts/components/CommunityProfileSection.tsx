/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import {
  Factory,
  Heart,
  ShieldAlert,
  Zap,
  GraduationCap,
  Landmark,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface CommunityProfileSectionProps {
  districtId: string;
}

interface CommunityProfile {
  districtId: string;
  state: string;
  environment: {
    epaFacilities: number;
    facilitiesWithViolations: number;
    violationRate: number | null;
  };
  health: {
    hospitals: number;
    nursingHomes: number;
    avgHospitalRating: number | null;
    hospitalsWithEmergency: number;
  };
  safety: {
    recentDisasters: number;
    totalDisasters: number;
    consumerComplaints: number | null;
    topComplaintProducts: string[];
  };
  energy: {
    renewablePercentage: number | null;
    topSources: Array<{ source: string; amount: number }>;
  } | null;
  education: {
    totalColleges: number;
    publicColleges: number;
    avgMedianEarnings: number | null;
    nihGrants: number;
    nihTotalFunding: number;
  };
  banking: {
    fdicInstitutions: number;
    totalAssets: number;
    totalDeposits: number;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
    note: string;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

function formatNumber(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function StatCard({
  icon,
  title,
  stats,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  stats: Array<{ label: string; value: string | number | null; highlight?: boolean }>;
  color: string;
}) {
  return (
    <div className="bg-white border-2 border-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={color}>{icon}</div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">{stat.label}</span>
            <span
              className={`text-sm font-semibold ${stat.highlight ? 'text-[#e11d07]' : 'text-gray-900'}`}
            >
              {stat.value ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommunityProfileSection({ districtId }: CommunityProfileSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<CommunityProfile>(
    `/api/district/${districtId}/community-profile`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-4 sm:p-8 animate-pulse">
        <div className="h-6 bg-gray-200 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-gray-200 p-4">
              <div className="h-4 bg-gray-200 w-24 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 w-full" />
                <div className="h-3 bg-gray-200 w-3/4" />
                <div className="h-3 bg-gray-200 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-4 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-[#e11d07]" />
          <h2 className="text-xl font-bold text-gray-900">Community Profile</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Unable to load community profile data.</p>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-1.5 text-sm text-[#3ea2d4] hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Community Profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          State-level data for {data.state} from 9 federal agencies
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Factory className="h-4 w-4" />}
          title="Environment"
          color="text-[#0a9338]"
          stats={[
            { label: 'EPA Facilities', value: formatCount(data.environment.epaFacilities) },
            {
              label: 'With Violations',
              value: data.environment.facilitiesWithViolations,
              highlight: data.environment.facilitiesWithViolations > 0,
            },
            {
              label: 'Violation Rate',
              value:
                data.environment.violationRate !== null
                  ? `${data.environment.violationRate}%`
                  : null,
            },
          ]}
        />

        <StatCard
          icon={<Heart className="h-4 w-4" />}
          title="Healthcare"
          color="text-[#e11d07]"
          stats={[
            { label: 'Hospitals', value: data.health.hospitals },
            { label: 'Nursing Homes', value: data.health.nursingHomes },
            {
              label: 'Avg Rating',
              value:
                data.health.avgHospitalRating !== null
                  ? `${data.health.avgHospitalRating}/5`
                  : null,
            },
          ]}
        />

        <StatCard
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Safety"
          color="text-[#3ea2d4]"
          stats={[
            { label: 'Recent Disasters', value: data.safety.recentDisasters },
            {
              label: 'Consumer Complaints',
              value:
                data.safety.consumerComplaints !== null
                  ? formatCount(data.safety.consumerComplaints)
                  : null,
            },
            { label: 'All-Time Disasters', value: data.safety.totalDisasters },
          ]}
        />

        <StatCard
          icon={<Zap className="h-4 w-4" />}
          title="Energy"
          color="text-[#f59e0b]"
          stats={
            data.energy
              ? [
                  {
                    label: 'Renewable',
                    value:
                      data.energy.renewablePercentage !== null
                        ? `${data.energy.renewablePercentage}%`
                        : null,
                  },
                  {
                    label: '#1 Source',
                    value: data.energy.topSources[0]?.source ?? null,
                  },
                  {
                    label: '#2 Source',
                    value: data.energy.topSources[1]?.source ?? null,
                  },
                ]
              : [{ label: 'Status', value: 'No API key' }]
          }
        />

        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          title="Education"
          color="text-[#8b5cf6]"
          stats={[
            { label: 'Colleges', value: data.education.totalColleges },
            { label: 'NIH Grants', value: data.education.nihGrants },
            {
              label: 'NIH Funding',
              value:
                data.education.nihTotalFunding > 0
                  ? formatNumber(data.education.nihTotalFunding)
                  : null,
            },
          ]}
        />

        <StatCard
          icon={<Landmark className="h-4 w-4" />}
          title="Banking"
          color="text-gray-700"
          stats={[
            { label: 'FDIC Banks', value: data.banking.fdicInstitutions },
            {
              label: 'Total Assets',
              value: data.banking.totalAssets > 0 ? formatNumber(data.banking.totalAssets) : null,
            },
            {
              label: 'Total Deposits',
              value:
                data.banking.totalDeposits > 0 ? formatNumber(data.banking.totalDeposits) : null,
            },
          ]}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-[10px] text-gray-400">
          Sources: {data.metadata.dataSources.join(' · ')}. {data.metadata.note}
        </p>
      </div>
    </div>
  );
}
