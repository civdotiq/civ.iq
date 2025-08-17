/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';

interface MinimalTabsProps {
  active: string;
  onChange: (tab: string) => void;
}

const tabs = ['Overview', 'Voting Records', 'Legislation', 'Finance', 'News'];

export function MinimalTabs({ active, onChange }: MinimalTabsProps) {
  return (
    <nav className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 z-10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex gap-12 py-6">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`text-sm transition-all pb-1 border-b-2 ${
                active === tab
                  ? 'text-black border-black'
                  : 'text-gray-400 hover:text-black border-transparent hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={active === tab}
              tabIndex={active === tab ? 0 : -1}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
