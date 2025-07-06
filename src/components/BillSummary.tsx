'use client';

/**
 * Bill Summary Component
 * 
 * Displays AI-generated bill summaries at an 8th grade reading level
 * with expandable sections and reading level indicators.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Brain, AlertCircle, Clock, Users, Target } from 'lucide-react';
import type { BillSummary } from '@/lib/ai/bill-summarizer';

interface BillSummaryProps {
  summary: BillSummary;
  showFullDetails?: boolean;
  className?: string;
}

export function BillSummary({ summary, showFullDetails = false, className = '' }: BillSummaryProps) {
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
      minute: '2-digit'
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
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getReadingLevelColor(summary.readingLevel)}`}>
                <BookOpen className="h-3 w-3 inline mr-1" />
                Grade {summary.readingLevel} Reading Level
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {summary.title}
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
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What This Bill Does</h4>
          <p className="text-blue-800 leading-relaxed">
            {summary.whatItDoes || summary.summary}
          </p>
        </div>

        {summary.whyItMatters && (
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Why It Matters</h4>
            <p className="text-green-800 leading-relaxed">
              {summary.whyItMatters}
            </p>
          </div>
        )}
      </div>

      {/* Expandable Detailed Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'summary', label: 'Full Summary', icon: BookOpen },
              { id: 'keypoints', label: 'Key Points', icon: Target },
              { id: 'impact', label: 'Who\'s Affected', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Complete Summary</h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      {summary.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keypoints' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Key Points</h4>
                {summary.keyPoints && summary.keyPoints.length > 0 ? (
                  <ul className="space-y-3">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No key points available</p>
                )}
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Who This Affects</h4>
                {summary.whoItAffects && summary.whoItAffects.length > 0 ? (
                  <div className="grid gap-2">
                    {summary.whoItAffects.map((group, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Users className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="text-gray-700">{group}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Impact groups not specified</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with Source Info */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            <span>
              AI-generated summary • Simplified to {summary.readingLevel}th grade level
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Source: {summary.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BillSummarySkeletonProps {
  className?: string;
}

export function BillSummarySkeleton({ className = '' }: BillSummarySkeletonProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
              <div className="h-6 w-32 bg-gray-300 rounded-full"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-300 rounded mb-2"></div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-300 rounded"></div>
            <div className="h-4 w-4/5 bg-gray-300 rounded"></div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-300 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

interface BillSummaryErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function BillSummaryError({ error, onRetry, className = '' }: BillSummaryErrorProps) {
  return (
    <div className={`bg-white rounded-lg border border-red-200 shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm font-medium text-red-600">Summary Unavailable</span>
        </div>
        <p className="text-gray-700 mb-4">
          {error || 'Unable to generate AI summary for this bill. The full bill text is still available.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}