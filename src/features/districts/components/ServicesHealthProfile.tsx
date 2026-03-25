/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import { StatisticsIcon, CheckIcon } from '@/components/icons/AicherIcons';
import type { ServicesHealthProfile } from '@/types/district-enhancements';

interface ServicesHealthProps {
  districtId: string;
}

interface ServicesData {
  districtId: string;
  services: ServicesHealthProfile;
  metadata: {
    timestamp: string;
    dataSources: {
      education: string;
      cdc: string;
      healthcare: string;
    };
    notes: string[];
  };
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return formatCurrency(num);
}

function getStarRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  return (
    '★'.repeat(fullStars) +
    (hasHalfStar ? '☆' : '') +
    '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))
  );
}

export default function ServicesHealthProfile({ districtId }: ServicesHealthProps) {
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServicesData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/districts/${districtId}/services-health`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch services & health data');
        }

        const servicesData = await response.json();
        setData(servicesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load services & health data');
      } finally {
        setLoading(false);
      }
    }

    if (districtId) {
      fetchServicesData();
    }
  }, [districtId]);

  if (loading) {
    return (
      <div className="bg-white border-aicher border-black p-grid-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 w-48 mb-4 border border-gray-300"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-300 border border-gray-300 p-grid-3 h-24"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-aicher border-black p-grid-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Education & Healthcare</h3>
        <div className="bg-white border border-gray-300 p-grid-3 text-center">
          <p className="text-gray-600">
            Education & healthcare data not available for this district
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error || 'Unable to load data from government APIs'}
          </p>
        </div>
      </div>
    );
  }

  const { services } = data;

  return (
    <div className="bg-white border-aicher border-black p-grid-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Education & Healthcare Access</h3>

      {/* Education Metrics */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <StatisticsIcon className="w-5 h-5 mr-2 text-civiq-blue" />
          Education Performance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-civiq-blue/10 border-aicher border-civiq-blue p-grid-3">
            <div className="text-2xl font-bold text-civiq-blue">
              {formatPercentage(services.education.graduationRate)}
            </div>
            <p className="text-sm text-civiq-blue mt-1">Graduation Rate</p>
            <p className="text-xs text-civiq-blue mt-1">
              {services.education.graduationRate >= 85
                ? 'Excellent'
                : services.education.graduationRate >= 75
                  ? 'Good'
                  : 'Needs Improvement'}
            </p>
          </div>

          <div className="bg-civiq-blue/10 border-aicher border-civiq-blue p-grid-3">
            <div className="text-2xl font-bold text-civiq-blue">
              {services.education.schoolDistrictPerformance}/100
            </div>
            <p className="text-sm text-civiq-blue mt-1">District Performance</p>
            <p className="text-xs text-civiq-blue mt-1">Overall school quality</p>
          </div>

          <div className="bg-indigo-50 border-aicher border-indigo-600 p-grid-3">
            <div className="text-2xl font-bold text-indigo-900">
              {formatPercentage(services.education.collegeEnrollmentRate)}
            </div>
            <p className="text-sm text-indigo-700 mt-1">College Enrollment</p>
            <p className="text-xs text-indigo-600 mt-1">Post-secondary education</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 border-aicher border-emerald-600 p-grid-3">
            <div className="text-2xl font-bold text-emerald-900">
              {formatLargeNumber(services.education.federalEducationFunding)}
            </div>
            <p className="text-sm text-emerald-700 mt-1">Federal Education Funding</p>
            <p className="text-xs text-emerald-600 mt-1">Annual investment</p>
          </div>

          <div className="bg-cyan-50 border-aicher border-cyan-600 p-grid-3">
            <div className="text-2xl font-bold text-cyan-900">
              {services.education.teacherToStudentRatio.toFixed(1)}:1
            </div>
            <p className="text-sm text-cyan-700 mt-1">Teacher-Student Ratio</p>
            <p className="text-xs text-cyan-600 mt-1">
              {services.education.teacherToStudentRatio <= 15
                ? 'Excellent'
                : services.education.teacherToStudentRatio <= 20
                  ? 'Good'
                  : 'High'}
            </p>
          </div>
        </div>
      </div>

      {/* Healthcare Access - Only show if any healthcare data exists */}
      {(services.healthcare.hospitalQualityRating > 0 ||
        services.healthcare.primaryCarePhysiciansPerCapita > 0 ||
        services.healthcare.healthOutcomeIndex > 0 ||
        services.healthcare.medicareProviderCount > 0 ||
        services.healthcare.healthcareCostIndex > 0) && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
            <CheckIcon className="w-5 h-5 mr-2 text-civiq-red" />
            Healthcare Access
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.healthcare.hospitalQualityRating > 0 && (
              <div className="bg-civiq-red/10 border-aicher border-civiq-red p-grid-3">
                <div className="text-2xl font-bold text-civiq-red">
                  {getStarRating(services.healthcare.hospitalQualityRating)}
                </div>
                <p className="text-sm text-civiq-red mt-1">Hospital Quality Rating</p>
                <p className="text-xs text-civiq-red mt-1">
                  {services.healthcare.hospitalQualityRating.toFixed(1)} out of 5 stars
                </p>
              </div>
            )}

            {services.healthcare.primaryCarePhysiciansPerCapita > 0 && (
              <div className="bg-pink-50 border-aicher border-pink-600 p-grid-3">
                <div className="text-2xl font-bold text-pink-900">
                  {services.healthcare.primaryCarePhysiciansPerCapita}
                </div>
                <p className="text-sm text-pink-700 mt-1">Primary Care Physicians</p>
                <p className="text-xs text-pink-600 mt-1">Per 100,000 residents</p>
              </div>
            )}

            {services.healthcare.healthOutcomeIndex > 0 && (
              <div className="bg-rose-50 border-aicher border-rose-600 p-grid-3">
                <div className="text-2xl font-bold text-rose-900">
                  {services.healthcare.healthOutcomeIndex}/100
                </div>
                <p className="text-sm text-rose-700 mt-1">Health Outcome Index</p>
                <p className="text-xs text-rose-600 mt-1">
                  {services.healthcare.healthOutcomeIndex >= 80
                    ? 'Excellent'
                    : services.healthcare.healthOutcomeIndex >= 65
                      ? 'Good'
                      : 'Needs Improvement'}
                </p>
              </div>
            )}
          </div>

          {(services.healthcare.medicareProviderCount > 0 ||
            services.healthcare.healthcareCostIndex > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.healthcare.medicareProviderCount > 0 && (
                <div className="bg-civiq-red/10 border-aicher border-civiq-red p-grid-3">
                  <div className="text-2xl font-bold text-civiq-red">
                    {services.healthcare.medicareProviderCount}
                  </div>
                  <p className="text-sm text-civiq-red mt-1">Medicare Providers</p>
                  <p className="text-xs text-civiq-red mt-1">Active provider count</p>
                </div>
              )}

              {services.healthcare.healthcareCostIndex > 0 && (
                <div className="bg-amber-50 border-aicher border-amber-600 p-grid-3">
                  <div className="text-2xl font-bold text-amber-900">
                    {(services.healthcare.healthcareCostIndex * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-amber-700 mt-1">Healthcare Cost Index</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {services.healthcare.healthcareCostIndex <= 1.0
                      ? 'Below Average'
                      : services.healthcare.healthcareCostIndex <= 1.2
                        ? 'Average'
                        : 'Above Average'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Public Health */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <CheckIcon className="w-5 h-5 mr-2 text-civiq-green" />
          Public Health & Prevention
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-civiq-green/10 border-aicher border-civiq-green p-grid-3">
            <div className="text-2xl font-bold text-civiq-green">
              {services.publicHealth.preventableDiseaseRate.toFixed(0)}
            </div>
            <p className="text-sm text-civiq-green mt-1">Preventable Disease Rate</p>
            <p className="text-xs text-civiq-green mt-1">Per 100,000 population</p>
          </div>

          <div className="bg-teal-50 border-aicher border-teal-600 p-grid-3">
            <div className="text-2xl font-bold text-teal-900">
              {services.publicHealth.mentalHealthProviderRatio.toFixed(1)}
            </div>
            <p className="text-sm text-teal-700 mt-1">Mental Health Provider Ratio</p>
            <p className="text-xs text-teal-600 mt-1">Per 1,000 residents</p>
          </div>

          <div className="bg-lime-50 border-aicher border-lime-600 p-grid-3">
            <div className="text-2xl font-bold text-lime-900">
              {services.publicHealth.substanceAbusePrograms}
            </div>
            <p className="text-sm text-lime-700 mt-1">Substance Abuse Programs</p>
            <p className="text-xs text-lime-600 mt-1">Available programs</p>
          </div>

          <div className="bg-emerald-50 border-aicher border-emerald-600 p-grid-3">
            <div className="text-2xl font-bold text-emerald-900">
              {formatPercentage(services.publicHealth.preventiveCareCoverage)}
            </div>
            <p className="text-sm text-emerald-700 mt-1">Preventive Care Coverage</p>
            <p className="text-xs text-emerald-600 mt-1">Population with access</p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="border-t pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <StatisticsIcon className="w-4 h-4 mr-2" />
          Data Sources
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <strong>Education:</strong>{' '}
            <a
              href={data.metadata.dataSources.education}
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:text-civiq-blue"
            >
              Department of Education
            </a>
          </div>
          <div>
            <strong>Public Health:</strong>{' '}
            <a
              href={data.metadata.dataSources.cdc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:text-civiq-blue"
            >
              Centers for Disease Control
            </a>
          </div>
          <div>
            <strong>Healthcare:</strong>{' '}
            <span className="text-civiq-red">{data.metadata.dataSources.healthcare}</span>
          </div>
        </div>

        {data.metadata.notes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <p>
              <strong>Notes:</strong> {data.metadata.notes.join(' • ')}
            </p>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400">
          Last updated: {new Date(data.metadata.timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
