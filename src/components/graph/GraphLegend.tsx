/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';

import { SEMANTIC_COLORS } from '@/lib/constants/chart-colors';

export function GraphLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Compact row — always visible */}
      <div className="flex flex-wrap items-center gap-4 p-3">
        <span className="type-xs font-bold text-gray-500">Nodes:</span>
        <LegendItem shape="circle" color={SEMANTIC_COLORS.democrat} label="Democrat" />
        <LegendItem shape="circle" color="#e11d07" label="Republican" />
        <LegendItem shape="rect" color="#9ca3af" label="Bill" />
        <LegendItem shape="diamond" color="#3ea2d4" label="Committee" />
        <LegendItem shape="square" color="#d97706" label="Organization" />
        <LegendItem shape="circle" color="#374151" label="Agency" />
        <LegendItem shape="circle" color="#d1d5db" label="Sector" />

        <span className="type-xs font-bold text-gray-500 ml-4">Edges:</span>
        <EdgeLegendItem color="#0a9338" label="Donations" />
        <EdgeLegendItem color="#d97706" label="Lobbying" />
        <EdgeLegendItem color="#3ea2d4" label="Votes/Sponsorship" />
        <EdgeLegendItem color="#9ca3af" dashed label="Structural" />

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto type-xs text-[#3ea2d4] hover:underline"
        >
          {expanded ? 'Less' : 'Data sources & confidence'}
        </button>
      </div>

      {/* Expanded panel — data sources and confidence guide */}
      {expanded && (
        <div className="border-t-2 border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* Confidence guide */}
          <div>
            <h4 className="type-xs font-bold text-gray-500 mb-1">Confidence levels</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1">
                <span className="type-xs font-bold text-[#0a9338]">High (80-100%)</span>
                <span className="type-xs text-gray-500">Official government record</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="type-xs font-bold text-[#d97706]">Medium (50-79%)</span>
                <span className="type-xs text-gray-500">Name or entity matching</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="type-xs font-bold text-[#e11d07]">Low (&lt;50%)</span>
                <span className="type-xs text-gray-500">ML classification or fuzzy match</span>
              </div>
            </div>
          </div>

          {/* Data sources */}
          <div>
            <h4 className="type-xs font-bold text-gray-500 mb-1">Data sources</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <SourceItem
                label="Campaign contributions"
                source="FEC.gov"
                url="https://www.fec.gov/data/"
              />
              <SourceItem
                label="Lobbying disclosures"
                source="Senate LDA"
                url="https://lda.gov/filings/public/filing/search/"
              />
              <SourceItem
                label="Bills, votes, committees"
                source="Congress.gov"
                url="https://www.congress.gov/"
              />
              <SourceItem
                label="Member biographies"
                source="Bioguide"
                url="https://bioguide.congress.gov/"
              />
              <SourceItem label="Sector classification" source="CIV.IQ analysis" />
              <SourceItem label="Oversight jurisdiction" source="Congressional Research Service" />
            </div>
          </div>

          <p className="type-xs text-gray-400">
            Every connection links to its original data source. Click any edge to verify.
          </p>
        </div>
      )}
    </div>
  );
}

function LegendItem({
  shape,
  color,
  label,
}: {
  shape: 'circle' | 'rect' | 'diamond' | 'square';
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <svg width="16" height="16" viewBox="0 0 16 16">
        {shape === 'circle' && (
          <circle cx="8" cy="8" r="6" fill={color} stroke="#fff" strokeWidth="2" />
        )}
        {shape === 'rect' && (
          <rect x="2" y="4" width="12" height="8" fill={color} stroke="#fff" strokeWidth="2" />
        )}
        {shape === 'diamond' && (
          <polygon points="8,2 14,8 8,14 2,8" fill={color} stroke="#fff" strokeWidth="2" />
        )}
        {shape === 'square' && (
          <rect x="2" y="2" width="12" height="12" fill={color} stroke="#fff" strokeWidth="2" />
        )}
      </svg>
      <span className="type-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function EdgeLegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <svg width="24" height="16" viewBox="0 0 24 16">
        <line
          x1="2"
          y1="8"
          x2="22"
          y2="8"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '4,3' : undefined}
        />
      </svg>
      <span className="type-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function SourceItem({ label, source, url }: { label: string; source: string; url?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="type-xs text-gray-600 dark:text-gray-400">{label}:</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="type-xs text-[#3ea2d4] hover:underline"
        >
          {source}
        </a>
      ) : (
        <span className="type-xs text-gray-500">{source}</span>
      )}
    </div>
  );
}
