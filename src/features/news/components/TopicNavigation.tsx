/**
 * Topic Navigation Component
 * Phase 3: Dynamic tab navigation for news topics
 *
 * Provides Google News-style topic tabs with counts and active states.
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface TopicTab {
  id: string;
  label: string;
  count: number;
}

export interface TopicNavigationProps {
  tabs: TopicTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TopicNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: TopicNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const checkScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth);
  };

  // Scroll handlers
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  // Update scroll state on mount and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollState();

    const handleResize = () => checkScrollState();
    const handleScroll = () => checkScrollState();

    window.addEventListener('resize', handleResize);
    container.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [tabs]);

  // Auto-scroll to active tab
  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeElement = container?.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;

    if (container && activeElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();

      if (elementRect.right > containerRect.right) {
        container.scrollBy({
          left: elementRect.right - containerRect.right + 20,
          behavior: 'smooth',
        });
      } else if (elementRect.left < containerRect.left) {
        container.scrollBy({
          left: elementRect.left - containerRect.left - 20,
          behavior: 'smooth',
        });
      }
    }
  }, [activeTab]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-white to-transparent"
          aria-label="Scroll left"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Tab container */}
      <div
        ref={scrollContainerRef}
        className="flex space-x-1 overflow-x-auto scrollbar-hide px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                flex items-center space-x-2 whitespace-nowrap
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }
              `}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-white to-transparent"
          aria-label="Scroll right"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TopicNavigation;
