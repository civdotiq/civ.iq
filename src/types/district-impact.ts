/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface DistrictImpact {
  billId: string;
  districtId: string;
  overallImpact: 'High' | 'Medium' | 'Low' | 'Uncertain';
  summary: string;
  economicImpact: string;
  infrastructureImpact: string;
  affectedGroups: Array<{
    group: string;
    impact: string;
    scale: string;
  }>;
  relevantDistrictData: Array<{
    metric: string;
    value: string;
    context: string;
  }>;
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'fallback';
}
