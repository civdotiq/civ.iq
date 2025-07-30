/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';

export interface MatchOption {
  id: string;
  address: string;
  state: string;
  district: string;
  confidence: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface MultiMatchSelectorProps {
  matches: MatchOption[];
  onSelect: (match: MatchOption) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function MultiMatchSelector({
  matches,
  onSelect,
  onCancel,
  title = 'Multiple Locations Found',
  description = 'Your search returned multiple results. Please select the correct location:',
}: MultiMatchSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = () => {
    const selected = matches.find(m => m.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <div className="space-y-3 mb-6">
        {matches.map(match => (
          <label
            key={match.id}
            className={`
              block p-4 border rounded-lg cursor-pointer transition-all
              ${
                selectedId === match.id
                  ? 'border-civiq-blue bg-civiq-blue/5'
                  : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <div className="flex items-start">
              <input
                type="radio"
                name="location"
                value={match.id}
                checked={selectedId === match.id}
                onChange={e => setSelectedId(e.target.value)}
                className="mt-1 mr-3 text-civiq-blue focus:ring-civiq-blue"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{match.address}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Congressional District: {match.state}-{match.district}
                </div>
                {match.confidence < 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round(match.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSelect} disabled={!selectedId} className="flex-1">
          Continue with Selected Location
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="secondary" className="flex-1">
            Try Different Search
          </Button>
        )}
      </div>

      {matches.length > 5 && (
        <p className="mt-4 text-sm text-gray-600 text-center">
          Tip: Try adding more details to your search for better results
        </p>
      )}
    </Card>
  );
}
