/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { MinimalRepresentativePage } from './MinimalRepresentativePage';

interface RepresentativeClientProps {
  representative: {
    bioguideId: string;
    name: string;
    title?: string;
    state: string;
    district?: string;
    party: string;
    chamber: 'House' | 'Senate';
    currentTerm?: {
      start?: string;
      end?: string;
    };
    committees?: Array<{
      name: string;
      role?: string;
    }>;
    fullName?: {
      first: string;
      middle?: string;
      last: string;
      suffix?: string;
      nickname?: string;
      official?: string;
    };
    bio?: {
      birthday?: string;
      gender?: 'M' | 'F';
      religion?: string;
    };
    socialMedia?: {
      twitter?: string;
      facebook?: string;
      youtube?: string;
      instagram?: string;
      mastodon?: string;
    };
  };
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
  partialErrors?: Record<string, string>;
}

export function RepresentativeClient({
  representative,
  serverData,
  partialErrors = {},
}: RepresentativeClientProps) {
  return (
    <>
      {/* Error Display for Partial Failures */}
      {Object.keys(partialErrors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Some data could not be loaded</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The following information may be incomplete:</p>
                <ul className="list-disc list-inside mt-1">
                  {Object.entries(partialErrors).map(([key, error]) => (
                    <li key={key} className="capitalize">
                      {key.replace('-', ' ')}:{' '}
                      {typeof error === 'string' ? error : 'Failed to load'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Representative Page */}
      <MinimalRepresentativePage representative={representative} serverData={serverData} />
    </>
  );
}
