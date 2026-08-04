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

/**
 * A figure the API computed over the rows it could retrieve, not the whole
 * population. Rendered with its denominator so it is never read as a census.
 */
interface SampledFigure<T> {
  value: T;
  examined: number;
  population: number | null;
}

interface CommunityProfile {
  districtId: string;
  state: string;
  environment: {
    majorFacilities: number | null;
    facilitiesWithViolations: SampledFigure<number>;
    significantViolations: SampledFigure<number>;
    violationRate: SampledFigure<number | null>;
  };
  health: {
    hospitals: number | null;
    nursingHomes: number | null;
    avgHospitalRating: SampledFigure<number | null>;
    hospitalsWithEmergency: SampledFigure<number>;
  };
  safety: {
    recentDisasters: number;
    recentDisastersComplete: boolean;
    totalDisasters: number | null;
    consumerComplaints: number | null;
    topComplaintProducts: string[];
  };
  energy: {
    renewablePercentage: number | null;
    topSources: Array<{ source: string; amount: number }>;
  } | null;
  education: {
    totalColleges: number | null;
    publicColleges: SampledFigure<number>;
    avgMedianEarnings: SampledFigure<number | null>;
    nihGrants: number | null;
    largestGrantsFunding: SampledFigure<number>;
  };
  banking: {
    fdicInstitutions: number;
    totalAssets: number;
    totalDeposits: number;
  } | null;
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

/** True when the figure was computed over every row that exists upstream. */
function isComplete(figure: SampledFigure<unknown>): boolean {
  return figure.population !== null && figure.examined >= figure.population;
}

/**
 * A metric computed over a subset, labelled with the subset it describes.
 *
 * Where the rows examined are the whole population this renders as a plain
 * metric; otherwise the denominator is shown, because the alternative is a
 * number that reads as a state total while measuring a page of results.
 */
function SampledMetric({
  figure,
  label,
  format,
  highlight,
}: {
  figure: SampledFigure<number | null>;
  label: string;
  format?: (n: number) => string;
  highlight?: boolean;
}) {
  if (figure.value === null) return null;
  const shown = format ? format(figure.value) : figure.value.toLocaleString();

  if (isComplete(figure)) {
    return <Metric value={shown} label={label} highlight={highlight} />;
  }

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-500">
        {label}
        <span className="text-gray-400"> (in {formatCount(figure.examined)} sampled)</span>
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${highlight ? 'text-[#e11d07]' : 'text-gray-900'}`}
      >
        {shown}
      </span>
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
  const hasEnvironment = (data.environment.majorFacilities ?? 0) > 0;
  const hasHealth = (data.health.hospitals ?? 0) > 0 || (data.health.nursingHomes ?? 0) > 0;
  const hasSafety =
    (data.safety.totalDisasters ?? 0) > 0 || (data.safety.consumerComplaints ?? 0) > 0;
  const hasEnergy = data.energy !== null && data.energy.topSources.length > 0;
  const hasEducation =
    (data.education.totalColleges ?? 0) > 0 || (data.education.nihGrants ?? 0) > 0;
  const hasBanking = data.banking !== null && data.banking.fdicInstitutions > 0;

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
              {`EPA lists ${formatCount(data.environment.majorFacilities ?? 0)} major regulated facilities in ${state}.`}
              {data.environment.facilitiesWithViolations.value > 0 &&
                ` Of the ${formatCount(data.environment.facilitiesWithViolations.examined)} examined here, ${formatCount(data.environment.facilitiesWithViolations.value)} have compliance violations on record` +
                  (data.environment.significantViolations.value > 0
                    ? `, ${data.environment.significantViolations.value} of them significant.`
                    : '.')}
            </p>
            <div className="space-y-1.5">
              <Metric
                value={formatCount(data.environment.majorFacilities ?? 0)}
                label="Major regulated facilities"
              />
              <SampledMetric
                figure={data.environment.facilitiesWithViolations}
                label="With violations"
                format={formatCount}
                highlight
              />
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
              {state} has {formatCount(data.health.hospitals ?? 0)} hospitals
              {(data.health.nursingHomes ?? 0) > 0
                ? ` and ${formatCount(data.health.nursingHomes ?? 0)} nursing homes.`
                : '.'}
              {data.health.avgHospitalRating.value !== null &&
                (isComplete(data.health.avgHospitalRating)
                  ? ` Hospitals average ${data.health.avgHospitalRating.value} out of 5 stars for quality.`
                  : ` The ${formatCount(data.health.avgHospitalRating.examined)} hospitals sampled here average ${data.health.avgHospitalRating.value} out of 5 stars.`)}
            </p>
            <div className="space-y-1.5">
              <Metric value={formatCount(data.health.hospitals ?? 0)} label="Hospitals" />
              <Metric value={formatCount(data.health.nursingHomes ?? 0)} label="Nursing homes" />
              <SampledMetric
                figure={data.health.avgHospitalRating}
                label="Avg quality rating"
                format={n => `${n}/5`}
              />
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
                ? `${data.safety.recentDisastersComplete ? '' : 'At least '}${data.safety.recentDisasters} federal disaster declarations in ${state} in the last 5 years${(data.safety.totalDisasters ?? 0) > 0 ? `, out of ${formatCount(data.safety.totalDisasters ?? 0)} on record` : ''}.`
                : `No federal disaster declarations in ${state} in the last 5 years.`}
              {data.safety.consumerComplaints !== null && data.safety.consumerComplaints > 0
                ? ` ${formatCount(data.safety.consumerComplaints)} consumer complaints filed with the CFPB.`
                : ''}
            </p>
            <div className="space-y-1.5">
              <Metric
                value={`${data.safety.recentDisastersComplete ? '' : '≥'}${data.safety.recentDisasters}`}
                label="Disasters (5 yr)"
              />
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
              {(data.education.totalColleges ?? 0) > 0
                ? `${formatCount(data.education.totalColleges ?? 0)} colleges and universities in ${state}.`
                : ''}
              {(data.education.nihGrants ?? 0) > 0
                ? ` ${formatCount(data.education.nihGrants ?? 0)} active NIH research grants.`
                : ''}
            </p>
            <div className="space-y-1.5">
              {(data.education.totalColleges ?? 0) > 0 && (
                <Metric value={formatCount(data.education.totalColleges ?? 0)} label="Colleges" />
              )}
              <SampledMetric
                figure={data.education.publicColleges}
                label="Public"
                format={formatCount}
              />
              {(data.education.nihGrants ?? 0) > 0 && (
                <Metric value={formatCount(data.education.nihGrants ?? 0)} label="NIH grants" />
              )}
              {/* Named for what it is: the value of the largest awards fetched,
                  not the state's NIH funding, which would need every project. */}
              <SampledMetric
                figure={data.education.largestGrantsFunding}
                label="Largest grants"
                format={formatDollars}
              />
            </div>
          </DataCard>
        )}

        {hasBanking && data.banking && (
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
