/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';

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
  // Helper function to generate correct bill ID for routing
  const getBillId = (bill: Bill): string => {
    // Handle missing bill.type - try to extract from bill.number
    let cleanType = '';
    if (bill.type) {
      cleanType = bill.type.toLowerCase().replace(/\./g, '');
    } else if (bill.number) {
      // Try to extract type from number (e.g., "H.R. 1234" -> "hr")
      const typeMatch = bill.number.match(/^([A-Z]+\.?[A-Z]*\.?)/);
      if (typeMatch && typeMatch[1]) {
        cleanType = typeMatch[1].toLowerCase().replace(/\./g, '');
      }
    }

    // Extract numeric part from bill number
    const cleanNumber = bill.number ? bill.number.replace(/[^\d]/g, '') : '';

    // Use fallback if we couldn't determine type or number
    if (!cleanType || !cleanNumber) {
      // Use the full bill number as fallback ID
      return `${bill.congress || '119'}-${bill.number || 'unknown'}`.replace(/\s+/g, '-');
    }

    return `${bill.congress || '119'}-${cleanType}-${cleanNumber}`;
  };

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
                <Link
                  href={`/bill/${getBillId(bill)}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {bill.number}: {bill.title}
                </Link>
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
