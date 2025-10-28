/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { getChamberName, getLegislatorTitle } from '@/types/state-legislature';

interface SimpleStateLegislatorProfileProps {
  legislator: EnhancedStateLegislator;
}

export const SimpleStateLegislatorProfile: React.FC<SimpleStateLegislatorProfileProps> = ({
  legislator,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const chamberName = getChamberName(legislator.state, legislator.chamber);
  const title = getLegislatorTitle(legislator.state, legislator.chamber);

  // Get party color
  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Democratic':
        return 'bg-blue-500';
      case 'Republican':
        return 'bg-red-500';
      case 'Independent':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-white border-2 border-gray-300 mb-grid-3 p-grid-3">
        <div className="flex items-start gap-grid-3">
          {/* Photo */}
          {legislator.photo_url ? (
            <Image
              src={legislator.photo_url}
              alt={legislator.name}
              width={128}
              height={128}
              className="w-32 h-32 border-2 border-gray-300 object-cover"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
              <span className="text-4xl text-gray-400">
                {legislator.firstName?.charAt(0) || legislator.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-grid-1">{legislator.name}</h1>
            <div className="flex items-center gap-grid-2 mb-grid-2">
              <span
                className={`px-grid-2 py-grid-1 text-white text-sm ${getPartyColor(legislator.party)}`}
              >
                {legislator.party}
              </span>
              <span className="text-gray-600">
                {title} • {legislator.state} {chamberName}
              </span>
            </div>
            <div className="text-gray-600">
              <p>District {legislator.district}</p>
              {legislator.email && (
                <p className="mt-grid-1">
                  <a href={`mailto:${legislator.email}`} className="text-blue-600 hover:underline">
                    {legislator.email}
                  </a>
                </p>
              )}
              {legislator.phone && (
                <p className="mt-grid-1">
                  <a href={`tel:${legislator.phone}`} className="text-blue-600 hover:underline">
                    {legislator.phone}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-2 border-gray-300 mb-grid-3">
        <div className="flex border-b-2 border-gray-300">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'committees', label: 'Committees' },
            { id: 'bills', label: 'Legislation' },
            { id: 'contact', label: 'Contact' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-grid-3 py-grid-2 border-r-2 border-gray-300 ${
                activeTab === tab.id ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-grid-3">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold mb-grid-3">Overview</h2>

              {legislator.bio && (
                <div className="mb-grid-4">
                  <h3 className="text-xl font-bold mb-grid-2">Biographical Information</h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                    {legislator.bio.birthday && (
                      <p className="mb-grid-1">
                        <span className="font-bold">Born:</span> {legislator.bio.birthday}
                      </p>
                    )}
                    {legislator.bio.gender && (
                      <p className="mb-grid-1">
                        <span className="font-bold">Gender:</span> {legislator.bio.gender}
                      </p>
                    )}
                    {legislator.bio.occupation && (
                      <p className="mb-grid-1">
                        <span className="font-bold">Occupation:</span> {legislator.bio.occupation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {legislator.terms && legislator.terms.length > 0 && (
                <div className="mb-grid-4">
                  <h3 className="text-xl font-bold mb-grid-2">Service History</h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                    {legislator.terms.map((term, index) => (
                      <div key={index} className="mb-grid-2 last:mb-0">
                        <p>
                          <span className="font-bold">
                            {getChamberName(legislator.state, term.chamber)}
                          </span>
                          {' • '}
                          District {term.district}
                          {' • '}
                          {term.startYear}
                          {term.endYear && ` - ${term.endYear}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'committees' && (
            <div>
              <h2 className="text-2xl font-bold mb-grid-3">Committee Memberships</h2>
              {legislator.committees && legislator.committees.length > 0 ? (
                <div className="space-y-grid-2">
                  {legislator.committees.map((committee, index) => (
                    <div key={index} className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                      <h3 className="font-bold">{committee.name}</h3>
                      {committee.role && (
                        <p className="text-sm text-gray-600 mt-grid-1">Role: {committee.role}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No committee information available.</p>
              )}
            </div>
          )}

          {activeTab === 'bills' && (
            <div>
              <h2 className="text-2xl font-bold mb-grid-3">Sponsored Legislation</h2>
              {legislator.legislation ? (
                <div className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                  <div className="grid grid-cols-2 gap-grid-3">
                    <div>
                      <p className="text-3xl font-bold text-blue-600">
                        {legislator.legislation.sponsored}
                      </p>
                      <p className="text-sm text-gray-600">Bills Sponsored</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">
                        {legislator.legislation.cosponsored}
                      </p>
                      <p className="text-sm text-gray-600">Bills Co-sponsored</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">
                  Detailed legislation information will be available soon.
                </p>
              )}
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h2 className="text-2xl font-bold mb-grid-3">Contact Information</h2>

              {legislator.contact?.capitolOffice && (
                <div className="mb-grid-4">
                  <h3 className="text-xl font-bold mb-grid-2">Capitol Office</h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                    {legislator.contact.capitolOffice.address && (
                      <p className="mb-grid-1">{legislator.contact.capitolOffice.address}</p>
                    )}
                    {legislator.contact.capitolOffice.phone && (
                      <p className="mb-grid-1">
                        Phone:{' '}
                        <a
                          href={`tel:${legislator.contact.capitolOffice.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {legislator.contact.capitolOffice.phone}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {legislator.contact?.districtOffices &&
                legislator.contact.districtOffices.length > 0 && (
                  <div className="mb-grid-4">
                    <h3 className="text-xl font-bold mb-grid-2">District Offices</h3>
                    <div className="space-y-grid-2">
                      {legislator.contact.districtOffices.map((office, index) => (
                        <div key={index} className="bg-gray-50 border-2 border-gray-300 p-grid-3">
                          <p className="mb-grid-1">{office.address}</p>
                          {office.phone && (
                            <p>
                              Phone:{' '}
                              <a
                                href={`tel:${office.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {office.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {legislator.links && legislator.links.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-grid-2">Online</h3>
                  <div className="space-y-grid-1">
                    {legislator.links.map((link, index) => (
                      <p key={index}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {link.note || link.url}
                        </a>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {!legislator.email &&
                !legislator.phone &&
                !legislator.contact &&
                !legislator.links && (
                  <p className="text-gray-600">No contact information available.</p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
