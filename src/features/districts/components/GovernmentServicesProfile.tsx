/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

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
      socialServices: string;
      federalFacilities: string;
      medicaidChip?: string;
      veteranPopulation?: string;
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

/** Format a YYYYMM reporting period (e.g. "202602") as "Feb 2026". */
function formatReportingPeriod(period: string | null): string | null {
  if (!period || period.length !== 6) return null;
  const year = period.slice(0, 4);
  const monthIndex = parseInt(period.slice(4, 6), 10) - 1;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${months[monthIndex]} ${year}`;
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
      <div className="bg-white border-2 border-black p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border-2 border-gray-300 p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Federal Investment & Services</h3>
        <div className="bg-white p-6 text-center">
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
    <div className="bg-white border-2 border-black p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Federal Investment & Services</h3>

      {/* Federal Investment - district-scoped USASpending figures; hide cards without real data */}
      {(government.federalInvestment.totalAnnualSpending != null ||
        government.federalInvestment.contractsAndGrants != null ||
        government.federalInvestment.spendingPerCapita != null ||
        government.federalInvestment.infrastructureInvestment != null ||
        government.federalInvestment.majorProjects.length > 0) && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-civiq-blue" />
            Federal Investment
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {government.federalInvestment.totalAnnualSpending != null && (
              <div className="bg-civiq-blue/10 p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatLargeNumber(government.federalInvestment.totalAnnualSpending)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Federal Spending</p>
                <p className="text-xs text-civiq-blue mt-1">
                  In this district, current fiscal year to date
                </p>
              </div>
            )}

            {government.federalInvestment.spendingPerCapita != null && (
              <div className="bg-civiq-blue/10 p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(government.federalInvestment.spendingPerCapita)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Per Resident</p>
                <p className="text-xs text-civiq-blue mt-1">
                  Federal spending per capita in this district
                </p>
              </div>
            )}

            {government.federalInvestment.contractsAndGrants != null && (
              <div className="bg-civiq-blue/10 p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatNumber(government.federalInvestment.contractsAndGrants)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Contracts & Grants</p>
                <p className="text-xs text-civiq-blue mt-1">
                  Awarded in this district, current fiscal year
                </p>
              </div>
            )}

            {government.federalInvestment.infrastructureInvestment != null && (
              <div className="bg-civiq-blue/10 p-6">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatLargeNumber(government.federalInvestment.infrastructureInvestment)}
                </div>
                <p className="text-sm text-civiq-blue mt-1">Infrastructure Investment</p>
                <p className="text-xs text-civiq-blue mt-1">Roads, bridges, utilities</p>
              </div>
            )}
          </div>

          {government.federalInvestment.majorProjects.length > 0 && (
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Major Federal Projects:</h5>
              <div className="space-y-3">
                {government.federalInvestment.majorProjects.slice(0, 3).map((project, index) => (
                  <div key={index} className="bg-white p-4">
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
      )}

      {/* Social Services - Only show if any social services data exists */}
      {((government.socialServices.snapBeneficiaries ?? 0) > 0 ||
        (government.socialServices.medicaidEnrollment ?? 0) > 0 ||
        (government.socialServices.housingAssistanceUnits ?? 0) > 0 ||
        (government.socialServices.veteransServices ?? 0) > 0) && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-civiq-blue" />
            Social Services
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(government.socialServices.snapBeneficiaries ?? 0) > 0 && (
              <div className="bg-civiq-red/10 p-6">
                <div className="text-2xl font-bold text-civiq-red">
                  {new Intl.NumberFormat('en-US').format(
                    government.socialServices.snapBeneficiaries ?? 0
                  )}
                </div>
                <p className="text-sm text-civiq-red mt-1">SNAP Beneficiaries</p>
                <p className="text-xs text-civiq-red mt-1">Households receiving aid</p>
              </div>
            )}

            {(government.socialServices.medicaidEnrollment ?? 0) > 0 && (
              <div className="bg-civiq-red/10 p-6">
                <div className="text-2xl font-bold text-civiq-red">
                  {new Intl.NumberFormat('en-US').format(
                    government.socialServices.medicaidEnrollment ?? 0
                  )}
                </div>
                <p className="text-sm text-civiq-red mt-1">Medicaid Enrollment</p>
                <p className="text-xs text-civiq-red mt-1">Healthcare coverage</p>
              </div>
            )}

            {(government.socialServices.housingAssistanceUnits ?? 0) > 0 && (
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6">
                <div className="text-2xl font-bold text-teal-900">
                  {new Intl.NumberFormat('en-US').format(
                    government.socialServices.housingAssistanceUnits ?? 0
                  )}
                </div>
                <p className="text-sm text-teal-700 mt-1">Housing Assistance</p>
                <p className="text-xs text-teal-600 mt-1">Subsidized units</p>
              </div>
            )}

            {(government.socialServices.veteransServices ?? 0) > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
                <div className="text-2xl font-bold text-indigo-900">
                  {new Intl.NumberFormat('en-US').format(
                    government.socialServices.veteransServices ?? 0
                  )}
                </div>
                <p className="text-sm text-indigo-700 mt-1">Veterans Served</p>
                <p className="text-xs text-indigo-600 mt-1">VA benefits & services</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statewide context — explicitly NOT district-specific */}
      {(government.stateContext.medicaidChipEnrollment !== null ||
        government.stateContext.veteranPopulation !== null) && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-1 flex items-center">
            <Users className="w-5 h-5 mr-2 text-civiq-blue" />
            Statewide context
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Figures below are statewide totals for {government.stateContext.state}, not specific to
            this district — these federal programs report only at the state level.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {government.stateContext.medicaidChipEnrollment !== null && (
              <div className="border-2 border-gray-200 p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US').format(
                    government.stateContext.medicaidChipEnrollment
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">Medicaid &amp; CHIP enrollment</p>
                <p className="text-xs text-gray-500 mt-1">
                  Statewide
                  {formatReportingPeriod(government.stateContext.medicaidChipPeriod)
                    ? ` · ${formatReportingPeriod(government.stateContext.medicaidChipPeriod)}`
                    : ''}
                  {government.stateContext.medicaidChipPreliminary ? ' · preliminary' : ''} · CMS
                </p>
              </div>
            )}

            {government.stateContext.veteranPopulation !== null && (
              <div className="border-2 border-gray-200 p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US').format(government.stateContext.veteranPopulation)}
                </div>
                <p className="text-sm text-gray-700 mt-1">Veteran population</p>
                <p className="text-xs text-gray-500 mt-1">
                  Statewide
                  {government.stateContext.veteranPopulationFiscalYear
                    ? ` · ${government.stateContext.veteranPopulationFiscalYear}`
                    : ''}{' '}
                  · VA NCVAS
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Congressional Representation */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-civiq-blue" />
          Congressional Activity
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-6">
            <div className="text-2xl font-bold text-violet-900">
              {government.representation.billsAffectingDistrict.length}
            </div>
            <p className="text-sm text-violet-700 mt-1">Active Bills</p>
            <p className="text-xs text-violet-600 mt-1">Affecting this district</p>
          </div>

          {government.representation.appropriationsSecured != null && (
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6">
              <div className="text-2xl font-bold text-cyan-900">
                {formatLargeNumber(government.representation.appropriationsSecured)}
              </div>
              <p className="text-sm text-cyan-700 mt-1">Appropriations Secured</p>
              <p className="text-xs text-cyan-600 mt-1">By representatives</p>
            </div>
          )}
        </div>

        {government.representation.billsAffectingDistrict.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Recent Legislation:</h5>
            <div className="space-y-2">
              {government.representation.billsAffectingDistrict.slice(0, 4).map((bill, index) => (
                <div key={index} className="bg-white p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 text-sm">{bill.title}</h6>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{bill.billNumber}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{bill.status}</span>
                      </div>
                    </div>
                    {bill.impactLevel != null && (
                      <span
                        className={`px-2 py-1 text-xs ${
                          bill.impactLevel === 'High'
                            ? 'bg-civiq-red/10 text-civiq-red'
                            : bill.impactLevel === 'Medium'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-civiq-green/10 text-civiq-green'
                        }`}
                      >
                        {bill.impactLevel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Federal Facilities - Only show if facilities with real data exist */}
      {government.representation.federalFacilities.length > 0 &&
        government.representation.federalFacilities.some(
          facility => facility.employees > 0 || facility.economicImpact > 0
        ) && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-gray-600" />
              Federal Facilities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {government.representation.federalFacilities
                .filter(facility => facility.employees > 0 || facility.economicImpact > 0)
                .slice(0, 4)
                .map((facility, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                    <h6 className="font-medium text-gray-900">{facility.name}</h6>
                    <p className="text-sm text-gray-600 mt-1">{facility.type}</p>
                    <div className="flex justify-between items-center mt-2">
                      {facility.employees > 0 && (
                        <span className="text-sm text-gray-500">
                          {new Intl.NumberFormat('en-US').format(facility.employees)} employees
                        </span>
                      )}
                      {facility.economicImpact > 0 && (
                        <span className="text-sm font-medium text-gray-700">
                          {formatLargeNumber(facility.economicImpact)} impact
                        </span>
                      )}
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
              className="text-civiq-blue hover:text-civiq-blue"
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
            <span className="text-civiq-red">{data.metadata.dataSources.socialServices}</span>
          </div>
          <div>
            <strong>Federal Facilities:</strong>{' '}
            <span className="text-civiq-red">{data.metadata.dataSources.federalFacilities}</span>
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
