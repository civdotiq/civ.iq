/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  preselectedStats: string[];
  narrative: string;
}

interface CardTemplateSelectorProps {
  selectedTemplate: CardTemplate;
  onTemplateChange: (template: CardTemplate) => void;
  className?: string;
}

const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'follow-money',
    name: 'Follow the Money',
    description: 'Track campaign finance and funding sources',
    icon: '💰',
    color: 'red',
    preselectedStats: [
      'top-industry-donor',
      'pac-vs-individual',
      'small-donor-percentage',
      'largest-corporate-pac',
      'out-of-state-funding'
    ],
    narrative: 'This card reveals who funds your representative and how that money flows into campaigns.'
  },
  {
    id: 'voting-record',
    name: 'Voting Record',
    description: 'Analyze voting patterns and party alignment',
    icon: '✅',
    color: 'indigo',
    preselectedStats: [
      'party-unity-score',
      'contrarian-votes',
      'bipartisan-bill-count',
      'missed-votes-percent',
      'committee-attendance'
    ],
    narrative: 'This card shows how your representative votes and their alignment with party positions.'
  },
  {
    id: 'legislative-focus',
    name: 'Legislative Focus',
    description: 'Examine legislative priorities and effectiveness',
    icon: '🎯',
    color: 'emerald',
    preselectedStats: [
      'top-bill-topic',
      'bills-became-law',
      'primary-committee',
      'amendments-passed',
      'effectiveness-rank'
    ],
    narrative: 'This card highlights what your representative focuses on and how effective they are at passing legislation.'
  },
  {
    id: 'accountability-snapshot',
    name: 'Accountability Snapshot',
    description: 'Compare contrasting metrics for transparency',
    icon: '⚖️',
    color: 'purple',
    preselectedStats: [
      'party-unity-score',
      'top-industry-donor'
    ],
    narrative: 'This card pairs contrasting statistics to reveal potential conflicts of interest or accountability issues.'
  },
  {
    id: 'custom-combination',
    name: 'Custom Combination',
    description: 'Create your own unique card with any stats',
    icon: '🎨',
    color: 'gray',
    preselectedStats: [],
    narrative: 'Build your own story by selecting any combination of available statistics.'
  }
];

export function CardTemplateSelector({ selectedTemplate, onTemplateChange, className = '' }: CardTemplateSelectorProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const getColorClasses = (color: string, selected: boolean) => {
    const colorMap = {
      red: selected ? 'bg-red-100 border-red-300 text-red-800' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
      indigo: selected ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      emerald: selected ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      purple: selected ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      gray: selected ? 'bg-gray-100 border-gray-300 text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📋</span>
        <h3 className="text-lg font-semibold text-gray-900">Story Templates</h3>
        <span className="text-sm text-gray-500">Choose a narrative focus for your card</span>
      </div>

      <div className="grid gap-3">
        {CARD_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate.id === template.id;
          const isExpanded = expandedTemplate === template.id;
          
          return (
            <div
              key={template.id}
              className={`border rounded-lg transition-all duration-200 ${getColorClasses(template.color, isSelected)}`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => onTemplateChange(template)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{template.icon}</span>
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm opacity-75">{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {template.preselectedStats.length > 0 && (
                      <span className="text-xs opacity-75">
                        {template.preselectedStats.length} stats
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTemplate(isExpanded ? null : template.id);
                      }}
                      className="text-sm opacity-75 hover:opacity-100 transition-opacity"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-current border-opacity-20">
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">Narrative Focus:</p>
                    <p className="text-sm opacity-90">{template.narrative}</p>
                    
                    {template.preselectedStats.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Pre-selected Stats:</p>
                        <div className="flex flex-wrap gap-2">
                          {template.preselectedStats.map((statId) => (
                            <span
                              key={statId}
                              className="text-xs px-2 py-1 bg-current bg-opacity-20 rounded-full"
                            >
                              {statId.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTemplate.id !== 'custom-combination' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-sm">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Template Active</p>
              <p className="opacity-90">
                {selectedTemplate.name} template is selected. You can still modify the stats or switch to custom mode.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CARD_TEMPLATES };