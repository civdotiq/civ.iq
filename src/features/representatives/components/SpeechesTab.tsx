/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { FloorSpeech, SpeechesResponse } from '@/types/govinfo';

interface SpeechesTabProps {
  bioguideId: string;
}

const INITIAL_PAGE_SIZE = 20;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Format a date string as "Jan 10, 2024" */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Readable label for a CREC section */
function sectionLabel(section: string): string {
  switch (section) {
    case 'EXTENSIONS':
      return 'Extension of Remarks';
    case 'HOUSE':
      return 'House Floor';
    case 'SENATE':
      return 'Senate Floor';
    default:
      return section;
  }
}

/** Readable label for a CREC sub-category */
function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    ALLOTHER: 'General',
    HONORING: 'Honoring',
    RECOGNIZING: 'Recognizing',
    PERSONALEXPLAIN: 'Personal Explanation',
    CASTATEMENT: 'Constitutional Authority',
    VOTEEXPLAIN: 'Vote Explanation',
    SSTATEMENTSIND: 'Individual Statement',
    SPETANDMEM: 'Petition or Memorial',
    SLEGISLATIVE: 'Legislative Business',
  };
  return map[category] ?? category.charAt(0) + category.slice(1).toLowerCase();
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border-2 border-gray-200 p-3">
            <div className="h-8 bg-gray-200 w-16 mb-2" />
            <div className="h-3 bg-gray-100 w-24" />
          </div>
        ))}
      </div>
      <div className="h-4 bg-gray-200 w-48" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="border-2 border-gray-200 p-12" />
      ))}
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-2 border-gray-200 p-3">
      <div className="aicher-heading type-2xl text-gray-900">{value}</div>
      <div className="type-xs text-gray-500 aicher-heading-wide">{label}</div>
    </div>
  );
}

function SpeechCard({ speech }: { speech: FloorSpeech }) {
  return (
    <div className="border-2 border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={speech.govInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="type-sm font-medium text-[#3ea2d4] hover:underline aicher-focus"
          >
            {speech.title}
          </a>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <span className="type-xs text-gray-500">{formatDate(speech.date)}</span>
            <span className="type-xs text-gray-500">{sectionLabel(speech.section)}</span>
            {speech.category && (
              <span className="type-xs text-gray-400">{categoryLabel(speech.category)}</span>
            )}
          </div>
        </div>
        {speech.pdfUrl && (
          <a
            href={speech.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="type-xs text-[#3ea2d4] aicher-heading-wide flex-shrink-0 py-1 aicher-focus"
            aria-label={`PDF of ${speech.title}`}
          >
            PDF
          </a>
        )}
      </div>

      {speech.relatedBills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {speech.relatedBills.map(bill => (
            <span
              key={`${bill.type}${bill.number}`}
              className="inline-flex items-center type-xs border-2 border-gray-200 px-2 py-0.5 text-gray-600"
            >
              {bill.type} {bill.number}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpeechesTab({ bioguideId }: SpeechesTabProps) {
  const [filter, setFilter] = useState<'all' | 'HOUSE' | 'SENATE' | 'EXTENSIONS'>('all');

  const { data, error, isLoading } = useSWR<SpeechesResponse>(
    `/api/representative/${bioguideId}/speeches?pageSize=${INITIAL_PAGE_SIZE}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">Floor speech data temporarily unavailable.</p>
        <p className="type-xs text-gray-400 mt-2">Please try again later.</p>
      </div>
    );
  }

  if (!data?.success || data.speeches.length === 0) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">
          No floor speeches found in the Congressional Record.
        </p>
        <p className="type-xs text-gray-400 mt-2">
          This searches the GovInfo.gov Congressional Record collection. Some members have few or no
          indexed speeches.
        </p>
      </div>
    );
  }

  const speeches = data.speeches;
  const filtered = filter === 'all' ? speeches : speeches.filter(s => s.section === filter);

  // Count by section for filter badges
  const counts = {
    all: speeches.length,
    HOUSE: speeches.filter(s => s.section === 'HOUSE').length,
    SENATE: speeches.filter(s => s.section === 'SENATE').length,
    EXTENSIONS: speeches.filter(s => s.section === 'EXTENSIONS').length,
  };

  // Only show filter options that have results
  const filters = (['all', 'HOUSE', 'SENATE', 'EXTENSIONS'] as const).filter(f => counts[f] > 0);

  return (
    <div className="space-y-6">
      {/* Blind-spot annotation */}
      <p className="type-xs text-gray-400 leading-relaxed">
        Indexed speeches from the Congressional Record. Does not capture hallway conversations,
        private negotiations, or committee markup discussions that happen off the floor.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBox value={String(data.pagination.total)} label="Total indexed entries" />
        <StatBox value={String(speeches.length)} label="Shown here" />
        <StatBox value={speeches[0] ? formatDate(speeches[0].date) : '—'} label="Most recent" />
      </div>

      {/* Section filter */}
      {filters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`type-xs aicher-heading-wide px-3 py-1.5 border-2 min-h-[36px] aicher-focus transition-colors ${
                filter === f
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : sectionLabel(f)} ({counts[f]})
            </button>
          ))}
        </div>
      )}

      {/* Speech list */}
      <div className="space-y-3">
        {filtered.map(speech => (
          <SpeechCard key={speech.id} speech={speech} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="border-2 border-gray-200 p-6 text-center">
          <p className="type-sm text-gray-500">No speeches in this section.</p>
        </div>
      )}

      {/* Data source attribution */}
      <div className="type-xs text-gray-400 space-y-1">
        <p>
          Source: GovInfo.gov Congressional Record (CREC) collection.
          {data.metadata.dataAsOf && ` Data as of ${formatDate(data.metadata.dataAsOf)}.`}
        </p>
        <p>
          The Congressional Record is the official journal of Congress. It records floor proceedings
          but not committee hearings or closed sessions.
        </p>
      </div>
    </div>
  );
}
