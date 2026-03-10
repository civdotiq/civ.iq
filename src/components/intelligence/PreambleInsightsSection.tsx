/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { ConfidenceBadge } from './ConfidenceBadge';
import { InsightDisclaimer } from './InsightDisclaimer';
import type {
  PreambleExtractionInsight,
  PreambleIndustryImpact,
  PreambleCostEstimate,
  PreambleTimeline,
} from '@/types/federal-register';
import type { CivicEntity } from '@/lib/intelligence/embeddings/types';

interface PreambleInsightsSectionProps {
  documentNumber: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const IMPACT_TYPE_LABELS: Record<PreambleIndustryImpact['impactType'], string> = {
  regulatory_burden: 'Regulatory burden',
  deregulatory_relief: 'Deregulatory relief',
  new_requirement: 'New requirement',
  modified_requirement: 'Modified requirement',
};

export function PreambleInsightsSection({ documentNumber }: PreambleInsightsSectionProps) {
  const { data, isLoading } = useSWR<PreambleExtractionInsight>(
    `/api/intelligence/federal-register/${encodeURIComponent(documentNumber)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 w-4/6" />
      </div>
    );
  }

  if (!data?.documentNumber) return null;

  const hasCosts = data.costEstimates.length > 0;
  const hasImpacts = data.industryImpacts.length > 0;
  const hasTimelines = data.timelines.length > 0;
  const hasEntities = (data.entities?.length ?? 0) > 0;
  const totalExtracted =
    data.costEstimates.length +
    data.industryImpacts.length +
    data.timelines.length +
    data.facts.length;

  return (
    <div
      id="preamble-analysis"
      className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="aicher-heading type-lg text-gray-900 dark:text-gray-100">
          Preamble Analysis
        </h2>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <KeyStat value={data.textStats.wordCount.toLocaleString()} label="Words analyzed" />
        {hasCosts && (
          <KeyStat
            value={String(data.costEstimates.length)}
            label={data.costEstimates.length === 1 ? 'Cost estimate' : 'Cost estimates'}
          />
        )}
        {hasImpacts && (
          <KeyStat
            value={String(data.industryImpacts.length)}
            label={data.industryImpacts.length === 1 ? 'Industry affected' : 'Industries affected'}
          />
        )}
        {!hasCosts && !hasImpacts && (
          <KeyStat value={String(totalExtracted)} label="Facts extracted" />
        )}
      </div>

      {/* Narrative */}
      <p className="type-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {data.narrative}
      </p>

      {/* Cost estimates */}
      {hasCosts && <CostEstimatesTable costs={data.costEstimates} />}

      {/* Industry impacts */}
      {hasImpacts && <IndustryImpactsList impacts={data.industryImpacts} />}

      {/* Timeline */}
      {hasTimelines && <TimelineList timelines={data.timelines} />}

      {/* Entities */}
      {hasEntities && <EntitiesSection entities={data.entities!} />}

      {/* Data date */}
      <p className="type-xs text-gray-400 dark:text-gray-500 mt-3">
        Analysis based on data published{' '}
        {new Date(data.dataAsOf).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {/* Disclaimer */}
      <InsightDisclaimer
        disclaimer={data.disclaimer}
        methodology={data.methodology}
        source={data.source}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function KeyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 p-3">
      <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">{value}</div>
      <div className="type-xs text-gray-500 dark:text-gray-400 aicher-heading-wide">{label}</div>
    </div>
  );
}

function CostEstimatesTable({ costs }: { costs: PreambleCostEstimate[] }) {
  return (
    <div className="mb-4">
      <h3 className="type-xs aicher-heading-wide text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Cost Estimates
      </h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-t-2 border-gray-900 dark:border-gray-300">
            <th className="text-left type-xs aicher-heading text-gray-700 dark:text-gray-300 py-2 pr-4">
              Description
            </th>
            <th className="text-right type-xs aicher-heading text-gray-700 dark:text-gray-300 py-2 pl-4">
              Amount
            </th>
            <th className="text-right type-xs aicher-heading text-gray-700 dark:text-gray-300 py-2 pl-4 hidden sm:table-cell">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {costs.map((cost, i) => (
            <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
              <td className="type-xs text-gray-600 dark:text-gray-400 py-2 pr-4">
                {cost.description}
                {cost.timePeriod && (
                  <span className="text-gray-400 dark:text-gray-500"> ({cost.timePeriod})</span>
                )}
              </td>
              <td className="type-xs text-gray-900 dark:text-gray-100 py-2 pl-4 text-right font-medium whitespace-nowrap">
                {cost.amount}
              </td>
              <td className="type-xs py-2 pl-4 text-right hidden sm:table-cell">
                <CostTypeBadge type={cost.type} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostTypeBadge({ type }: { type: PreambleCostEstimate['type'] }) {
  const styles: Record<typeof type, string> = {
    cost: 'border-[#e11d07] text-[#e11d07]',
    benefit: 'border-[#0a9338] text-[#0a9338]',
    transfer: 'border-gray-500 text-gray-500',
  };

  return (
    <span className={`inline-block border-2 px-1.5 py-0 type-xs aicher-heading ${styles[type]}`}>
      {type}
    </span>
  );
}

function IndustryImpactsList({ impacts }: { impacts: PreambleIndustryImpact[] }) {
  return (
    <div className="mb-4">
      <h3 className="type-xs aicher-heading-wide text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Affected Industries
      </h3>
      <div className="space-y-2">
        {impacts.map((impact, i) => (
          <div key={i} className="border-2 border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="type-sm font-medium text-gray-900 dark:text-gray-100">
                {impact.industry}
              </span>
              <span className="border-2 border-gray-300 dark:border-gray-600 px-1.5 py-0 type-xs text-gray-500 dark:text-gray-400">
                {IMPACT_TYPE_LABELS[impact.impactType]}
              </span>
            </div>
            <p className="type-xs text-gray-600 dark:text-gray-400">{impact.description}</p>
            {impact.estimatedAffectedEntities !== null && (
              <p className="type-xs text-gray-400 dark:text-gray-500 mt-1">
                ~{impact.estimatedAffectedEntities.toLocaleString()} entities affected
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineList({ timelines }: { timelines: PreambleTimeline[] }) {
  return (
    <div className="mb-4">
      <h3 className="type-xs aicher-heading-wide text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Key Dates
      </h3>
      <div className="space-y-1">
        {timelines.map((entry, i) => (
          <div
            key={i}
            className="flex items-baseline gap-3 py-1 border-b border-gray-100 dark:border-gray-800"
          >
            <span className="type-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap min-w-[120px]">
              {entry.date}
            </span>
            <span className="type-xs text-gray-600 dark:text-gray-400">
              {entry.event}
              {entry.isEstimate && (
                <span className="text-gray-400 dark:text-gray-500"> (estimated)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ENTITY_TYPE_STYLES: Record<CivicEntity['type'], string> = {
  ORG: 'border-[#3ea2d4] text-[#3ea2d4]',
  PER: 'border-gray-700 text-gray-700 dark:border-gray-300 dark:text-gray-300',
  LOC: 'border-[#0a9338] text-[#0a9338]',
  MONEY: 'border-[#e11d07] text-[#e11d07]',
  DATE: 'border-gray-500 text-gray-500',
  MISC: 'border-gray-400 text-gray-400',
};

const ENTITY_TYPE_LABELS: Record<CivicEntity['type'], string> = {
  ORG: 'Organizations',
  PER: 'People',
  LOC: 'Locations',
  MONEY: 'Dollar Amounts',
  DATE: 'Dates',
  MISC: 'Other',
};

function EntitiesSection({ entities }: { entities: CivicEntity[] }) {
  const grouped = new Map<CivicEntity['type'], CivicEntity[]>();
  for (const entity of entities) {
    const list = grouped.get(entity.type) ?? [];
    list.push(entity);
    grouped.set(entity.type, list);
  }

  // Display order: ORG, PER, LOC, MONEY, DATE, MISC
  const displayOrder: CivicEntity['type'][] = ['ORG', 'PER', 'LOC', 'MONEY', 'DATE', 'MISC'];

  return (
    <div className="mb-4">
      <h3 className="type-xs aicher-heading-wide text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Extracted Entities
      </h3>
      <div className="space-y-2">
        {displayOrder
          .filter(type => grouped.has(type))
          .map(type => (
            <div key={type}>
              <div className="type-xs text-gray-500 dark:text-gray-400 mb-1">
                {ENTITY_TYPE_LABELS[type]}
              </div>
              <div className="flex flex-wrap gap-1">
                {grouped.get(type)!.map((entity, i) => (
                  <span
                    key={`${entity.text}-${i}`}
                    className={`inline-block border-2 px-2 py-0.5 type-xs ${ENTITY_TYPE_STYLES[type]}`}
                  >
                    {entity.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default PreambleInsightsSection;
