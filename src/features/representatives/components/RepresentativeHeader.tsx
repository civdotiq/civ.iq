/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { DataSourceBadge } from '@/components/shared/ui/DataTransparency';

interface RepresentativeHeaderProps {
  representative: {
    bioguideId: string;
    name: string;
    party: string;
    chamber: 'House' | 'Senate';
    state: string;
    district?: string;
    title: string;
    currentTerm?: {
      start: string;
      end: string;
      contactForm?: string;
    };
    committees?: Array<{
      name: string;
      role?: string;
    }>;
    website?: string;
  };
  metrics?: {
    billsSponsored: number;
    partyVotingPercentage: number;
    attendancePercentage: number;
    profileCompleteness: number;
  };
}

export function RepresentativeHeader({ representative, metrics }: RepresentativeHeaderProps) {
  // Calculate party color for header stripe
  const getPartyColor = (party: string) => {
    switch (party?.toLowerCase()) {
      case 'republican':
      case 'r':
        return 'bg-red-600';
      case 'democrat':
      case 'democratic':
      case 'd':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Calculate party badge color
  const getPartyBadgeColor = (party: string) => {
    switch (party?.toLowerCase()) {
      case 'republican':
      case 'r':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'democrat':
      case 'democratic':
      case 'd':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-white border-2 border-gray-300 text-gray-800 border-gray-200';
    }
  };

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate years in office
  const getYearsInOffice = (startDate?: string) => {
    if (!startDate) return 'Unknown';
    const start = new Date(startDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    return years > 0 ? `${years} years` : 'Less than 1 year';
  };

  return (
    <div className="aicher-card aicher-no-radius overflow-hidden">
      {/* Party Color Stripe */}
      <div className={`h-2 ${getPartyColor(representative.party)}`} />

      <div className="p-6">
        {/* Main Representative Info */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Photo */}
            <div className="flex-shrink-0">
              <RepresentativePhoto
                bioguideId={representative.bioguideId}
                name={representative.name}
                size="xl"
                className=""
              />
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1">
              <h1 className="aicher-heading text-3xl text-gray-900 mb-2">{representative.name}</h1>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className={`aicher-button px-3 py-1 text-sm ${getPartyBadgeColor(representative.party)} aicher-no-radius`}
                >
                  {representative.party}
                </span>
                <span className="aicher-heading-wide text-gray-600 text-sm">
                  {representative.title}
                </span>
                <span className="aicher-heading-wide text-gray-600 text-sm">
                  {representative.state}
                  {representative.district ? `-${representative.district}` : ''}
                </span>
              </div>

              {/* Contact Links */}
              <div className="flex flex-wrap gap-3">
                {representative.website && (
                  <a
                    href={representative.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aicher-button-primary text-sm aicher-focus"
                  >
                    Official Website
                  </a>
                )}
                {representative.currentTerm?.contactForm && (
                  <a
                    href={representative.currentTerm.contactForm}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aicher-button text-sm aicher-focus"
                  >
                    Contact Form
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Term Information */}
          <div className="flex-shrink-0 text-right">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">In office since: </span>
                <span className="font-medium">
                  {getYearsInOffice(representative.currentTerm?.start)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Term ends: </span>
                <span className="font-medium">{formatDate(representative.currentTerm?.end)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="aicher-grid aicher-grid-4 mb-6">
          <div className="aicher-card text-center">
            <div className="aicher-heading text-2xl text-gray-900">
              {representative.committees?.length || 0}
            </div>
            <div className="aicher-heading-wide text-sm text-gray-600">Committees</div>
          </div>
          <div className="aicher-card text-center">
            <div className="aicher-heading text-2xl text-gray-900">
              {metrics?.billsSponsored || 0}
            </div>
            <div className="aicher-heading-wide text-sm text-gray-600">Bills Sponsored</div>
          </div>
          <div className="aicher-card text-center">
            <div className="aicher-heading text-2xl text-gray-900">
              {metrics?.partyVotingPercentage || 0}%
            </div>
            <div className="aicher-heading-wide text-sm text-gray-600">Party Voting</div>
          </div>
          <div className="aicher-card text-center">
            <div className="aicher-heading text-2xl text-gray-900">
              {metrics?.attendancePercentage || 0}%
            </div>
            <div className="aicher-heading-wide text-sm text-gray-600">Attendance</div>
          </div>
        </div>

        {/* Profile Completeness */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="aicher-heading-wide text-sm text-gray-700">Profile Completeness</span>
            <span className="aicher-heading text-sm text-gray-600">
              {metrics?.profileCompleteness || 85}%
            </span>
          </div>
          <div className="w-full aicher-border h-2 bg-gray-100">
            <div
              className="aicher-status-success h-2 transition-all duration-300"
              style={{ width: `${metrics?.profileCompleteness || 85}%` }}
            />
          </div>
        </div>

        {/* Data Source Attribution */}
        <div className="pt-4 aicher-border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="aicher-heading-wide text-xs text-gray-500">Data Sources</div>
            <div className="flex gap-2">
              <DataSourceBadge source="congress-legislators" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
