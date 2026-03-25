'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { X, Users, MapPin, Vote } from 'lucide-react';

interface StateInfo {
  code: string;
  name: string;
  population: number;
  districts: number;
  senators: string[];
}

interface StateInfoPanelProps {
  state: StateInfo | null;
  onClose: () => void;
}

export default function StateInfoPanel({ state, onClose }: StateInfoPanelProps) {
  if (!state) return null;

  return (
    <div className="absolute top-4 right-4 bg-white border-2 border-black border border-gray-200 p-6 w-80 z-[1000]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{state.name}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close state info panel"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-civiq-blue/10">
            <Users className="h-5 w-5 text-civiq-blue" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Population</p>
            <p className="font-semibold text-gray-900">{state.population.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-civiq-green/10">
            <MapPin className="h-5 w-5 text-civiq-green" />
          </div>
          <div>
            <p className="text-sm text-gray-600">House Districts</p>
            <p className="font-semibold text-gray-900">{state.districts} districts</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-civiq-blue/10">
            <Vote className="h-5 w-5 text-civiq-blue" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">US Senators</p>
            <div className="space-y-1">
              {state.senators.map((senator, index) => (
                <p key={index} className="text-sm font-medium text-gray-900">
                  {senator}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button className="w-full bg-civiq-blue text-white py-2 px-4 hover:bg-civiq-blue transition-colors text-sm font-medium">
            View All {state.name} Districts
          </button>
        </div>
      </div>
    </div>
  );
}
