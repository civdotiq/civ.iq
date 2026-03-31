'use client';

import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { CivicAlignmentReport } from '@/types/ai';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';

interface CivicAlignmentTabProps {
  bioguideId: string;
}

interface AlignmentResponse {
  bioguideId: string;
  name: string;
  alignment: CivicAlignmentReport;
  metadata: {
    generatedAt: string;
    dataSources: string[];
    dataQuality: 'complete' | 'partial' | 'degraded';
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

function GapsSection({ gaps }: { gaps: CivicAlignmentReport['gaps'] }) {
  if (gaps.length === 0) {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Gaps Analysis</h3>
        <p className="text-sm text-gray-500">No gaps identified from available data.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Gaps Analysis</h3>
      <div className="space-y-3" role="list" aria-label="Identified gaps">
        {gaps.map((gap, i) => (
          <div key={i} role="listitem" className="border-l-4 border-civiq-blue bg-gray-50 p-4">
            <p className="text-sm text-gray-800">{gap.observation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistrictNeedsSection({ needs }: { needs: CivicAlignmentReport['districtNeeds'] }) {
  if (needs.length === 0) return null;

  const severityStyles = {
    high: 'bg-civiq-red/10 text-civiq-red',
    moderate: 'bg-gray-100 text-gray-600',
    low: 'bg-civiq-blue/10 text-civiq-blue',
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">District Needs</h3>
      <div className="space-y-2" role="list" aria-label="District needs by severity">
        {needs.map((need, i) => (
          <div
            key={i}
            role="listitem"
            className="flex items-center justify-between py-2 border-b border-gray-100"
          >
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900">{need.category}</span>
              <span className="text-sm text-gray-500 ml-2">{need.metric}</span>
              {need.source && <span className="text-xs text-gray-400 ml-2">({need.source})</span>}
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium ${severityStyles[need.severity]}`}>
              {need.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VotingActivitySection({ activity }: { activity: CivicAlignmentReport['votingActivity'] }) {
  const filtered = activity.filter(a => a.totalVotes > 0);
  if (filtered.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Voting Activity</h3>
      <div className="space-y-2" role="list" aria-label="Voting activity by category">
        {filtered.map((item, i) => (
          <div
            key={i}
            role="listitem"
            className="flex items-center justify-between py-2 border-b border-gray-100"
          >
            <span className="text-sm font-medium text-gray-900 flex-1">{item.category}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-civiq-green">{item.yeaVotes} Yea</span>
              <span className="text-civiq-red">{item.nayVotes} Nay</span>
              <span className="text-gray-500">{item.totalVotes} total</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonorProfileSection({ donors }: { donors: CivicAlignmentReport['donorProfile'] }) {
  const topDonors = donors.slice(0, 6);
  if (topDonors.length === 0) return null;

  const maxPercentage = Math.max(...topDonors.map(d => d.percentage), 1);

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Top Donor Sectors</h3>
      <div className="space-y-2">
        {topDonors.map((donor, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 text-sm text-gray-700 truncate">{donor.sector}</span>
            <div
              className="flex-1 bg-gray-200 h-5"
              role="progressbar"
              aria-valuenow={Math.round(donor.percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${donor.sector}: ${Math.round(donor.percentage)}% ($${donor.amount.toLocaleString()})`}
            >
              <div
                className="bg-civiq-blue h-5"
                style={{ width: `${(donor.percentage / maxPercentage) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-700 w-24 text-right">
              ${donor.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CivicAlignmentTab({ bioguideId }: CivicAlignmentTabProps) {
  const { data, error, isLoading, mutate } = useSWR<AlignmentResponse>(
    `/api/representative/${bioguideId}/civic-alignment`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-5 bg-gray-200 w-1/4 mb-3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200"></div>
            <div className="h-16 bg-gray-200"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200"></div>
            <div className="h-8 bg-gray-200"></div>
            <div className="h-8 bg-gray-200"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200"></div>
            <div className="h-6 bg-gray-200"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200"></div>
            <div className="h-6 bg-gray-200"></div>
            <div className="h-6 bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
        <div className="text-gray-600 mb-2">Failed to load civic alignment analysis</div>
        <div className="text-sm text-gray-500 mb-4">
          This analysis cross-references votes, donors, and district needs
        </div>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
          aria-label="Retry loading civic alignment analysis"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  if (!data?.alignment || data.metadata?.dataQuality === 'degraded') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-600 font-medium">Analysis unavailable</p>
        <p className="text-sm text-gray-500 mt-1">
          Insufficient data to generate a civic alignment analysis for this representative.
        </p>
      </div>
    );
  }

  const { alignment } = data;

  return (
    <div className="space-y-6">
      <GapsSection gaps={alignment.gaps} />
      <DistrictNeedsSection needs={alignment.districtNeeds} />
      <VotingActivitySection activity={alignment.votingActivity} />
      <DonorProfileSection donors={alignment.donorProfile} />

      {/* Data Provenance */}
      <DataProvenance
        sources={buildProvenanceSources(data.metadata?.dataSources, data.metadata?.dataQuality)}
        generatedAt={data.metadata?.generatedAt}
        quality={data.metadata?.dataQuality}
      />
    </div>
  );
}

function buildProvenanceSources(
  dataSources?: string[],
  quality?: 'complete' | 'partial' | 'degraded'
): DataSource[] {
  const sources = dataSources ?? ['government sources'];
  return sources.map(name => ({
    name,
    status: quality === 'degraded' ? ('unavailable' as const) : ('available' as const),
  }));
}
