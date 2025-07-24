/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';

export interface CardTheme {
  id: string;
  name: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  style: 'modern' | 'classic' | 'minimal' | 'bold';
}

export interface CardCustomization {
  theme: CardTheme;
  showPartyColors: boolean;
  statsLayout: 'grid' | 'list' | 'compact';
  fontSize: 'small' | 'medium' | 'large';
  includeQRCode: boolean;
}

interface CardCustomizationPanelProps {
  customization: CardCustomization;
  onChange: (customization: CardCustomization) => void;
  onClose: () => void;
}

const THEMES: CardTheme[] = [
  {
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
  {
    id: 'patriotic',
    name: 'Patriotic',
    preview: '🇺🇸',
    colors: {
      primary: '#b91c1c',
      secondary: '#1e40af',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#111827'
    },
    style: 'classic'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: '⚪',
    colors: {
      primary: '#374151',
      secondary: '#6b7280',
      accent: '#3b82f6',
      background: '#fafafa',
      text: '#111827'
    },
    style: 'minimal'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    preview: '🌙',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#1f2937',
      text: '#f9fafb'
    },
    style: 'modern'
  },
  {
    id: 'retro',
    name: 'Retro',
    preview: '📺',
    colors: {
      primary: '#dc2626',
      secondary: '#059669',
      accent: '#f59e0b',
      background: '#fef3c7',
      text: '#78350f'
    },
    style: 'bold'
  },
  {
    id: 'professional',
    name: 'Professional',
    preview: '💼',
    colors: {
      primary: '#1e3a8a',
      secondary: '#064e3b',
      accent: '#7c2d12',
      background: '#f8fafc',
      text: '#0f172a'
    },
    style: 'classic'
  }
];

export function CardCustomizationPanel({ 
  customization, 
  onChange, 
  onClose 
}: CardCustomizationPanelProps) {
  const [preview, setPreview] = useState(customization);

  const handleChange = (updates: Partial<CardCustomization>) => {
    const newCustomization = { ...preview, ...updates };
    setPreview(newCustomization);
  };

  const handleApply = () => {
    onChange(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Customize Your Card</h2>
              <p className="text-purple-100 mt-1">
                Choose a theme and customize the appearance
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Theme Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleChange({ theme })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    preview.theme.id === theme.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{theme.preview}</div>
                  <div className="font-medium text-gray-900">{theme.name}</div>
                  <div className="mt-2 flex justify-center space-x-1">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.secondary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Options */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats Layout</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleChange({ statsLayout: 'grid' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  preview.statsLayout === 'grid'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <div className="text-sm font-medium">Grid</div>
              </button>

              <button
                onClick={() => handleChange({ statsLayout: 'list' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  preview.statsLayout === 'list'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div className="text-sm font-medium">List</div>
              </button>

              <button
                onClick={() => handleChange({ statsLayout: 'compact' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  preview.statsLayout === 'compact'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <div className="text-sm font-medium">Compact</div>
              </button>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">
                  Show Party Colors
                </label>
                <p className="text-sm text-gray-500">
                  Override theme colors with party-specific colors
                </p>
              </div>
              <button
                onClick={() => handleChange({ showPartyColors: !preview.showPartyColors })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preview.showPartyColors ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preview.showPartyColors ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">
                  Font Size
                </label>
                <p className="text-sm text-gray-500">
                  Adjust text size for readability
                </p>
              </div>
              <select
                value={preview.fontSize}
                onChange={(e) => handleChange({ fontSize: e.target.value as any })}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium text-gray-900">
                  Include QR Code
                </label>
                <p className="text-sm text-gray-500">
                  Add QR code linking to representative's profile
                </p>
              </div>
              <button
                onClick={() => handleChange({ includeQRCode: !preview.includeQRCode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preview.includeQRCode ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preview.includeQRCode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPreview(customization)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardCustomizationPanel;