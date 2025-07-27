'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Representative } from '@/lib/congress-api';
import RepresentativePhoto from '@/components/RepresentativePhoto';

interface RepresentativeGridProps {
  representatives: Representative[];
  compareIds: string[];
}

// Virtual scrolling component for performance
const VirtualizedGrid = memo(function VirtualizedGrid({
  items,
  renderItem,
  itemHeight = 200,
  containerHeight = 600,
  columnsPerRow = 3,
}: {
  items: Representative[];
  renderItem: (item: Representative) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  columnsPerRow?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalRows = Math.ceil(items.length / columnsPerRow);
  const visibleRowCount = Math.ceil(containerHeight / itemHeight);
  const startRow = Math.floor(scrollTop / itemHeight);
  const endRow = Math.min(startRow + visibleRowCount + 2, totalRows); // +2 for buffer

  const visibleItems = useMemo(() => {
    const visible: Array<{ item: Representative; index: number; row: number; col: number }> = [];

    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < items.length) {
          visible.push({
            item: items[index],
            index,
            row,
            col,
          });
        }
      }
    }

    return visible;
  }, [items, startRow, endRow, columnsPerRow]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalRows * itemHeight, position: 'relative' }}>
        {/* Visible items */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 absolute w-full"
          style={{
            top: startRow * itemHeight,
            transform: 'translateY(0px)',
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={item.bioguideId} data-index={index}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Representative Card component
const RepresentativeCard = memo(function RepresentativeCard({
  rep,
  compareIds,
}: {
  rep: Representative;
  compareIds: string[];
}) {
  const router = useRouter();

  const getPartyBgColor = (party?: string) => {
    if (!party) return 'bg-gray-100 text-gray-700';

    switch (party) {
      case 'D':
      case 'Democratic':
      case 'Democrat':
        return 'bg-blue-100 text-blue-700';
      case 'R':
      case 'Republican':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <RepresentativePhoto bioguideId={rep.bioguideId} name={rep.name} size="md" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{rep.name}</h3>
              <p className="text-sm text-gray-600">{rep.chamber}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyBgColor(rep.party)}`}
                >
                  {rep.party || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500">
                  {rep.state}
                  {rep.district && `-${rep.district}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {rep.phone && (
            <div className="flex items-center gap-2 text-sm">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <a href={`tel:${rep.phone}`} className="text-blue-600 hover:underline">
                {rep.phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Next Election: {rep.nextElection}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{rep.yearsInOffice} years in office</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/representative/${rep.bioguideId}`)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            View Profile
          </button>
          <button
            onClick={() => {
              const currentCompare = compareIds.join(',');
              const compareList = currentCompare.split(',').filter(Boolean);
              if (compareList.includes(rep.bioguideId)) {
                const newList = compareList.filter(id => id !== rep.bioguideId);
                router.push(`/representatives?compare=${newList.join(',')}`);
              } else if (compareList.length < 2) {
                compareList.push(rep.bioguideId);
                router.push(`/representatives?compare=${compareList.join(',')}`);
              } else {
                alert('You can only compare 2 representatives at a time');
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
});

export function RepresentativeGrid({ representatives, compareIds }: RepresentativeGridProps) {
  return (
    <VirtualizedGrid
      items={representatives}
      renderItem={rep => <RepresentativeCard rep={rep} compareIds={compareIds} />}
      itemHeight={220}
      containerHeight={800}
      columnsPerRow={3}
    />
  );
}
