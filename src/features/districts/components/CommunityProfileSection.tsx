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
    significantViolations: number;
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
      className="inline-flex items-center gap-1 text-[10px] text-[#3ea2d4] hover:underline mt-3"
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
      <div className="flex items-center gap-2 mb-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-gray-200 p-4">
              <div className="h-4 bg-gray-200 w-24 mb-3" />
              <div className="h-8 bg-gray-100 w-full mb-2" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasEnvironment && (
          <DataCard
            icon={<Factory className="h-4 w-4" />}
            title="Environment"
            color="text-[#0a9338]"
            sourceUrl={`https://echo.epa.gov/facilities/facility-search/results?p_st=${state}`}
            sourceLabel="EPA ECHO"
          >
            <p className="text-xs text-gray-600 mb-3">
              {data.environment.facilitiesWithViolations > 0
                ? `${formatCount(data.environment.facilitiesWithViolations)} of ${formatCount(data.environment.epaFacilities)} EPA-regulated facilities in ${state} have compliance violations on record.`
                : `${formatCount(data.environment.epaFacilities)} EPA-regulated facilities in ${state}, none with current violations.`}
              {data.environment.significantViolations > 0 &&
                ` ${data.environment.significantViolations} are flagged as significant.`}
            </p>
            <div className="space-y-1.5">
              <Metric
                value={formatCount(data.environment.epaFacilities)}
                label="Regulated facilities"
              />
              {data.environment.facilitiesWithViolations > 0 && (
                <Metric
                  value={data.environment.facilitiesWithViolations}
                  label="With violations"
                  highlight
                />
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
            <p className="text-xs text-gray-600 mb-3">
              {state} has {data.health.hospitals} hospitals
              {data.health.avgHospitalRating !== null
                ? ` averaging ${data.health.avgHospitalRating} out of 5 stars for quality`
                : ''}
              {data.health.nursingHomes > 0
                ? ` and ${data.health.nursingHomes} nursing homes.`
                : '.'}
            </p>
            <div className="space-y-1.5">
              <Metric value={data.health.hospitals} label="Hospitals" />
              <Metric value={data.health.nursingHomes} label="Nursing homes" />
              {data.health.avgHospitalRating !== null && (
                <Metric value={`${data.health.avgHospitalRating}/5`} label="Avg quality rating" />
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
            <p className="text-xs text-gray-600 mb-3">
              {data.safety.recentDisasters > 0
                ? `${data.safety.recentDisasters} federal disaster declarations in ${state} in the last 5 years.`
                : `No federal disaster declarations in ${state} in the last 5 years.`}
              {data.safety.consumerComplaints !== null && data.safety.consumerComplaints > 0
                ? ` ${formatCount(data.safety.consumerComplaints)} consumer complaints filed with the CFPB.`
                : ''}
            </p>
            <div className="space-y-1.5">
              <Metric value={data.safety.recentDisasters} label="Disasters (5 yr)" />
              {data.safety.consumerComplaints !== null && data.safety.consumerComplaints > 0 && (
                <Metric
                  value={formatCount(data.safety.consumerComplaints)}
                  label="CFPB complaints"
                />
              )}
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
            <p className="text-xs text-gray-600 mb-3">
              {data.energy.topSources.length > 0
                ? `${state} generates electricity primarily from ${data.energy.topSources
                    .slice(0, 2)
                    .map(s => s.source.toLowerCase())
                    .join(' and ')}.`
                : `Energy production data for ${state}.`}
              {data.energy.renewablePercentage !== null
                ? ` ${data.energy.renewablePercentage}% comes from renewable sources.`
                : ''}
            </p>
            <div className="space-y-1.5">
              {data.energy.topSources.slice(0, 2).map((s, i) => (
                <Metric key={s.source} value={s.source} label={`#${i + 1} source`} />
              ))}
              {data.energy.renewablePercentage !== null && (
                <Metric value={`${data.energy.renewablePercentage}%`} label="Renewable" />
              )}
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
            <p className="text-xs text-gray-600 mb-3">
              {data.education.totalColleges > 0
                ? `${data.education.totalColleges} colleges and universities in ${state} (${data.education.publicColleges} public).`
                : ''}
              {data.education.nihGrants > 0
                ? ` ${data.education.nihGrants} active NIH research grants totaling ${formatDollars(data.education.nihTotalFunding)}.`
                : ''}
            </p>
            <div className="space-y-1.5">
              {data.education.totalColleges > 0 && (
                <Metric value={data.education.totalColleges} label="Colleges" />
              )}
              {data.education.nihGrants > 0 && (
                <Metric value={data.education.nihGrants} label="NIH grants" />
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
            <p className="text-xs text-gray-600 mb-3">
              {data.banking.fdicInstitutions} FDIC-insured banks serve {state}
              {data.banking.totalDeposits > 0
                ? ` holding ${formatDollars(data.banking.totalDeposits)} in deposits.`
                : '.'}
            </p>
            <div className="space-y-1.5">
              <Metric value={data.banking.fdicInstitutions} label="Banks" />
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
