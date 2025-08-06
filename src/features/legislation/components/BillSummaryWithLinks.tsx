/**
 * Example: Updating BillSummary Component with Entity Linking
 *
 * This shows how to integrate EntityLinkWrapper into existing components
 * to automatically create hyperlinks for all political entities.
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Brain,
  AlertCircle,
  Clock,
  Users,
  Target,
} from 'lucide-react';
import type { BillSummary } from '@/features/legislation/services/ai/bill-summarizer';
import { EntityLinkWrapper } from '@/shared/components/ui/EntityLinkWrapper';

interface BillSummaryProps {
  summary: BillSummary;
  showFullDetails?: boolean;
  className?: string;
}

export function BillSummaryWithLinks({
  summary,
  showFullDetails = false,
  className = '',
}: BillSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDetails);
  const [activeTab, setActiveTab] = useState<'summary' | 'keypoints' | 'impact'>('summary');

  const getReadingLevelColor = (level: number) => {
    if (level <= 8) return 'text-green-600 bg-green-50';
    if (level <= 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">AI-Generated Summary</span>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${getReadingLevelColor(summary.readingLevel)}`}
              >
                <BookOpen className="h-3 w-3 inline mr-1" />
                Grade {summary.readingLevel} Reading Level
              </div>
            </div>

            {/* UPDATED: Wrap title in EntityLinkWrapper for bill references */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              <EntityLinkWrapper text={summary.title} />
            </h3>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span className={getConfidenceColor(summary.confidence)}>
                  {Math.round(summary.confidence * 100)}% confidence
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Updated {formatDate(summary.lastUpdated)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Summary - Always Visible */}
      <div className="p-4">
        {/* UPDATED: Wrap summary text to link entities */}
        <p className="text-gray-700">
          <EntityLinkWrapper text={summary.summary} />
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            {(['summary', 'keypoints', 'impact'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Plain English Summary</h4>
                  {/* UPDATED: Link entities in plain summary */}
                  <p className="text-gray-700">
                    <EntityLinkWrapper text={summary.plainEnglishSummary} />
                  </p>
                </div>

                {summary.technicalSummary && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
                    {/* UPDATED: Link entities in technical summary */}
                    <p className="text-gray-700">
                      <EntityLinkWrapper text={summary.technicalSummary} />
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'keypoints' && (
              <div className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    {/* UPDATED: Link entities in key points */}
                    <span className="text-gray-700">
                      <EntityLinkWrapper text={point} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="space-y-4">
                {summary.impactAnalysis && (
                  <>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Who This Affects</h4>
                      <div className="flex flex-wrap gap-2">
                        {summary.impactAnalysis.affectedGroups.map((group, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                          >
                            <Users className="h-3 w-3 inline mr-1" />
                            {/* UPDATED: Link entities in affected groups */}
                            <EntityLinkWrapper text={group} />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Estimated Impact</h4>
                      {/* UPDATED: Link entities in impact description */}
                      <p className="text-gray-700">
                        <EntityLinkWrapper text={summary.impactAnalysis.estimatedImpact} />
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Usage Example:
// Before: <BillSummary summary={billSummary} />
// After: <BillSummaryWithLinks summary={billSummary} />
//
// This automatically converts text like:
// "Rep. John Smith (R-TX) sponsored H.R. 1234 in the House Ways and Means Committee"
// Into clickable links for each entity.
