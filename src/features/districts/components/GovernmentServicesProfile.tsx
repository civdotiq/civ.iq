/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { DollarSign, FileText, Building2, Users } from 'lucide-react';
import type { GovernmentServicesProfile } from '@/types/district-enhancements';

interface GovernmentServicesProps {
  districtId: string;
}

interface GovernmentData {
  districtId: string;
  government: GovernmentServicesProfile;
  metadata: {
    timestamp: string;
    dataSources: {
      usaspending: string;
      congress: string;
      census: string;
    };
    notes: string[];
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return formatCurrency(num);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export default function GovernmentServicesProfile({ districtId }: GovernmentServicesProps) {
  const [data, setData] = useState<GovernmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGovernmentData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/districts/${districtId}/government-spending`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch government spending data');
        }

        const governmentData = await response.json();
        setData(governmentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load government spending data');
      } finally {
        setLoading(false);
      }
    }

    if (districtId) {
      fetchGovernmentData();
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Federal Investment & Services</h3>
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600">Government spending data not available for this district</p>
          <p className="text-sm text-gray-500 mt-2">
            {error || 'Unable to load data from government APIs'}
          </p>
        </div>
      </div>
    );
  }

  const { government } = data;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Federal Investment & Services</h3>

      {/* Federal Investment */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Federal Investment
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-900">
              {formatLargeNumber(government.federalInvestment.totalAnnualSpending)}
            </div>
            <p className="text-sm text-green-700 mt-1">Total Annual Spending</p>
            <p className="text-xs text-green-600 mt-1">Federal dollars to district</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-900">
              {formatNumber(government.federalInvestment.contractsAndGrants)}
            </div>
            <p className="text-sm text-blue-700 mt-1">Contracts & Grants</p>
            <p className="text-xs text-blue-600 mt-1">Active federal awards</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-purple-900">
              {formatLargeNumber(government.federalInvestment.infrastructureInvestment)}
            </div>
            <p className="text-sm text-purple-700 mt-1">Infrastructure Investment</p>
            <p className="text-xs text-purple-600 mt-1">Roads, bridges, utilities</p>
          </div>
        </div>

        {government.federalInvestment.majorProjects.length > 0 && (
          <div className="mt-6">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Major Federal Projects:</h5>
            <div className="space-y-3">
              {government.federalInvestment.majorProjects.slice(0, 3).map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900">{project.title}</h6>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{project.agency}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-lg font-bold text-gray-900">
                        {formatLargeNumber(project.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Social Services */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Social Services
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-orange-900">
              {formatNumber(government.socialServices.snapBeneficiaries)}
            </div>
            <p className="text-sm text-orange-700 mt-1">SNAP Beneficiaries</p>
            <p className="text-xs text-orange-600 mt-1">Households receiving aid</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-red-900">
              {formatNumber(government.socialServices.medicaidEnrollment)}
            </div>
            <p className="text-sm text-red-700 mt-1">Medicaid Enrollment</p>
            <p className="text-xs text-red-600 mt-1">Healthcare coverage</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-teal-900">
              {formatNumber(government.socialServices.housingAssistanceUnits)}
            </div>
            <p className="text-sm text-teal-700 mt-1">Housing Assistance</p>
            <p className="text-xs text-teal-600 mt-1">Subsidized units</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-indigo-900">
              {formatNumber(government.socialServices.veteransServices)}
            </div>
            <p className="text-sm text-indigo-700 mt-1">Veterans Served</p>
            <p className="text-xs text-indigo-600 mt-1">VA benefits & services</p>
          </div>
        </div>
      </div>

      {/* Congressional Representation */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-purple-600" />
          Congressional Activity
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-violet-900">
              {government.representation.billsAffectingDistrict.length}
            </div>
            <p className="text-sm text-violet-700 mt-1">Active Bills</p>
            <p className="text-xs text-violet-600 mt-1">Affecting this district</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-6">
            <div className="text-2xl font-bold text-cyan-900">
              {formatLargeNumber(government.representation.appropriationsSecured)}
            </div>
            <p className="text-sm text-cyan-700 mt-1">Appropriations Secured</p>
            <p className="text-xs text-cyan-600 mt-1">By representatives</p>
          </div>
        </div>

        {government.representation.billsAffectingDistrict.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Recent Legislation:</h5>
            <div className="space-y-2">
              {government.representation.billsAffectingDistrict.slice(0, 4).map((bill, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 text-sm">{bill.title}</h6>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{bill.billNumber}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{bill.status}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        bill.impactLevel === 'High'
                          ? 'bg-red-100 text-red-800'
                          : bill.impactLevel === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {bill.impactLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Federal Facilities */}
      {government.representation.federalFacilities.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-gray-600" />
            Federal Facilities
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {government.representation.federalFacilities.slice(0, 4).map((facility, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4"
              >
                <h6 className="font-medium text-gray-900">{facility.name}</h6>
                <p className="text-sm text-gray-600 mt-1">{facility.type}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {formatNumber(facility.employees)} employees
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {formatLargeNumber(facility.economicImpact)} impact
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div className="border-t pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Data Sources
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <strong>Federal Spending:</strong>{' '}
            <a
              href={data.metadata.dataSources.usaspending}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              USASpending.gov
            </a>
          </div>
          <div>
            <strong>Congressional Data:</strong>{' '}
            <span className="text-gray-500">Congress.gov enhanced access</span>
          </div>
          <div>
            <strong>Social Services:</strong>{' '}
            <span className="text-gray-500">Census demographic estimates</span>
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
