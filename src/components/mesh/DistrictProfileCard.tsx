/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Intelligence Profile Card
 *
 * Displays the computed district profile:
 * - Economic DNA: top sectors as horizontal bars
 * - Representation Alignment: overall + breakdown scores
 * - Peer Comparison: similar districts alignment context
 * - Legislative Exposure: pending bills affecting the district
 *
 * Aicher/Ulm design: no gradients, no shadows, 8px grid, Braun Linear.
 */

'use client';

import { useState, useEffect } from 'react';
import TemporalEdgeChart from './TemporalEdgeChart';
import type {
  DistrictProfile,
  RepresentationAlignment,
  SectorConcentration,
} from '@/lib/mesh/district-profile-types';
import { displaySector } from '@/lib/mesh/sector-display';

interface DistrictProfileCardProps {
  districtId: string;
}

export default function DistrictProfileCard({ districtId }: DistrictProfileCardProps) {
  const [profile, setProfile] = useState<DistrictProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await fetch(`/api/mesh/district/${districtId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('District profile not available');
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        const data: DistrictProfile = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    if (districtId) fetchProfile();
  }, [districtId]);

  if (loading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-sm text-gray-500">Loading district profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Your District at a Glance</h2>
        <p className="text-sm text-gray-500">
          How well your elected representatives match your district&apos;s economic needs
        </p>
      </div>

      {/* Narrative */}
      <p className="text-sm text-gray-700 leading-relaxed">{profile.narrative}</p>

      {/* Top Industries */}
      {profile.topSectors.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
            Top Industries in Your District
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Where the money flows — the industries with the most economic activity in your area
          </p>
          <div className="space-y-2">
            {profile.topSectors.slice(0, 6).map(sector => (
              <SectorBar key={sector.sector} sector={sector} />
            ))}
          </div>
          {profile.federalSpendingTotal > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Your district receives ${(profile.federalSpendingTotal / 1e6).toFixed(1)}M in federal
              spending
              {profile.federalSpendingPerCapita !== null &&
                ` — about $${profile.federalSpendingPerCapita.toFixed(0)} per person`}
            </p>
          )}
        </section>
      )}

      {/* Representative Scores */}
      {profile.representatives.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
            How Well Does Your Rep Represent You?
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            A higher score means your representative&apos;s votes, committee work, and funding
            sources more closely match your district&apos;s economic needs. This is a statistical
            pattern — not a judgment of performance.
          </p>
          <div className="space-y-4">
            {profile.representatives.map(rep => (
              <RepAlignmentRow key={rep.bioguideId} rep={rep} />
            ))}
          </div>
        </section>
      )}

      {/* Funding Trends */}
      {profile.alignmentHistory.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
            Campaign Funding Over Time
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            How campaign donations to your representatives have changed quarter by quarter
          </p>
          <TemporalEdgeChart
            buckets={profile.alignmentHistory}
            label="Donation activity over time"
            height={56}
          />
        </section>
      )}

      {/* Similar Districts */}
      {profile.peerDistricts.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
            Districts With Similar Economies
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Other congressional districts where the mix of industries looks like yours
          </p>
          <div className="space-y-1">
            {profile.peerDistricts.map(peer => (
              <div key={peer.districtId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{peer.districtId}</span>
                <span className="text-gray-500 text-xs">
                  {(peer.economicSimilarity * 100).toFixed(0)}% similar
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bills That Could Affect Your District */}
      {profile.pendingBillExposure.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">
            Bills That Could Affect Your District
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Legislation currently in Congress that relates to your district&apos;s top industries
          </p>
          <ul className="space-y-2">
            {profile.pendingBillExposure.slice(0, 5).map(bill => (
              <li key={bill.billId} className="text-sm">
                <span className="font-medium text-gray-900">{bill.billId}</span>
                <span className="text-gray-500 ml-2">
                  {bill.title.length > 80 ? bill.title.slice(0, 80) + '...' : bill.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* How We Calculate This */}
      <footer className="border-t-2 border-gray-200 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-1">How we calculate this</p>
        <p className="text-xs text-gray-400">
          We compare your district&apos;s economy (from federal spending and employment data) with
          your representative&apos;s voting record, committee seats, and campaign donors. Data
          confidence: {(profile.confidence * 100).toFixed(0)}%.
        </p>
        <p className="text-xs text-gray-400 mt-1">{profile.disclaimer}</p>
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function SectorBar({ sector }: { sector: SectorConcentration }) {
  const pct = Math.min(sector.economicShare * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-40 truncate flex-shrink-0">
        {displaySector(sector.sector)}
      </span>
      <div className="flex-1 h-3 bg-gray-100 border-2 border-gray-300">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: '#3ea2d4',
          }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
    </div>
  );
}

function RepAlignmentRow({ rep }: { rep: RepresentationAlignment }) {
  const score = rep.overallAlignment;
  const scoreColor =
    score === null ? '#999' : score >= 0.7 ? '#0a9338' : score >= 0.4 ? '#b45309' : '#e11d07';

  const trendIndicator =
    rep.alignmentTrend === 'increasing' ? ' +' : rep.alignmentTrend === 'decreasing' ? ' -' : '';

  return (
    <div className="border-2 border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          {rep.name} ({rep.party})
        </span>
        <span className="text-lg font-bold" style={{ color: scoreColor }}>
          {score !== null ? `${(score * 100).toFixed(0)}%` : '--'}
          {trendIndicator && <span className="text-xs ml-1">{trendIndicator}</span>}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <ScoreCell label="Votes for your industries" value={rep.voteAlignmentScore} />
        <ScoreCell label="Sits on relevant committees" value={rep.jurisdictionCoverage} />
        <ScoreCell label="Funded by local sectors" value={rep.fundingAlignmentScore} />
      </div>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">
        {value !== null ? `${(value * 100).toFixed(0)}%` : '--'}
      </div>
    </div>
  );
}
