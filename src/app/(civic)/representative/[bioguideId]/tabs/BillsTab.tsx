/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import logger from '@/lib/logging/simple-logger';

interface Bill {
  id: string;
  number: string;
  title: string;
  introducedDate: string;
  status: string;
  lastAction: string;
  congress: number;
  type: string;
  policyArea: string;
  url?: string;
  committee?: string;
  progress?: number;
}

interface BillsTabProps {
  bills: Bill[];
  metadata?: unknown;
  loading?: boolean;
}

export function BillsTab({ bills = [] }: BillsTabProps) {
  const params = useParams();
  const bioguideId = params?.bioguideId as string;

  // Only create links for bills with complete data
  const canLinkToBill = useCallback((bill: Bill): boolean => {
    return !!(bill.type && bill.number && bill.congress);
  }, []);

  // Helper function to generate correct bill ID for routing - ONLY for complete bills
  const getBillId = (bill: Bill): string => {
    const cleanType = bill.type.toLowerCase().replace(/\./g, '');
    const cleanNumber = bill.number.replace(/[^\d]/g, '');
    return `${bill.congress}-${cleanType}-${cleanNumber}`;
  };

  // DIAGNOSTIC LOGGING - Track data quality issues
  useEffect(() => {
    const incompleteBills = bills.filter(b => !b.type || !b.number || !b.congress);
    if (incompleteBills.length > 0) {
      logger.error(
        `[DATA QUALITY] ${incompleteBills.length}/${bills.length} bills have missing data`,
        new Error('Incomplete bill data'),
        {
          bioguideId,
          samples: incompleteBills.slice(0, 3),
          missingFields: incompleteBills.map(b => ({
            id: b.id,
            number: b.number,
            hasType: !!b.type,
            hasNumber: !!b.number,
            hasCongress: !!b.congress,
            rawType: b.type,
            rawCongress: b.congress,
          })),
        }
      );
    }

    const linkableBills = bills.filter(canLinkToBill);
    logger.info(
      `[BILLS TAB] ${linkableBills.length}/${bills.length} bills are clickable for ${bioguideId}`,
      {
        bioguideId,
        totalBills: bills.length,
        linkableBills: linkableBills.length,
      }
    );
  }, [bills, bioguideId, canLinkToBill]);

  // Calculate bill statistics
  const totalBills = bills.length;
  const enactedBills = bills.filter(
    bill => bill.status && bill.status.toLowerCase().includes('enacted')
  ).length;
  const avgCosponsors = 0; // This would come from actual data
  const totalSupport = 0; // This would come from actual data

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Legislative Tracker</h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{totalBills}</div>
          <div className="text-sm text-gray-500">Bills Sponsored</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{enactedBills}</div>
          <div className="text-sm text-gray-500">Enacted</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600">{avgCosponsors}</div>
          <div className="text-sm text-gray-500">Avg Cosponsors</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{totalSupport}</div>
          <div className="text-sm text-gray-500">Total Support</div>
        </div>
      </div>

      {bills.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No bills data available</p>
      ) : (
        <div className="space-y-4">
          {bills.slice(0, 10).map(bill => (
            <div key={bill.id} className="border rounded-lg p-4">
              <h3 className="font-medium">
                {canLinkToBill(bill) ? (
                  <Link
                    href={`/bill/${getBillId(bill)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {bill.number}: {bill.title}
                  </Link>
                ) : (
                  <span
                    className="text-gray-500"
                    title="Bill details unavailable - incomplete data"
                  >
                    {bill.title || bill.number || 'Unknown Bill'}
                  </span>
                )}
                {bill.url && (
                  <a
                    href={bill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    (Congress.gov)
                  </a>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Introduced:{' '}
                {bill.introducedDate
                  ? new Date(bill.introducedDate).toLocaleDateString()
                  : 'Date unknown'}
              </p>
              <p className="text-sm text-gray-600 mt-1">{bill.lastAction}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {bill.committee || 'Committee: Unknown'}
                </span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                  {bill.type || 'Type: Unknown'}
                </span>
                {bill.policyArea && (
                  <span className="text-xs bg-green-100 px-2 py-1 rounded">{bill.policyArea}</span>
                )}
                <span className="text-xs bg-yellow-100 px-2 py-1 rounded">
                  {bill.status || 'Status: Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
