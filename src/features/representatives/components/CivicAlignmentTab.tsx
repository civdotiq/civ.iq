'use client';

import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { CivicAlignmentReport } from '@/types/ai';

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
      <div className="space-y-3">
        {gaps.map((gap, i) => (
          <div key={i} className="border-l-4 border-civiq-blue bg-gray-50 p-4">
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
    high: 'bg-red-100 text-red-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">District Needs</h3>
      <div className="space-y-2">
        {needs.map((need, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900">{need.category}</span>
              <span className="text-sm text-gray-500 ml-2">{need.metric}</span>
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
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900 flex-1">{item.category}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-700">{item.yeaVotes} Yea</span>
              <span className="text-red-700">{item.nayVotes} Nay</span>
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
            <div className="flex-1 bg-gray-200 h-5">
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
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <div className="text-gray-600 mb-2">Failed to load civic alignment analysis</div>
        <div className="text-sm text-gray-500 mb-4">
          This analysis cross-references votes, donors, and district needs
        </div>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data?.alignment || data.metadata?.dataQuality === 'degraded') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
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

      {/* Data Quality Note */}
      {data.metadata?.dataQuality === 'partial' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200">
          <p className="text-xs text-yellow-800">
            Some data sources were unavailable. Analysis is based on partial data.
          </p>
        </div>
      )}

      {/* Attribution */}
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Cross-referencing data from{' '}
          {data.metadata?.dataSources?.join(', ') || 'government sources'}. Analysis generated{' '}
          {data.metadata?.generatedAt
            ? new Date(data.metadata.generatedAt).toLocaleDateString()
            : 'recently'}
          .
        </p>
      </div>
    </div>
  );
}
