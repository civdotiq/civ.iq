/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { ShareButton } from '@/components/shared/social/ShareButton';
import type { ShareSection } from '@/lib/social/share-utils';

interface CardShellProps {
  /** Party for accent color: Democrat, Republican, Independent */
  party: string;
  /** Card type label displayed top-left */
  label: string;
  /** Share section key for share button */
  shareSection: ShareSection;
  /** Representative data for share button */
  representative: {
    name: string;
    party: string;
    state: string;
    bioguideId: string;
    chamber?: 'House' | 'Senate';
    district?: string;
  };
  children: React.ReactNode;
}

function getPartyAccentColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'bg-party-dem';
  if (p.includes('republican')) return 'bg-civiq-red';
  if (p.includes('independent')) return 'bg-party-ind';
  return 'bg-gray-500';
}

export function CardShell({
  party,
  label: _label,
  shareSection,
  representative,
  children,
}: CardShellProps) {
  const accentColor = getPartyAccentColor(party);

  return (
    <div className="border-2 border-black bg-white">
      {/* 8px party-color accent bar */}
      <div className={`h-2 ${accentColor}`} />

      {/* Card content */}
      <div className="p-4 sm:p-6">{children}</div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t-2 border-gray-200 px-4 py-3 sm:px-6">
        <span className="aicher-heading-wide type-xs text-gray-500">CIV.IQ</span>
        <ShareButton data={{ representative, section: shareSection }} variant="minimal" />
      </div>
    </div>
  );
}
