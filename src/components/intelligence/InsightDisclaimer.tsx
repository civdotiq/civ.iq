/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';

/**
 * InsightDisclaimer — collapsible disclaimer + methodology section.
 *
 * Always shows the disclaimer text. Methodology is expandable
 * via "How was this computed?" toggle.
 */

interface InsightDisclaimerProps {
  disclaimer: string;
  methodology: string;
  source: 'ai-generated' | 'statistical-fallback';
  className?: string;
}

export function InsightDisclaimer({
  disclaimer,
  methodology,
  source,
  className = '',
}: InsightDisclaimerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-t-2 border-gray-200 pt-3 mt-4 ${className}`}>
      <p className="type-xs text-gray-500">{disclaimer}</p>

      <button
        onClick={() => setExpanded(prev => !prev)}
        className="type-xs text-[#3ea2d4] aicher-heading-wide mt-2 py-2 min-h-[44px] inline-flex items-center aicher-focus"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide methodology' : 'How was this computed?'}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-gray-50">
          <p className="type-xs text-gray-600">{methodology}</p>
          <p className="type-xs text-gray-400 mt-2">
            Source: {source === 'ai-generated' ? 'AI-generated narrative' : 'Statistical summary'}
          </p>
        </div>
      )}
    </div>
  );
}
