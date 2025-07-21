/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import { RepresentativeTradingCard } from './RepresentativeTradingCard';
import { TradingCardGenerator } from './TradingCardGenerator';
import { StatDetailPanel } from './StatDetailPanel';
import { CardCustomizationPanel, CardCustomization, CardTheme } from './CardCustomizationPanel';
import { CardTemplateSelector, CardTemplate, CARD_TEMPLATES } from './CardTemplateSelector';
import { CardTracker } from '@/lib/cardTracking';
import { DataValidator } from '@/lib/dataValidation';
import { EnhancedRepresentative } from '@/types/representative';

interface CardStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  description: string;
}

interface StatOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: 'legislative' | 'political' | 'demographic' | 'engagement' | 'money' | 'voting' | 'focus';
  getValue: (representative: EnhancedRepresentative, data?: unknown) => string | number;
}

interface TradingCardModalProps {
  representative: EnhancedRepresentative;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (stats: CardStat[]) => void;
  additionalData?: {
    votes?: unknown[];
    bills?: unknown[];
    finance?: unknown;
    news?: unknown[];
    partyAlignment?: unknown;
  };
}

// Available stat options organized by category
const STAT_OPTIONS: StatOption[] = [
  // Legislative Category
  {
    id: 'bills-sponsored',
    label: 'Bills Sponsored',
    icon: '📜',
    color: '#dc2626',
    description: 'Total number of bills sponsored in current term',
    category: 'legislative',
    getValue: (rep, data) => data?.bills?.length || 0
  },
  {
    id: 'bills-cosponsored',
    label: 'Bills Co-sponsored',
    icon: '🤝',
    color: '#059669',
    description: 'Number of bills co-sponsored with other members',
    category: 'legislative',
    getValue: (rep, data) => data?.bills?.filter((b: unknown) => b.cosponsors?.length > 0).length || 0
  },
  {
    id: 'committee-roles',
    label: 'Committee Roles',
    icon: '🏛️',
    color: '#2563eb',
    description: 'Number of committee assignments',
    category: 'legislative',
    getValue: (rep) => rep.committees?.length || 0
  },
  {
    id: 'years-in-office',
    label: 'Years in Office',
    icon: '📅',
    color: '#7c3aed',
    description: 'Total years of service in Congress',
    category: 'legislative',
    getValue: (rep) => rep.terms?.length || 0
  },
  
  // Political Category
  {
    id: 'party-support',
    label: 'Party Support',
    icon: '🎯',
    color: '#059669',
    description: 'Percentage of votes aligned with party position',
    category: 'political',
    getValue: (rep, data) => data?.partyAlignment?.partySupport ? `${Math.round(data.partyAlignment.partySupport)}%` : 'No data available'
  },
  {
    id: 'voting-attendance',
    label: 'Voting Attendance',
    icon: '✅',
    color: '#0891b2',
    description: 'Percentage of votes attended',
    category: 'political',
    getValue: (rep, data) => data?.votes ? `${Math.round((data.votes.filter((v: unknown) => v.position !== 'Not Voting').length / data.votes.length) * 100)}%` : 'No data available'
  },
  {
    id: 'bipartisan-bills',
    label: 'Bipartisan Bills',
    icon: '🤝',
    color: '#9333ea',
    description: 'Bills sponsored with cross-party support',
    category: 'political',
    getValue: (rep, data) => data?.bills?.filter((b: unknown) => b.bipartisan).length || 'No data available'
  },
  {
    id: 'leadership-roles',
    label: 'Leadership Roles',
    icon: '⭐',
    color: '#ea580c',
    description: 'Committee leadership and party positions',
    category: 'political',
    getValue: (rep) => rep.leadershipRoles?.length || rep.committees?.filter(c => c.role && c.role !== 'Member').length || 0
  },
  
  // Demographic Category
  {
    id: 'district-population',
    label: 'District Population',
    icon: '👥',
    color: '#0369a1',
    description: 'Total population represented',
    category: 'demographic',
    getValue: (rep) => rep.chamber === 'House' ? '760K' : 'Statewide'
  },
  {
    id: 'district-size',
    label: 'District Size',
    icon: '🗺️',
    color: '#059669',
    description: 'Geographic area in square miles',
    category: 'demographic',
    getValue: (rep) => rep.chamber === 'House' ? '2,400 sq mi' : 'Statewide'
  },
  {
    id: 'term-number',
    label: 'Current Term',
    icon: '🔄',
    color: '#7c3aed',
    description: 'Which term currently serving',
    category: 'demographic',
    getValue: (rep) => `Term ${rep.terms?.length || 1}`
  },
  
  // Engagement Category
  {
    id: 'news-mentions',
    label: 'News Mentions',
    icon: '📰',
    color: '#dc2626',
    description: 'Recent media coverage count',
    category: 'engagement',
    getValue: (rep, data) => data?.news?.length || 'No data available'
  },
  {
    id: 'social-media',
    label: 'Social Platforms',
    icon: '📱',
    color: '#3b82f6',
    description: 'Number of active social media accounts',
    category: 'engagement',
    getValue: (rep) => {
      const platforms = rep.socialMedia || {};
      return Object.keys(platforms).filter(key => platforms[key as keyof typeof platforms]).length;
    }
  },
  {
    id: 'campaign-funds',
    label: 'Campaign Funds',
    icon: '💰',
    color: '#059669',
    description: 'Total campaign contributions raised',
    category: 'engagement',
    getValue: (rep, data) => data?.finance?.totalRaised ? `$${Math.round(data.finance.totalRaised / 1000)}K` : 'No data available'
  },

  // Follow the Money Category
  {
    id: 'top-industry-donor',
    label: 'Top Industry Donor',
    icon: '🏭',
    color: '#dc2626',
    description: 'Largest industry contributor to campaigns',
    category: 'money',
    getValue: (rep, data) => data?.finance?.topIndustry || 'No data available'
  },
  {
    id: 'pac-vs-individual',
    label: 'PAC vs Individual',
    icon: '⚖️',
    color: '#7c3aed',
    description: 'Ratio of PAC money to individual contributions',
    category: 'money',
    getValue: (rep, data) => data?.finance?.pacRatio ? `${Math.round(data.finance.pacRatio)}% PAC` : 'No data available'
  },
  {
    id: 'small-donor-percentage',
    label: 'Small Donors',
    icon: '👤',
    color: '#059669',
    description: 'Percentage from donations under $200',
    category: 'money',
    getValue: (rep, data) => data?.finance?.smallDonors ? `${Math.round(data.finance.smallDonors)}%` : 'No data available'
  },
  {
    id: 'largest-corporate-pac',
    label: 'Top Corporate PAC',
    icon: '🏢',
    color: '#ea580c',
    description: 'Largest corporate PAC contributor',
    category: 'money',
    getValue: (rep, data) => data?.finance?.topCorporatePAC || 'No data available'
  },
  {
    id: 'out-of-state-funding',
    label: 'Out-of-State Funding',
    icon: '🗺️',
    color: '#0891b2',
    description: 'Percentage of funding from outside state/district',
    category: 'money',
    getValue: (rep, data) => data?.finance?.outOfState ? `${Math.round(data.finance.outOfState)}%` : 'No data available'
  },

  // Voting Record Category
  {
    id: 'party-unity-score',
    label: 'Party Unity Score',
    icon: '🎯',
    color: '#2563eb',
    description: 'How often votes with party majority',
    category: 'voting',
    getValue: (rep, data) => data?.partyAlignment?.unityScore ? `${Math.round(data.partyAlignment.unityScore)}%` : 'No data available'
  },
  {
    id: 'contrarian-votes',
    label: 'Contrarian Votes',
    icon: '🔄',
    color: '#dc2626',
    description: 'Key votes against party position',
    category: 'voting',
    getValue: (rep, data) => data?.votes?.contrarian?.length || 'No data available'
  },
  {
    id: 'bipartisan-bill-count',
    label: 'Bipartisan Bills',
    icon: '🤝',
    color: '#059669',
    description: 'Bills with cross-party co-sponsors',
    category: 'voting',
    getValue: (rep, data) => data?.bills?.filter((b: unknown) => b.bipartisan).length || 'No data available'
  },
  {
    id: 'missed-votes-percent',
    label: 'Missed Votes',
    icon: '❌',
    color: '#ea580c',
    description: 'Percentage of votes missed',
    category: 'voting',
    getValue: (rep, data) => data?.votes?.missed ? `${Math.round(data.votes.missed)}%` : 'No data available'
  },
  {
    id: 'committee-attendance',
    label: 'Committee Attendance',
    icon: '🪑',
    color: '#7c3aed',
    description: 'Average committee meeting attendance',
    category: 'voting',
    getValue: (rep, data) => data?.committees?.attendance ? `${Math.round(data.committees.attendance)}%` : 'No data available'
  },

  // Legislative Focus Category
  {
    id: 'top-bill-topic',
    label: 'Top Bill Topic',
    icon: '📊',
    color: '#059669',
    description: 'Most common subject of sponsored bills',
    category: 'focus',
    getValue: (rep, data) => data?.bills?.topTopic || 'No data available'
  },
  {
    id: 'bills-became-law',
    label: 'Bills Became Law',
    icon: '⚖️',
    color: '#2563eb',
    description: 'Number of sponsored bills that became law',
    category: 'focus',
    getValue: (rep, data) => data?.bills?.enacted || 'No data available'
  },
  {
    id: 'primary-committee',
    label: 'Primary Committee',
    icon: '🏛️',
    color: '#7c3aed',
    description: 'Main committee assignment',
    category: 'focus',
    getValue: (rep) => rep.committees?.[0]?.name || 'No data available'
  },
  {
    id: 'amendments-passed',
    label: 'Amendments Passed',
    icon: '📝',
    color: '#ea580c',
    description: 'Number of amendments successfully passed',
    category: 'focus',
    getValue: (rep, data) => data?.amendments?.passed || 'No data available'
  },
  {
    id: 'effectiveness-rank',
    label: 'Effectiveness Rank',
    icon: '🏆',
    color: '#dc2626',
    description: 'Legislative effectiveness ranking',
    category: 'focus',
    getValue: (rep, data) => data?.effectiveness?.rank || 'No data available'
  }
];

