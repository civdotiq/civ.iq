'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';

interface RepresentativeData {
  name?: string;
  party?: string;
  state?: string;
  chamber?: string;
  district?: string;
  committees?: unknown[];
}

interface BillData {
  title?: string;
  number?: string;
  congress?: number;
  introducedDate?: string;
}

interface InitialData {
  bills?: BillData[];
  votes?: unknown[];
  finance?: Record<string, unknown>;
}

interface ClientWrapperProps {
  bioguideId: string;
  initialData: InitialData;
  representative: RepresentativeData;
}

export function SimpleClientWrapper({
  bioguideId,
  initialData,
  representative,
}: ClientWrapperProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success indicator */}
      <div className="bg-green-500 text-white p-4 mb-4 rounded">
        ✅ SIMPLE CLIENT COMPONENT MOUNTED SUCCESSFULLY
      </div>

      {/* Basic representative info */}
      <div className="bg-blue-50 border border-blue-200 p-4 mb-6">
        <h1 className="text-2xl font-bold">{representative?.name || 'Unknown'}</h1>
        <p className="text-gray-600">
          {representative?.party} • {representative?.state} • {representative?.chamber}
        </p>
        <p className="text-sm text-gray-500">BioGuide ID: {bioguideId}</p>
      </div>

      {/* Simple tab navigation - no complex imports */}
      <div className="bg-white border-2 border-black mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'voting', label: 'Voting Record' },
              { id: 'bills', label: 'Legislation' },
              { id: 'finance', label: 'Campaign Finance' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Simple tab content with minimal imports */}
      <div className="bg-white border-2 border-black p-6">
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Name:</strong> {representative?.name || 'N/A'}
              </div>
              <div>
                <strong>Party:</strong> {representative?.party || 'N/A'}
              </div>
              <div>
                <strong>State:</strong> {representative?.state || 'N/A'}
              </div>
              <div>
                <strong>Chamber:</strong> {representative?.chamber || 'N/A'}
              </div>
              <div>
                <strong>District:</strong> {representative?.district || 'N/A'}
              </div>
              <div>
                <strong>Committees:</strong> {representative?.committees?.length || 0}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'voting' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Voting Records</h2>
            <div className="bg-white border rounded p-4">
              <p>
                <strong>BioGuide ID:</strong> {bioguideId}
              </p>
              <p>
                <strong>Votes Available:</strong>{' '}
                {Array.isArray(initialData?.votes) ? initialData.votes.length : 0}
              </p>
              <p>
                <strong>Data Type:</strong> {typeof initialData?.votes}
              </p>
              {Array.isArray(initialData?.votes) && initialData.votes.length > 0 ? (
                <div className="mt-4">
                  <p className="font-semibold">Sample Vote:</p>
                  <pre className="text-xs bg-white border-2 border-gray-300 p-2 rounded mt-2">
                    {JSON.stringify(initialData.votes[0], null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">No voting records available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sponsored Legislation</h2>
            <div className="bg-white border rounded p-4">
              <p>
                <strong>Bills Count:</strong>{' '}
                {Array.isArray(initialData?.bills) ? initialData.bills.length : 0}
              </p>
              <p>
                <strong>Data Type:</strong> {typeof initialData?.bills}
              </p>
              {Array.isArray(initialData?.bills) && initialData.bills.length > 0 ? (
                <div className="mt-4">
                  <p className="font-semibold">Sample Bill:</p>
                  <div className="bg-white border rounded p-3 mt-2">
                    <p>
                      <strong>Title:</strong> {initialData.bills[0]?.title || 'No title'}
                    </p>
                    <p>
                      <strong>Number:</strong> {initialData.bills[0]?.number || 'No number'}
                    </p>
                    <p>
                      <strong>Congress:</strong> {initialData.bills[0]?.congress || 'No congress'}
                    </p>
                    <p>
                      <strong>Date:</strong> {initialData.bills[0]?.introducedDate || 'No date'}
                    </p>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">
                      View Raw Data
                    </summary>
                    <pre className="text-xs bg-white border-2 border-gray-300 p-2 rounded mt-2">
                      {JSON.stringify(initialData.bills[0], null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">No bills available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Campaign Finance</h2>
            <div className="bg-white border rounded p-4">
              <p>
                <strong>Finance Data Available:</strong> {initialData?.finance ? 'Yes' : 'No'}
              </p>
              <p>
                <strong>Data Type:</strong> {typeof initialData?.finance}
              </p>
              {initialData?.finance && typeof initialData.finance === 'object' ? (
                <div className="mt-4">
                  <p className="font-semibold">Finance Data Keys:</p>
                  <ul className="list-disc list-inside mt-2">
                    {Object.keys(initialData.finance).map(key => {
                      const financeData = initialData.finance;
                      const value = financeData?.[key];
                      return (
                        <li key={key} className="text-sm">
                          <strong>{key}:</strong>{' '}
                          {Array.isArray(value) ? `${value.length} items` : typeof value}
                        </li>
                      );
                    })}
                  </ul>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600">
                      View Raw Data
                    </summary>
                    <pre className="text-xs bg-white border-2 border-gray-300 p-2 rounded mt-2 max-h-40 overflow-auto">
                      {JSON.stringify(initialData.finance, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">No finance data available</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug info */}
      <div className="mt-8 bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Debug Information</h3>
        <div className="text-sm space-y-1">
          <p>
            <strong>Component Mounted:</strong> {mounted ? '✅ Yes' : '❌ No'}
          </p>
          <p>
            <strong>Active Tab:</strong> {activeTab}
          </p>
          <p>
            <strong>Timestamp:</strong> {new Date().toISOString()}
          </p>
          <p>
            <strong>Window Available:</strong> {typeof window !== 'undefined' ? '✅ Yes' : '❌ No'}
          </p>
        </div>
      </div>
    </div>
  );
}
