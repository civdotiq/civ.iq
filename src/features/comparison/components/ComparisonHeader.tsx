'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface ComparisonHeaderProps {
  selectedReps: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    chamber: 'House' | 'Senate';
  }>;
  onClear: () => void;
  onRemove?: (bioguideId: string) => void;
}

function getPartyBorderColor(party: string): string {
  if (party === 'Democrat' || party === 'Democratic') return 'border-[#0a9338]';
  if (party === 'Republican') return 'border-[#e11d07]';
  return 'border-gray-500';
}

export default function ComparisonHeader({
  selectedReps,
  onClear,
  onRemove,
}: ComparisonHeaderProps) {
  if (selectedReps.length === 0) return null;

  return (
    <div className="border-b-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedReps.length} selected:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedReps.map(rep => (
                <span
                  key={rep.bioguideId}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-l-4 ${getPartyBorderColor(rep.party)} border border-gray-300 dark:border-gray-600`}
                >
                  {rep.name}
                  <span className="text-xs text-gray-500 dark:text-gray-400">{rep.state}</span>
                  {onRemove && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onRemove(rep.bioguideId);
                      }}
                      className="ml-1 text-gray-400 hover:text-[#e11d07] font-bold text-xs leading-none"
                      aria-label={`Remove ${rep.name}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm font-medium text-[#e11d07] border-2 border-[#e11d07] hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