export function TradingCardModal({ representative, isOpen, onClose, onGenerate, additionalData }: TradingCardModalProps) {
  const [selectedStats, setSelectedStats] = useState<string[]>([]);
  const [previewStats, setPreviewStats] = useState<CardStat[]>([]);
  const [activeCategory, setActiveCategory] = useState<'legislative' | 'political' | 'demographic' | 'engagement' | 'money' | 'voting' | 'focus'>('legislative');
  const [showGenerator, setShowGenerator] = useState(false);
  const [detailStat, setDetailStat] = useState<{ id: string; stat: CardStat } | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>(CARD_TEMPLATES[4]); // Default to custom
  const [cardId, setCardId] = useState<string>('');
  const [customization, setCustomization] = useState<CardCustomization>({
    theme: {
      id: 'default',
      name: 'Default',
      preview: '🎨',
      colors: {
        primary: '#e11d09',
        secondary: '#0a9338',
        accent: '#3ea2d4',
        background: '#ffffff',
        text: '#1f2937'
      },
      style: 'modern'
    },
    showPartyColors: true,
    statsLayout: 'grid',
    fontSize: 'medium',
    includeQRCode: false
  });

  const categories = [
    { id: 'legislative', label: 'Legislative', icon: '📜', color: 'blue' },
    { id: 'political', label: 'Political', icon: '🎯', color: 'green' },
    { id: 'demographic', label: 'Demographics', icon: '👥', color: 'purple' },
    { id: 'engagement', label: 'Engagement', icon: '📱', color: 'orange' },
    { id: 'money', label: 'Follow the Money', icon: '💰', color: 'red' },
    { id: 'voting', label: 'Voting Record', icon: '✅', color: 'indigo' },
    { id: 'focus', label: 'Legislative Focus', icon: '🎯', color: 'emerald' }
  ];

  // Validate data when component loads
  useEffect(() => {
    const validator = new DataValidator();
    const errors = validator.validateRepresentativeData(representative, additionalData);
    
    if (errors.length > 0) {
      console.log('=== TRADING CARD DATA VALIDATION ===');
      console.log('Representative:', representative.name, '(', representative.bioguideId, ')');
      console.log('Raw Representative Data:', representative);
      console.log('Additional Data:', additionalData);
      DataValidator.logValidationErrors(errors, 'Trading Card Data');
    }
  }, [representative, additionalData]);

  // Update preview stats when selection changes
  useEffect(() => {
    const newPreviewStats = selectedStats.map(statId => {
      const option = STAT_OPTIONS.find(opt => opt.id === statId);
      if (!option) return null;
      
      return {
        label: option.label,
        value: option.getValue(representative, additionalData),
        icon: option.icon,
        color: option.color,
        description: option.description
      };
    }).filter(Boolean) as CardStat[];
    
    setPreviewStats(newPreviewStats);
  }, [selectedStats, representative, additionalData]);

  const handleStatToggle = (statId: string) => {
    setSelectedStats(prev => {
      if (prev.includes(statId)) {
        return prev.filter(id => id !== statId);
      } else if (prev.length < 5) {
        return [...prev, statId];
      }
      return prev;
    });
  };

  const handleTemplateChange = (template: CardTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== 'custom-combination') {
      setSelectedStats(template.preselectedStats);
    }
  };

  const handleGenerate = () => {
    if (previewStats.length >= 1) {
      // Generate unique card ID
      const newCardId = CardTracker.generateCardId();
      setCardId(newCardId);
      
      // Store card data
      CardTracker.storeCard({
        cardId: newCardId,
        repId: representative.bioguideId,
        repName: representative.name,
        stats: selectedStats,
        template: selectedTemplate.name,
        templateId: selectedTemplate.id,
        timestamp: new Date().toISOString()
      });
      
      onGenerate(previewStats);
      setShowGenerator(true);
    }
  };

  if (!isOpen) return null;

  const filteredOptions = STAT_OPTIONS.filter(option => option.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create Trading Card</h2>
              <p className="text-indigo-100 mt-1">
                Choose up to 5 stats to display for {representative.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Left Panel - Template & Category Selection */}
          <div className="w-1/4 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            {/* Template Selector */}
            <div className="mb-6">
              <CardTemplateSelector
                selectedTemplate={selectedTemplate}
                onTemplateChange={handleTemplateChange}
              />
            </div>

            {/* Category Selection */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Counter */}
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Selected:</span>
                <span className={`text-sm font-bold ${selectedStats.length >= 5 ? 'text-red-600' : 'text-indigo-600'}`}>
                  {selectedStats.length}/5
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedStats.length >= 5 ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${(selectedStats.length / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Middle Panel - Stat Selection */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {categories.find(c => c.id === activeCategory)?.label} Stats
              </h3>
              <span className="text-sm text-gray-500">
                {filteredOptions.length} available
              </span>
            </div>

            <div className="space-y-3">
              {filteredOptions.map(option => {
                const isSelected = selectedStats.includes(option.id);
                const isDisabled = !isSelected && selectedStats.length >= 5;
                
                return (
                  <div
                    key={option.id}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-300 bg-indigo-50' 
                        : isDisabled 
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !isDisabled && handleStatToggle(option.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isDisabled && handleStatToggle(option.id)}
                          disabled={isDisabled}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{option.icon}</span>
                            <span className="font-medium text-gray-900">{option.label}</span>
                            <span 
                              className="text-sm font-semibold px-2 py-1 rounded"
                              style={{ backgroundColor: `${option.color}15`, color: option.color }}
                            >
                              {option.getValue(representative, additionalData)}
                            </span>
                          </div>
                          {['bills-sponsored', 'bills-cosponsored', 'committee-roles', 'voting-attendance', 
                            'party-support', 'bipartisan-bills', 'news-mentions'].includes(option.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailStat({
                                  id: option.id,
                                  stat: {
                                    label: option.label,
                                    value: option.getValue(representative, additionalData),
                                    icon: option.icon,
                                    color: option.color,
                                    description: option.description
                                  }
                                });
                              }}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="View details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-1/4 bg-gray-50 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
            
            {previewStats.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="scale-75 origin-top">
                    <RepresentativeTradingCard
                      representative={representative}
                      stats={previewStats}
                      customization={customization}
                      cardId={cardId}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => setShowCustomization(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    🎨 Customize Theme
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🎴</div>
                <p className="text-sm">Select stats to see preview</p>
                <button
                  onClick={() => setShowCustomization(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                >
                  🎨 Customize Theme
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedStats.length === 0 && "Select at least 1 stat to generate"}
              {selectedStats.length > 0 && selectedStats.length < 5 && `${selectedStats.length} stats selected. You can add ${5 - selectedStats.length} more.`}
              {selectedStats.length === 5 && "Maximum 5 stats selected"}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedStats.length === 0}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  selectedStats.length > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Generate Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Card Generator */}
      <TradingCardGenerator
        representative={representative}
        stats={previewStats}
        isOpen={showGenerator}
        customization={customization}
        cardId={cardId}
        onClose={() => {
          setShowGenerator(false);
          onClose();
        }}
        onGenerated={(result) => {
          console.log('Card generated:', result);
          // Could trigger analytics or other actions here
        }}
      />

      {/* Stat Detail Panel */}
      {detailStat && (
        <StatDetailPanel
          representative={representative}
          stat={{ id: detailStat.id, ...detailStat.stat }}
          additionalData={additionalData}
          onClose={() => setDetailStat(null)}
        />
      )}

      {/* Card Customization Panel */}
      {showCustomization && (
        <CardCustomizationPanel
          customization={customization}
          onChange={setCustomization}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </div>
  );
}

export default TradingCardModal;