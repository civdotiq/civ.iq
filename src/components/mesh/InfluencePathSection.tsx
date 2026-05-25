/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Connection Tracer
 *
 * Lets citizens trace documented connections between organizations
 * and congressional committees. Uses human-readable inputs (dropdowns
 * and plain-text search) instead of canonical graph IDs.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import InfluencePathView from './InfluencePathView';
import { COMMITTEE_ID_MAP } from '@/types/committee';
import type { InfluenceScore } from '@/lib/mesh/propagation/path-scorer';

// ── Featured connections (editorial prompts with real data) ──────────

const FEATURED_CONNECTIONS = [
  {
    orgName: 'Lockheed Martin',
    orgSlug: 'lockheed-martin',
    committeeName: 'Senate Armed Services',
    committeeCode: 'SSAS',
    description:
      'The largest U.S. defense contractor and the committee that oversees defense spending and military policy.',
  },
  {
    orgName: 'American Medical Assn',
    orgSlug: 'american-medical-assn',
    committeeName: 'Senate Health, Education, Labor and Pensions',
    committeeCode: 'SSHR',
    description:
      "The largest physicians' organization and the committee that shapes healthcare and insurance legislation.",
  },
  {
    orgName: 'National Assn of Realtors',
    orgSlug: 'national-assn-of-realtors',
    committeeName: 'Senate Banking, Housing, and Urban Affairs',
    committeeCode: 'SSBK',
    description:
      'The largest U.S. trade association by membership and the committee overseeing housing and mortgage policy.',
  },
  {
    orgName: 'Boeing',
    orgSlug: 'boeing',
    committeeName: 'House Armed Services',
    committeeCode: 'HSAS',
    description:
      'A major defense and aerospace manufacturer and the House committee overseeing military contracts and procurement.',
  },
];

// ── Committee options (from static map, grouped by chamber) ──────────

interface CommitteeOption {
  code: string;
  name: string;
  chamber: string;
}

/** Codes used by featured connections — prefer these over alternates when deduping. */
const PREFERRED_CODES = new Set(FEATURED_CONNECTIONS.map(f => f.committeeCode));

function getCommitteeOptions(): CommitteeOption[] {
  // Group by name, preferring codes used in featured connections
  const byName = new Map<string, CommitteeOption>();

  for (const [code, info] of Object.entries(COMMITTEE_ID_MAP)) {
    const existing = byName.get(info.name);
    if (!existing || PREFERRED_CODES.has(code)) {
      byName.set(info.name, { code, name: info.name, chamber: info.chamber });
    }
  }

  // Sort by chamber, then by name
  return [...byName.values()].sort((a, b) => {
    if (a.chamber !== b.chamber) return a.chamber.localeCompare(b.chamber);
    return a.name.localeCompare(b.name);
  });
}

// ── Slugify organization name to canonical ID ────────────────────────

function slugifyOrg(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Component ────────────────────────────────────────────────────────

export function InfluencePathSection() {
  const [orgInput, setOrgInput] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [result, setResult] = useState<InfluenceScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const committeeOptions = useMemo(() => getCommitteeOptions(), []);

  const runTrace = useCallback(
    async (orgSlug?: string, cmteCode?: string) => {
      const effectiveOrg = orgSlug ?? slugifyOrg(orgInput);
      const effectiveCmte = cmteCode ?? selectedCommittee;

      if (!effectiveOrg || !effectiveCmte) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const params = new URLSearchParams({
          from: `org:${effectiveOrg}`,
          to: `cmte:${effectiveCmte}`,
          maxDepth: '3',
        });
        const res = await fetch(`/api/mesh/influence/path?${params}`);

        if (!res.ok) {
          setError(
            'Something went wrong tracing connections. The data sources may be temporarily unavailable — please try again.'
          );
          return;
        }

        const data: InfluenceScore = await res.json();
        setResult(data);
      } catch {
        setError(
          'Connection timed out. The data sources may be slow — please try again in a moment.'
        );
      } finally {
        setLoading(false);
      }
    },
    [orgInput, selectedCommittee]
  );

  const handleFeaturedClick = (orgSlug: string, cmteCode: string) => {
    const feat = FEATURED_CONNECTIONS.find(f => f.orgSlug === orgSlug);
    if (feat) setOrgInput(feat.orgName);
    setSelectedCommittee(cmteCode);
    runTrace(orgSlug, cmteCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && orgInput.trim() && selectedCommittee) {
      e.preventDefault();
      runTrace();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          Trace Connections
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          See documented lobbying and financial connections between an organization and a
          congressional committee, based on FEC filings and Senate lobbying disclosures.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Organization input */}
          <div>
            <label
              htmlFor="org-input"
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            >
              Organization
            </label>
            <input
              id="org-input"
              type="text"
              value={orgInput}
              onChange={e => setOrgInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Lockheed Martin, Boeing, Pfizer"
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:border-[#3ea2d4] focus:outline-none"
            />
          </div>

          {/* Committee dropdown */}
          <div>
            <label
              htmlFor="cmte-select"
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
            >
              Congressional committee
            </label>
            <select
              id="cmte-select"
              value={selectedCommittee}
              onChange={e => setSelectedCommittee(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:border-[#3ea2d4] focus:outline-none"
            >
              <option value="">Select a committee</option>
              <CommitteeOptGroups options={committeeOptions} />
            </select>
          </div>
        </div>

        <button
          onClick={() => runTrace()}
          disabled={loading || !orgInput.trim() || !selectedCommittee}
          className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3ea2d4]/80 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#3ea2d4]"
        >
          {loading ? 'Tracing...' : 'Trace Connections'}
        </button>

        {error && <p className="text-xs text-amber-600 mt-3">{error}</p>}
      </div>

      {/* Results */}
      {result && <InfluencePathView result={result} />}

      {/* Featured connections (shown when no result yet) */}
      {!result && !loading && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
            Notable connections
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Select one to see documented lobbying and financial ties, or search your own above.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURED_CONNECTIONS.map(feat => (
              <button
                key={feat.orgSlug + feat.committeeCode}
                disabled={loading}
                onClick={() => handleFeaturedClick(feat.orgSlug, feat.committeeCode)}
                className="text-left border-2 border-gray-200 dark:border-gray-600 p-3 hover:border-[#3ea2d4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {feat.orgName} &rarr; {feat.committeeName}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feat.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Committee dropdown optgroups ─────────────────────────────────────

function CommitteeOptGroups({ options }: { options: CommitteeOption[] }) {
  const chambers = ['Senate', 'House', 'Joint'];

  return (
    <>
      {chambers.map(chamber => {
        const chamberOpts = options.filter(o => o.chamber === chamber);
        if (chamberOpts.length === 0) return null;
        return (
          <optgroup key={chamber} label={chamber}>
            {chamberOpts.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
