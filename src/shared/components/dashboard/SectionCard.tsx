/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { FC } from 'react';
import { SectionCardConfig } from './types';

interface SectionCardProps {
  section: SectionCardConfig;
  onSelect: (id: string) => void;
}

export const SectionCard: FC<SectionCardProps> = ({ section, onSelect }) => {
  const { id, title, description, icon, stats, loading } = section;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="bg-white border-2 border-black hover:border-[#3ea2d4] transition-colors cursor-pointer p-4 sm:p-6 text-left w-full aicher-focus min-h-[44px]"
      aria-label={`${title} — ${description}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-gray-700 flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        <h3 className="aicher-heading type-lg text-gray-900">{title}</h3>
      </div>

      {/* Description */}
      <p className="type-xs text-gray-500 mb-4">{description}</p>

      {/* Stats */}
      {stats.length > 0 && (
        <div
          className={`grid gap-4 ${stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
        >
          {stats.map(stat => (
            <div key={stat.label}>
              {loading ? (
                <div aria-hidden="true">
                  <div className="bg-gray-200 animate-pulse h-7 w-16 mb-1" />
                  <div className="bg-gray-200 animate-pulse h-3 w-12" />
                </div>
              ) : (
                <>
                  <div className="type-2xl font-bold text-gray-900">
                    {stat.value !== undefined ? stat.value : '\u2014'}
                  </div>
                  <div className="type-xs aicher-heading-wide text-gray-500 uppercase">
                    {stat.label}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explore affordance */}
      <div className="mt-4 type-xs aicher-heading-wide text-[#3ea2d4]">Explore</div>
    </button>
  );
};

SectionCard.displayName = 'SectionCard';
