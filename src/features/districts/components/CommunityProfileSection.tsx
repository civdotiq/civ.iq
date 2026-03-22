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
  ExternalLink,
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

function formatDollars(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-[#3ea2d4] hover:underline mt-2"
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function DataCard({
  icon,
  title,
  children,
  color,
  sourceUrl,
  sourceLabel,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  color: string;
  sourceUrl: string;
  sourceLabel: string;
}) {
  return (
    <div className="border-2 border-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={color}>{icon}</div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
      <SourceLink href={sourceUrl} label={sourceLabel} />
    </div>
  );
}

function Metric({
  value,
  label,
  highlight,
}: {
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${highlight ? 'text-[#e11d07]' : 'text-gray-900'}`}
      >
        {value}
      </span>
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

  const { state } = data;

  // Only render cards that have meaningful data
  const hasEnvironment = data.environment.epaFacilities > 0;
  const hasHealth = data.health.hospitals > 0 || data.health.nursingHomes > 0;
  const hasSafety = data.safety.totalDisasters > 0 || (data.safety.consumerComplaints ?? 0) > 0;
  const hasEnergy = data.energy !== null && data.energy.topSources.length > 0;
  const hasEducation = data.education.totalColleges > 0 || data.education.nihGrants > 0;
  const hasBanking = data.banking.fdicInstitutions > 0;

  const cardCount = [
    hasEnvironment,
    hasHealth,
    hasSafety,
    hasEnergy,
    hasEducation,
    hasBanking,
  ].filter(Boolean).length;
  if (cardCount === 0) return null;

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Community Profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          Federal data for {state} from government agencies
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {hasEnvironment && (
          <DataCard
            icon={<Factory className="h-4 w-4" />}
            title="Environment"
            color="text-[#0a9338]"
            sourceUrl={`https://echo.epa.gov/facilities/facility-search/results?p_st=${state}`}
            sourceLabel="EPA ECHO"
          >
            <div className="space-y-2">
              <Metric
                value={formatCount(data.environment.epaFacilities)}
                label="Regulated facilities"
              />
              <Metric
                value={data.environment.facilitiesWithViolations}
                label="Active violations"
                highlight={data.environment.facilitiesWithViolations > 0}
              />
              {data.environment.violationRate !== null && (
                <Metric value={`${data.environment.violationRate}%`} label="Violation rate" />
              )}
            </div>
          </DataCard>
        )}

        {hasHealth && (
          <DataCard
            icon={<Heart className="h-4 w-4" />}
            title="Healthcare"
            color="text-[#e11d07]"
            sourceUrl={`https://www.medicare.gov/care-compare/?providerType=Hospital&state=${state}`}
            sourceLabel="CMS Hospital Compare"
          >
            <div className="space-y-2">
              <Metric value={data.health.hospitals} label="Hospitals" />
              <Metric value={data.health.nursingHomes} label="Nursing homes" />
              {data.health.avgHospitalRating !== null && (
                <Metric value={`${data.health.avgHospitalRating}/5 avg`} label="Quality rating" />
              )}
            </div>
          </DataCard>
        )}

        {hasSafety && (
          <DataCard
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Safety"
            color="text-[#3ea2d4]"
            sourceUrl={`https://www.fema.gov/disaster/declarations?field_dv2_state_territory_tribal_value=${state}`}
            sourceLabel="FEMA / CFPB"
          >
            <div className="space-y-2">
              <Metric value={data.safety.recentDisasters} label="Disasters (5 yr)" />
              {data.safety.consumerComplaints !== null && (
                <Metric
                  value={formatCount(data.safety.consumerComplaints)}
                  label="Consumer complaints"
                />
              )}
              <Metric value={data.safety.totalDisasters} label="All-time disasters" />
            </div>
          </DataCard>
        )}

        {hasEnergy && data.energy && (
          <DataCard
            icon={<Zap className="h-4 w-4" />}
            title="Energy"
            color="text-[#f59e0b]"
            sourceUrl={`https://www.eia.gov/state/?sid=${state}`}
            sourceLabel="EIA"
          >
            <div className="space-y-2">
              {data.energy.renewablePercentage !== null && (
                <Metric value={`${data.energy.renewablePercentage}%`} label="Renewable energy" />
              )}
              {data.energy.topSources.slice(0, 2).map((s, i) => (
                <Metric key={s.source} value={s.source} label={`#${i + 1} source`} />
              ))}
            </div>
          </DataCard>
        )}

        {hasEducation && (
          <DataCard
            icon={<GraduationCap className="h-4 w-4" />}
            title="Education & Research"
            color="text-[#8b5cf6]"
            sourceUrl={`https://collegescorecard.ed.gov/search/?state=${state}`}
            sourceLabel="College Scorecard / NIH"
          >
            <div className="space-y-2">
              {data.education.totalColleges > 0 && (
                <Metric
                  value={data.education.totalColleges}
                  label={`Colleges (${data.education.publicColleges} public)`}
                />
              )}
              {data.education.nihGrants > 0 && (
                <Metric value={data.education.nihGrants} label="Active NIH grants" />
              )}
              {data.education.nihTotalFunding > 0 && (
                <Metric value={formatDollars(data.education.nihTotalFunding)} label="NIH funding" />
              )}
            </div>
          </DataCard>
        )}

        {hasBanking && (
          <DataCard
            icon={<Landmark className="h-4 w-4" />}
            title="Banking"
            color="text-gray-700"
            sourceUrl={`https://www.fdic.gov/bank/statistical/`}
            sourceLabel="FDIC BankFind"
          >
            <div className="space-y-2">
              <Metric value={data.banking.fdicInstitutions} label="FDIC institutions" />
              {data.banking.totalAssets > 0 && (
                <Metric value={formatDollars(data.banking.totalAssets)} label="Total assets" />
              )}
              {data.banking.totalDeposits > 0 && (
                <Metric value={formatDollars(data.banking.totalDeposits)} label="Total deposits" />
              )}
            </div>
          </DataCard>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-4">
        State-level aggregates for {state}. District-level patterns vary by county.
      </p>
    </div>
  );
}
