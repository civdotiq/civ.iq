/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * ShareButtonDemo - Visual demonstration of all share components
 *
 * This file demonstrates how to use the social sharing system.
 * NOT intended for production use - for documentation and testing only.
 */

import React from 'react';
import { ShareButton, ShareIconButton, ShareTextButton } from './ShareButton';
import {
  ShareableDataCard,
  ShareableHeroStat,
  ShareableStatRow,
  ShareableBarChart,
} from './ShareableDataCard';
import { ShareData } from '@/lib/social/share-utils';

export function ShareButtonDemo() {
  // Example representative data
  const exampleRep = {
    name: 'Amy Klobuchar',
    party: 'Democratic',
    state: 'MN',
    bioguideId: 'K000367',
    chamber: 'Senate' as const,
  };

  // Example share data for finance section
  const financeShareData: ShareData = {
    representative: exampleRep,
    section: 'finance',
    stats: {
      totalRaised: 5200000,
      individualPercent: 67,
      pacPercent: 33,
      topIndustry: 'Technology',
      topIndustryAmount: 340000,
    },
  };

  // Example share data for voting section
  const votingShareData: ShareData = {
    representative: exampleRep,
    section: 'voting',
    stats: {
      partyAlignment: 92,
      bipartisanVotes: 18,
      totalVotes: 200,
      alignmentTrend: 'stable',
    },
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50">
      <div>
        <h1 className="text-3xl font-bold mb-2">Social Sharing Components Demo</h1>
        <p className="text-gray-600">Rams-inspired social sharing system for CIV.IQ</p>
      </div>

      {/* Button Variants */}
      <section>
        <h2 className="text-2xl font-bold mb-4">ShareButton Variants</h2>
        <div className="flex gap-4 items-center">
          <div>
            <p className="text-sm text-gray-600 mb-2">Default</p>
            <ShareButton data={financeShareData} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Minimal (Icon Only)</p>
            <ShareIconButton data={financeShareData} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Text Only</p>
            <ShareTextButton data={financeShareData} />
          </div>
        </div>
      </section>

      {/* Data Visualization Components */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Data Visualization Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border-2 border-gray-300 p-6">
            <h3 className="font-bold mb-4">Hero Stat</h3>
            <ShareableHeroStat value="$5.2M" label="Total Raised" sublabel="Cycle 2024" />
          </div>

          <div className="bg-white border-2 border-gray-300 p-6">
            <h3 className="font-bold mb-4">Stat Rows</h3>
            <ShareableStatRow label="Party Alignment" value="92%" trend="up" />
            <ShareableStatRow label="Bipartisan Votes" value="18" trend="stable" />
            <ShareableStatRow label="Total Votes" value="200" />
          </div>
        </div>

        <div className="bg-white border-2 border-gray-300 p-6 mt-4">
          <h3 className="font-bold mb-4">Bar Chart</h3>
          <ShareableBarChart
            data={[
              {
                label: 'Individual Contributors',
                value: 3484000,
                percentage: 67,
                color: 'blue',
              },
              {
                label: 'PAC Contributions',
                value: 1716000,
                percentage: 33,
                color: 'gray',
              },
            ]}
          />
        </div>
      </section>

      {/* Complete Shareable Cards */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Complete Shareable Data Cards</h2>

        <div className="space-y-8">
          {/* Finance Card */}
          <ShareableDataCard
            representative={exampleRep}
            section="finance"
            title="Campaign Finance"
            stats={financeShareData.stats}
          >
            <ShareableHeroStat value="$5.2M" label="Total Raised" sublabel="Cycle 2024" />

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Funding Sources
              </h4>
              <ShareableBarChart
                data={[
                  {
                    label: 'Individual Contributors',
                    value: 3484000,
                    percentage: 67,
                    color: 'blue',
                  },
                  {
                    label: 'PAC Contributions',
                    value: 1716000,
                    percentage: 33,
                    color: 'gray',
                  },
                ]}
              />
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Top Industry
              </h4>
              <ShareableStatRow label="Technology" value="$340K" />
            </div>
          </ShareableDataCard>

          {/* Voting Card */}
          <ShareableDataCard
            representative={exampleRep}
            section="voting"
            title="Voting Record"
            stats={votingShareData.stats}
          >
            <ShareableHeroStat value="92%" label="Party Alignment" />

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Voting Patterns
              </h4>
              <ShareableStatRow label="With Party" value="184" />
              <ShareableStatRow label="Against Party" value="16" />
              <ShareableStatRow label="Bipartisan" value="18" />
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Trend
              </h4>
              <ShareableStatRow label="Recent Alignment" value="92%" trend="stable" />
            </div>
          </ShareableDataCard>
        </div>
      </section>

      {/* Design Specifications */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Design Specifications</h2>
        <div className="bg-white border-2 border-gray-300 p-6">
          <h3 className="font-bold mb-4">Ulm School / Dieter Rams Principles</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Minimalism:</strong> No decorative elements, only functional components
            </li>
            <li>
              <strong>Geometry:</strong> Rectangular cards, 2px borders, 8px grid system
            </li>
            <li>
              <strong>Typography:</strong> System sans-serif, 2-3 sizes maximum
            </li>
            <li>
              <strong>Color:</strong> Limited palette (civiq-red, civiq-green, civiq-blue)
            </li>
            <li>
              <strong>Hierarchy:</strong> Bold for data, regular for labels
            </li>
            <li>
              <strong>Interaction:</strong> Simple hover states, no complex animations
            </li>
          </ul>

          <div className="mt-6">
            <h4 className="font-bold mb-4">Brand Colors</h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="h-16 bg-civiq-red border-2 border-gray-300 mb-2" />
                <p className="text-xs font-mono">#e11d07</p>
                <p className="text-xs text-gray-600">civiq-red</p>
              </div>
              <div className="flex-1">
                <div className="h-16 bg-civiq-green border-2 border-gray-300 mb-2" />
                <p className="text-xs font-mono">#0a9338</p>
                <p className="text-xs text-gray-600">civiq-green</p>
              </div>
              <div className="flex-1">
                <div className="h-16 bg-civiq-blue border-2 border-gray-300 mb-2" />
                <p className="text-xs font-mono">#3ea2d4</p>
                <p className="text-xs text-gray-600">civiq-blue</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
