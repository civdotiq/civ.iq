'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Representative } from '@/features/representatives/services/congress-api';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { DataSourceBadge, CacheStatusIndicator } from '@/components/shared/ui/DataTransparency';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface RepresentativeGridProps {
  representatives: Representative[];
  compareIds: string[];
  metadata?: {
    source?: string;
    cached?: boolean;
    dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
  };
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
        if (index < items.length && items[index]) {
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
      className="relative overflow-y-auto overflow-x-hidden"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalRows * itemHeight, position: 'relative' }}>
        {/* Visible items */}
        <div
          className="aicher-grid aicher-grid-3 absolute w-full"
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

// Representative Card component - collapsible on mobile for better UX
const RepresentativeCard = memo(function RepresentativeCard({
  rep,
  compareIds,
  metadata,
}: {
  rep: Representative;
  compareIds: string[];
  metadata?: {
    source?: string;
    cached?: boolean;
    dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
  };
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getPartyBgColor = (party?: string) => {
    if (!party) return 'bg-white border-2 border-gray-300 text-gray-700';

    switch (party) {
      case 'D':
      case 'Democratic':
      case 'Democrat':
        return 'bg-blue-100 text-blue-700';
      case 'R':
      case 'Republican':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-white border-2 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className="aicher-card aicher-hover">
      {/* Header - Always visible, tappable on mobile to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 sm:p-6 sm:cursor-default flex items-center gap-3"
      >
        <RepresentativePhoto bioguideId={rep.bioguideId} name={rep.name} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="aicher-heading text-base sm:text-lg text-gray-900 truncate">{rep.name}</h3>
          <p className="aicher-heading-wide text-xs sm:text-sm text-gray-600">{rep.chamber}</p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span
              className={`aicher-button px-2 py-1 text-xs aicher-no-radius ${getPartyBgColor(rep.party)}`}
            >
              {rep.party || 'Unknown'}
            </span>
            <span className="aicher-heading-wide text-xs text-gray-500">
              {rep.state}
              {rep.district && `-${rep.district}`}
            </span>
          </div>
        </div>
        {/* Expand/collapse indicator - mobile only */}
        <div className="sm:hidden flex-shrink-0">
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expandable content - collapsed on mobile by default, always visible on desktop */}
      <div className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Data Transparency Section */}
          {metadata && (
            <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 aicher-border-b border-gray-100">
              {metadata.source && <DataSourceBadge source={metadata.source} size="sm" />}
              {typeof metadata.cached === 'boolean' && (
                <CacheStatusIndicator cached={metadata.cached} showLabel={false} />
              )}
            </div>
          )}

          <div className="space-y-2 sm:space-y-3 mb-4">
            {rep.phone && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                <a
                  href={`tel:${rep.phone}`}
                  className="text-gray-700 hover:text-civiq-blue transition-colors"
                >
                  {rep.phone}
                </a>
              </div>
            )}

            {rep.nextElection && rep.nextElection !== '' && rep.nextElection !== '0' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                <span className="truncate">Next Election: {rep.nextElection}</span>
              </div>
            )}

            {rep.yearsInOffice && rep.yearsInOffice > 0 && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
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
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push(`/representative/${rep.bioguideId}`)}
              className="flex-1 bg-civiq-blue text-white px-4 py-2 border-2 border-civiq-blue hover:bg-civiq-blue/90 transition-colors text-sm sm:text-base min-h-[44px] font-medium"
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
              className="sm:flex-initial bg-white text-gray-700 px-4 py-2 border-2 border-gray-300 hover:border-civiq-blue hover:text-civiq-blue transition-colors text-sm sm:text-base min-h-[44px] font-medium"
            >
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Collapsed state hint - mobile only */}
      {!isExpanded && (
        <div className="sm:hidden px-4 pb-3 text-center border-t border-gray-100">
          <span className="text-xs text-gray-400">Tap to see details</span>
        </div>
      )}
    </div>
  );
});

export function RepresentativeGrid({
  representatives,
  compareIds,
  metadata,
}: RepresentativeGridProps) {
  // Properly detect mobile with responsive hook
  const isMobile = useIsMobile();

  // Collapsed card height on mobile is ~120px (photo+name+party+hint)
  // Expanded desktop height remains ~220-250px
  const mobileCollapsedHeight = 130;
  const desktopHeight = metadata ? 250 : 220;

  return (
    <VirtualizedGrid
      items={representatives}
      renderItem={rep => (
        <RepresentativeCard rep={rep} compareIds={compareIds} metadata={metadata} />
      )}
      itemHeight={isMobile ? mobileCollapsedHeight : desktopHeight}
      containerHeight={800}
      columnsPerRow={isMobile ? 1 : 3} // Single column on mobile
    />
  );
}
