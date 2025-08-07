/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RepresentativeData {
  member?: {
    bioguideId: string;
    name: string;
    firstName?: string;
    lastName?: string;
    partyName?: string;
    state?: string;
    district?: string;
    chamber?: string;
    title?: string;
    phone?: string;
    email?: string;
    url?: string;
    depiction?: {
      imageUrl?: string;
    };
  };
  error?: string;
}

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" />
      </svg>
      <span className="ml-2 text-lg font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

export default function SimpleRepresentativePage({ bioguideId }: { bioguideId: string }) {
  const [data, setData] = useState<RepresentativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[CLIENT] Fetching representative:', bioguideId);

        const response = await fetch(`/api/representative/${bioguideId}/simple`);
        const result = await response.json();

        // eslint-disable-next-line no-console
        console.log('[CLIENT] API Response:', response.status, result);

        if (!response.ok) {
          setError(result.error || 'Failed to load representative');
          return;
        }

        setData(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CLIENT] Fetch error:', err);
        setError('Failed to load representative data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bioguideId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <CiviqLogo />
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading representative data...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data?.member) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <CiviqLogo />
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Representative Not Found</h1>
            <p className="text-gray-600 mb-4">{error || 'Could not load representative data'}</p>
            <p className="text-sm text-gray-500">BioGuide ID: {bioguideId}</p>
            <Link
              href="/representatives"
              className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Browse All Representatives
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const member = data.member;
  const displayName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const chamber = member.chamber === 'House of Representatives' ? 'House' : 'Senate';
  const title = member.title || (chamber === 'House' ? 'Representative' : 'Senator');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <CiviqLogo />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="flex items-start space-x-6">
              {member.depiction?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.depiction.imageUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-xl text-gray-600 mt-1">
                  {title} • {member.partyName} • {member.state}
                  {member.district && ` District ${member.district}`}
                </p>
                <p className="text-lg text-gray-500 mt-2">{chamber}</p>

                <div className="mt-4 space-y-2">
                  {member.phone && <p className="text-gray-700">📞 {member.phone}</p>}
                  {member.email && <p className="text-gray-700">✉️ {member.email}</p>}
                  {member.url && (
                    <p className="text-gray-700">
                      🌐{' '}
                      <a
                        href={member.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Official Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-500">
              <strong>Note:</strong> This is a simplified view showing basic information from
              Congress.gov. Additional features like voting records, bills, and news will be added
              soon.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/representatives"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Browse All Representatives
          </Link>
        </div>
      </main>
    </div>
  );
}
