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
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-2/3 mb-4" />
        <div className="h-32 bg-gray-200 border-2 border-gray-300" />
      </div>
    );
  }

  if (error || !profile) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">District Intelligence Profile</h2>
        <p className="text-sm text-gray-500">
          Alignment between your representatives and district economic interests
        </p>
      </div>

      {/* Narrative */}
      <p className="text-sm text-gray-700 leading-relaxed">{profile.narrative}</p>

      {/* Economic DNA */}
      {profile.topSectors.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
            Economic DNA
          </h3>
          <div className="space-y-2">
            {profile.topSectors.slice(0, 6).map(sector => (
              <SectorBar key={sector.sector} sector={sector} />
            ))}
          </div>
          {profile.federalSpendingTotal > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Federal spending: ${(profile.federalSpendingTotal / 1e6).toFixed(1)}M
              {profile.federalSpendingPerCapita !== null &&
                ` ($${profile.federalSpendingPerCapita.toFixed(0)}/capita)`}
            </p>
          )}
        </section>
      )}

      {/* Representation Alignment */}
      {profile.representatives.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
            Representation Alignment
          </h3>
          <div className="space-y-4">
            {profile.representatives.map(rep => (
              <RepAlignmentRow key={rep.bioguideId} rep={rep} />
            ))}
          </div>
        </section>
      )}

      {/* Temporal History */}
      {profile.alignmentHistory.length > 0 && (
        <section>
          <TemporalEdgeChart
            buckets={profile.alignmentHistory}
            label="Donation activity over time"
            height={56}
          />
        </section>
      )}

      {/* Peer Comparison */}
      {profile.peerDistricts.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
            Similar Districts
          </h3>
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

      {/* Legislative Exposure */}
      {profile.pendingBillExposure.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
            Pending Legislation
          </h3>
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

      {/* Methodology */}
      <footer className="border-t-2 border-gray-200 pt-3">
        <p className="text-xs text-gray-400">
          Confidence: {(profile.confidence * 100).toFixed(0)}% | {profile.methodology}
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
      <span className="text-xs text-gray-600 w-40 truncate flex-shrink-0">{sector.sector}</span>
      <div className="flex-1 h-3 bg-gray-100 border border-gray-300">
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
        <ScoreCell label="Vote alignment" value={rep.voteAlignmentScore} />
        <ScoreCell label="Committee coverage" value={rep.jurisdictionCoverage} />
        <ScoreCell label="Funding match" value={rep.fundingAlignmentScore} />
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
