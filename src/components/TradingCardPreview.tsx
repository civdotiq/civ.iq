/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { RepresentativeTradingCard, getSampleStats } from './RepresentativeTradingCard';
import { EnhancedRepresentative } from '@/types/representative';

interface TradingCardPreviewProps {
  representative: EnhancedRepresentative;
  visible?: boolean;
}

export function TradingCardPreview({ representative, visible = false }: TradingCardPreviewProps) {
  const [isVisible, setIsVisible] = useState(visible);
  
  if (!isVisible) {
    return (
      <div className="hidden">
        <div id="trading-card-preview" className="p-4 bg-gray-100">
          <RepresentativeTradingCard 
            representative={representative}
            stats={getSampleStats(representative)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trading Card Preview</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex justify-center">
          <RepresentativeTradingCard 
            representative={representative}
            stats={getSampleStats(representative)}
          />
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsVisible(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradingCardPreview;