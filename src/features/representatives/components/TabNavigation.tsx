/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import {
  RepresentativeIcon,
  StatisticsIcon,
  LegislationIcon,
  FinanceIcon,
  NewsIcon,
  CommitteeIcon,
} from '@/components/icons/AicherIcons';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  description?: string;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabHover?: (tabId: string) => void;
  tabs: TabItem[];
  variant?: 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultTabs: TabItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: <RepresentativeIcon className="w-4 h-4" />,
    description: 'Biography and background information',
  },
  {
    id: 'voting',
    label: 'Voting',
    icon: <StatisticsIcon className="w-4 h-4" />,
    description: 'Voting records and positions',
  },
  {
    id: 'bills',
    label: 'Bills',
    icon: <LegislationIcon className="w-4 h-4" />,
    description: 'Sponsored and co-sponsored legislation',
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <FinanceIcon className="w-4 h-4" />,
    description: 'Campaign finance and fundraising',
  },
  {
    id: 'news',
    label: 'News',
    icon: <NewsIcon className="w-4 h-4" />,
    description: 'Recent news and press coverage',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    icon: <CommitteeIcon className="w-4 h-4" />,
    description: 'Committees and professional connections',
  },
];

export function TabNavigation({
  activeTab,
  onTabChange,
  onTabHover,
  tabs = defaultTabs,
  variant = 'underline',
  size = 'md',
  className = '',
}: TabNavigationProps) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'pills') {
    return (
      <div className={`aicher-card aicher-no-radius ${className}`}>
        <nav className="flex flex-wrap md:flex-nowrap overflow-x-auto gap-1 scroll-smooth snap-x snap-proximity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={onTabHover ? () => onTabHover(tab.id) : undefined}
              className={`
        aicher-button inline-flex items-center gap-2 ${sizeClasses[size]} aicher-heading-wide transition-all duration-200 aicher-focus min-h-[44px] snap-start whitespace-nowrap
        ${activeTab === tab.id ? 'aicher-button-primary' : 'aicher-button aicher-hover'}
       `}
              title={tab.description}
            >
              <span className={iconSizes[size]}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`
          inline-flex items-center justify-center min-w-5 h-5 aicher-heading text-xs aicher-no-radius
          ${activeTab === tab.id ? 'aicher-status-info' : 'aicher-border bg-gray-100 text-gray-700'}
         `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // Aicher geometric bordered variant (default)
  return (
    <div className={`aicher-tabs ${className}`}>
      <nav className="flex overflow-x-auto scroll-smooth snap-x snap-proximity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={onTabHover ? () => onTabHover(tab.id) : undefined}
            className={`aicher-tab min-h-[44px] snap-start whitespace-nowrap ${activeTab === tab.id ? 'active' : ''} ${
              index === tabs.length - 1 ? 'border-r-0' : ''
            }`}
            title={tab.description}
          >
            <span className={iconSizes[size]}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="inline-flex items-center justify-center aicher-heading type-xs border-2 border-black min-w-[20px] h-5 px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Extended navigation with additional tab types for different sections
export interface ExtendedTabItem extends TabItem {
  isNew?: boolean;
  isUpdated?: boolean;
  lastUpdated?: string;
}

interface ExtendedTabNavigationProps extends Omit<TabNavigationProps, 'tabs'> {
  tabs: ExtendedTabItem[];
  showLastUpdated?: boolean;
}

export function ExtendedTabNavigation({
  activeTab,
  onTabChange,
  tabs,
  variant: _variant = 'underline',
  size = 'md',
  className = '',
  showLastUpdated = false,
}: ExtendedTabNavigationProps) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`aicher-card aicher-no-radius aicher-border-b ${className}`}>
      <div className="relative">
        {/* Scroll indicators for mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden" />

        <nav className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
          {tabs.map(tab => (
            <div key={tab.id} className="relative snap-center">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`
        aicher-button inline-flex items-center gap-2 ${sizeClasses[size]} aicher-heading-wide aicher-border-b transition-all duration-200 whitespace-nowrap relative aicher-focus min-h-[44px]
        ${
          activeTab === tab.id
            ? 'aicher-border-blue text-blue-600'
            : 'border-transparent text-gray-500 aicher-hover'
        }
       `}
                title={tab.description}
              >
                <span className={iconSizes[size]}>{tab.icon}</span>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`
            inline-flex items-center justify-center min-w-5 h-5 aicher-heading text-xs aicher-no-radius
            ${activeTab === tab.id ? 'aicher-status-info' : 'aicher-border bg-white text-gray-600'}
           `}
                      >
                        {tab.badge}
                      </span>
                    )}
                    {tab.isNew && (
                      <span className="aicher-status-success px-1.5 py-0.5 aicher-heading text-xs aicher-no-radius">
                        New
                      </span>
                    )}
                    {tab.isUpdated && (
                      <span className="aicher-status-error px-1.5 py-0.5 aicher-heading text-xs aicher-no-radius">
                        Updated
                      </span>
                    )}
                  </div>
                  {showLastUpdated && tab.lastUpdated && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{tab.lastUpdated}</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Preset tab configurations for different page types
export const profileTabs: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <RepresentativeIcon className="w-4 h-4" />,
    description: 'Personal details and committee memberships',
  },
  {
    id: 'voting',
    label: 'Voting Records',
    icon: <StatisticsIcon className="w-4 h-4" />,
    description: 'Voting history and positions',
  },
  {
    id: 'legislation',
    label: 'Sponsored Bills',
    icon: <LegislationIcon className="w-4 h-4" />,
    description: 'Bills sponsored and co-sponsored',
  },
  {
    id: 'finance',
    label: 'Campaign Finance',
    icon: <FinanceIcon className="w-4 h-4" />,
    description: 'Fundraising and expenditures',
  },
  {
    id: 'news',
    label: 'Recent News',
    icon: <NewsIcon className="w-4 h-4" />,
    description: 'Recent media coverage',
  },
];

export { defaultTabs };
