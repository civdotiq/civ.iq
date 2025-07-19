/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { structuredLogger } from '@/lib/logging/logger';

interface CommitteeBill {
  billId: string;
  billNumber: string;
  title: string;
  sponsor: {
    name: string;
    party: string;
    state: string;
  };
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  status: string;
  committeeStatus: 'referred' | 'markup_scheduled' | 'markup_completed' | 'reported' | 'stalled';
  nextCommitteeAction?: {
    type: string;
    date: string;
    description: string;
  };
}

interface CommitteeReport {
  reportId: string;
  reportNumber: string;
  title: string;
  publishedDate: string;
  reportType: string;
  summary?: string;
  url?: string;
}

interface CommitteeBillsAndReportsProps {
  committeeId: string;
}

export default function CommitteeBillsAndReports({ committeeId }: CommitteeBillsAndReportsProps) {
  const [bills, setBills] = useState<CommitteeBill[]>([]);
  const [reports, setReports] = useState<CommitteeReport[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'reports'>('bills');

  useEffect(() => {
    fetchBills();
    fetchReports();
  }, [committeeId]);

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      const response = await fetch(`/api/committee/${committeeId}/bills`);
      const data = await response.json();
      if (data.success) {
        setBills(data.bills);
      }
    } catch (error) {
      structuredLogger.error('Error fetching bills', error as Error, {
        committeeId,
        operation: 'fetchBills'
      });
    } finally {
      setBillsLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const response = await fetch(`/api/committee/${committeeId}/reports`);
      const data = await response.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      structuredLogger.error('Error fetching reports', error as Error, {
        committeeId,
        operation: 'fetchReports'
      });
    } finally {
      setReportsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'in committee':
        return 'bg-blue-100 text-blue-800';
      case 'introduced':
        return 'bg-gray-100 text-gray-800';
      case 'reported':
        return 'bg-purple-100 text-purple-800';
      case 'amended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommitteeStatusColor = (status: CommitteeBill['committeeStatus']) => {
    switch (status) {
      case 'reported':
        return 'bg-green-100 text-green-800';
      case 'markup_completed':
        return 'bg-blue-100 text-blue-800';
      case 'markup_scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'referred':
        return 'bg-gray-100 text-gray-800';
      case 'stalled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCommitteeStatus = (status: CommitteeBill['committeeStatus']) => {
    switch (status) {
      case 'markup_scheduled':
        return 'Markup Scheduled';
      case 'markup_completed':
        return 'Markup Completed';
      case 'referred':
        return 'Referred';
      case 'reported':
        return 'Reported';
      case 'stalled':
        return 'Stalled';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'bills'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Bills ({bills.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'reports'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Reports ({reports.length})
        </button>
      </div>

      {/* Bills Tab */}
      {activeTab === 'bills' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Committee Bills</h2>
          
          {billsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : bills.length > 0 ? (
            <div className="space-y-4">
              {bills.map((bill) => (
                <div key={bill.billId} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{bill.billNumber}</h3>
                      <p className="text-sm text-gray-600 mt-1">{bill.title}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                        {bill.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCommitteeStatusColor(bill.committeeStatus)}`}>
                        {formatCommitteeStatus(bill.committeeStatus)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Sponsor:</strong> {bill.sponsor.name} ({bill.sponsor.party} - {bill.sponsor.state})
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Introduced:</strong> {new Date(bill.introducedDate).toLocaleDateString()}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Latest Action:</strong> {bill.latestAction.text}
                    <span className="text-gray-500 ml-2">
                      ({new Date(bill.latestAction.date).toLocaleDateString()})
                    </span>
                  </div>
                  
                  {bill.nextCommitteeAction && (
                    <div className="text-sm text-blue-600 mt-2">
                      <strong>Next Action:</strong> {bill.nextCommitteeAction.description}
                      {bill.nextCommitteeAction.date !== 'TBD' && (
                        <span className="ml-2">
                          ({new Date(bill.nextCommitteeAction.date).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No bills found for this committee.
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Committee Reports</h2>
          
          {reportsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.reportId} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{report.reportNumber}</h3>
                      <p className="text-sm text-gray-600 mt-1">{report.title}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                      {report.reportType.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Published:</strong> {new Date(report.publishedDate).toLocaleDateString()}
                  </div>
                  
                  {report.summary && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Summary:</strong> {report.summary}
                    </div>
                  )}
                  
                  {report.url && (
                    <div className="mt-2">
                      <Link
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Full Report →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No reports found for this committee.
            </div>
          )}
        </div>
      )}
    </div>
  );
}