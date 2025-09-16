/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { GraduationCap, Heart, Shield, Activity } from 'lucide-react';
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
      cms: string;
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Education & Healthcare</h3>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Education & Healthcare Access</h3>

      {/* Education Metrics */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
          Education Performance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-900">
              {formatPercentage(services.education.graduationRate)}
            </div>
            <p className="text-sm text-blue-700 mt-1">Graduation Rate</p>
            <p className="text-xs text-blue-600 mt-1">
              {services.education.graduationRate >= 85
                ? '🟢 Excellent'
                : services.education.graduationRate >= 75
                  ? '🟡 Good'
                  : '🔴 Needs Improvement'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-purple-900">
              {services.education.schoolDistrictPerformance}/100
            </div>
            <p className="text-sm text-purple-700 mt-1">District Performance</p>
            <p className="text-xs text-purple-600 mt-1">Overall school quality</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-indigo-900">
              {formatPercentage(services.education.collegeEnrollmentRate)}
            </div>
            <p className="text-sm text-indigo-700 mt-1">College Enrollment</p>
            <p className="text-xs text-indigo-600 mt-1">Post-secondary education</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-emerald-900">
              {formatLargeNumber(services.education.federalEducationFunding)}
            </div>
            <p className="text-sm text-emerald-700 mt-1">Federal Education Funding</p>
            <p className="text-xs text-emerald-600 mt-1">Annual investment</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-cyan-900">
              {services.education.teacherToStudentRatio.toFixed(1)}:1
            </div>
            <p className="text-sm text-cyan-700 mt-1">Teacher-Student Ratio</p>
            <p className="text-xs text-cyan-600 mt-1">
              {services.education.teacherToStudentRatio <= 15
                ? '🟢 Excellent'
                : services.education.teacherToStudentRatio <= 20
                  ? '🟡 Good'
                  : '🔴 High'}
            </p>
          </div>
        </div>
      </div>

      {/* Healthcare Access */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-600" />
          Healthcare Access
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-red-900">
              {getStarRating(services.healthcare.hospitalQualityRating)}
            </div>
            <p className="text-sm text-red-700 mt-1">Hospital Quality Rating</p>
            <p className="text-xs text-red-600 mt-1">
              {services.healthcare.hospitalQualityRating.toFixed(1)} out of 5 stars
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-pink-900">
              {services.healthcare.primaryCarePhysiciansPerCapita}
            </div>
            <p className="text-sm text-pink-700 mt-1">Primary Care Physicians</p>
            <p className="text-xs text-pink-600 mt-1">Per 100,000 residents</p>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-rose-900">
              {services.healthcare.healthOutcomeIndex}/100
            </div>
            <p className="text-sm text-rose-700 mt-1">Health Outcome Index</p>
            <p className="text-xs text-rose-600 mt-1">
              {services.healthcare.healthOutcomeIndex >= 80
                ? '🟢 Excellent'
                : services.healthcare.healthOutcomeIndex >= 65
                  ? '🟡 Good'
                  : '🔴 Needs Improvement'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-orange-900">
              {services.healthcare.medicareProviderCount}
            </div>
            <p className="text-sm text-orange-700 mt-1">Medicare Providers</p>
            <p className="text-xs text-orange-600 mt-1">Active provider count</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-amber-900">
              {(services.healthcare.healthcareCostIndex * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-amber-700 mt-1">Healthcare Cost Index</p>
            <p className="text-xs text-amber-600 mt-1">
              {services.healthcare.healthcareCostIndex <= 1.0
                ? '🟢 Below Average'
                : services.healthcare.healthcareCostIndex <= 1.2
                  ? '🟡 Average'
                  : '🔴 Above Average'}
            </p>
          </div>
        </div>
      </div>

      {/* Public Health */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-green-600" />
          Public Health & Prevention
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-900">
              {services.publicHealth.preventableDiseaseRate.toFixed(0)}
            </div>
            <p className="text-sm text-green-700 mt-1">Preventable Disease Rate</p>
            <p className="text-xs text-green-600 mt-1">Per 100,000 population</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-teal-900">
              {services.publicHealth.mentalHealthProviderRatio.toFixed(1)}
            </div>
            <p className="text-sm text-teal-700 mt-1">Mental Health Provider Ratio</p>
            <p className="text-xs text-teal-600 mt-1">Per 1,000 residents</p>
          </div>

          <div className="bg-gradient-to-br from-lime-50 to-lime-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-lime-900">
              {services.publicHealth.substanceAbusePrograms}
            </div>
            <p className="text-sm text-lime-700 mt-1">Substance Abuse Programs</p>
            <p className="text-xs text-lime-600 mt-1">Available programs</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6">
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
          <Activity className="w-4 h-4 mr-2" />
          Data Sources
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <strong>Education:</strong>{' '}
            <a
              href={data.metadata.dataSources.education}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
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
              className="text-blue-600 hover:text-blue-800"
            >
              Centers for Disease Control
            </a>
          </div>
          <div>
            <strong>Healthcare:</strong>{' '}
            <span className="text-gray-500">CMS provider data estimates</span>
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
