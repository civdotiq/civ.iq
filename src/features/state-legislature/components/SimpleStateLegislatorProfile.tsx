/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { getChamberName } from '@/types/state-legislature';
import { StateVotingTab } from './StateVotingTab';
import { StateDistrictDemographics } from './StateDistrictDemographics';
import { StateLegislatorBillsList } from './StateLegislatorBillsList';
import { SimpleNewsSection } from '@/features/news/components/SimpleNewsSection';
import { FileText, Users, Award, MapPin, Phone, Mail, ExternalLink, Newspaper } from 'lucide-react';

interface SimpleStateLegislatorProfileProps {
  legislator: EnhancedStateLegislator;
  fromAddress?: string;
}

export const SimpleStateLegislatorProfile: React.FC<SimpleStateLegislatorProfileProps> = ({
  legislator,
  fromAddress,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [imageError, setImageError] = useState(false);

  const chamberName = getChamberName(legislator.state, legislator.chamber);

  // Get display name
  const getDisplayName = () => {
    return legislator.name;
  };

  // Get full title with state
  const getFullTitle = () => {
    const stateName = legislator.state || legislator.state.toUpperCase();
    if (legislator.chamber === 'upper') {
      return `State Senator from ${stateName}`;
    }
    return `State Representative, ${stateName} District ${legislator.district}`;
  };

  // Extract home phone from extras if available
  const getHomePhone = (): string | undefined => {
    if (legislator.extras && typeof legislator.extras === 'object') {
      const homePhone = (legislator.extras as Record<string, unknown>)['Home Address Home Phone'];
      return typeof homePhone === 'string' ? homePhone : undefined;
    }
    return undefined;
  };

  // Extract counties represented from extras
  const getCountiesRepresented = (): string | undefined => {
    if (legislator.extras && typeof legislator.extras === 'object') {
      const counties = (legislator.extras as Record<string, unknown>)['counties represented'];
      return typeof counties === 'string' ? counties : undefined;
    }
    return undefined;
  };

  // Get accent bar color based on party
  const getAccentBarClass = () => {
    if (legislator.party === 'Republican') return 'accent-bar-red';
    if (legislator.party === 'Democratic') return 'accent-bar-blue';
    return 'accent-bar-green';
  };

  // Get party badge color
  const getPartyBadgeClass = () => {
    if (legislator.party === 'Republican') {
      return 'bg-red-50 text-red-800 border-civiq-red';
    }
    if (legislator.party === 'Democratic') {
      return 'bg-blue-50 text-blue-800 border-civiq-blue';
    }
    return 'bg-gray-50 text-gray-800 border-black';
  };

  // Stats for the header
  const stats = {
    billsSponsored: legislator.legislation?.sponsored || 0,
    billsCosponsored: legislator.legislation?.cosponsored || 0,
    committees: legislator.committees?.length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Header with Stats - matching federal design */}
      <div className={`bg-white border-2 border-black relative ${getAccentBarClass()} mb-6`}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Top Section: Photo and Name */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-4 sm:gap-6 md:gap-8 mb-6">
            {/* Photo - Compact square frame */}
            <div className="flex-shrink-0 justify-self-center md:justify-self-start">
              {!imageError && legislator.photo_url ? (
                <Image
                  src={legislator.photo_url}
                  alt={getDisplayName()}
                  width={160}
                  height={160}
                  className="profile-photo-frame w-32 h-32 md:w-40 md:h-40 object-cover"
                  onError={() => setImageError(true)}
                  priority
                />
              ) : (
                <div className="profile-photo-frame bg-gray-100 flex items-center justify-center text-gray-400 w-32 h-32 md:w-40 md:h-40">
                  <svg
                    className="w-12 h-12 md:w-16 md:h-16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name and Title */}
            <div className="text-center md:text-left">
              <h1 className="profile-hero-name mb-2">{getDisplayName()}</h1>

              <p className="profile-hero-title mb-4">{getFullTitle()}</p>

              {/* Geometric badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span
                  className={`aicher-heading text-xs sm:text-sm font-bold border-2 px-3 py-2 ${getPartyBadgeClass()}`}
                >
                  {legislator.party}
                </span>
                <span className="aicher-heading text-xs sm:text-sm font-bold bg-white text-gray-800 border-2 border-black px-3 py-2">
                  DISTRICT {legislator.district}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Section - Integrated into Hero */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Bills Sponsored */}
              <div className="bg-gray-50 border-2 border-gray-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-civiq-blue" />
                  <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                    Bills Sponsored
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.billsSponsored}</div>
                <div className="text-xs text-gray-500 mt-1">Current session</div>
              </div>

              {/* Bills Co-sponsored */}
              <div className="bg-gray-50 border-2 border-gray-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-civiq-green" />
                  <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                    Co-sponsored
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.billsCosponsored}</div>
                <div className="text-xs text-gray-500 mt-1">Current session</div>
              </div>

              {/* Committees */}
              <div className="bg-gray-50 border-2 border-gray-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-civiq-blue" />
                  <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                    Committees
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.committees}</div>
                <div className="text-xs text-gray-500 mt-1">Current</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - matching federal design */}
      <div className="aicher-tabs mb-6">
        <nav className="flex">
          {[
            { id: 'overview', label: 'OVERVIEW' },
            { id: 'voting', label: 'VOTING RECORDS' },
            { id: 'bills', label: 'SPONSORED BILLS' },
            { id: 'committees', label: 'COMMITTEES' },
            { id: 'news', label: 'RECENT NEWS' },
            { id: 'contact', label: 'CONTACT' },
          ].map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`aicher-tab ${activeTab === tab.id ? 'active' : ''} ${
                index === 5 ? 'border-r-0' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-civiq-blue" />
                DETAILED INFORMATION
              </h2>

              {legislator.wikipedia?.summary && (
                <div className="mb-6">
                  <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-blue">
                    <span className="w-1 h-4 bg-civiq-blue"></span>
                    Wikipedia Biography
                  </h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-4">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: legislator.wikipedia.htmlSummary || legislator.wikipedia.summary,
                      }}
                    />
                    {legislator.wikipedia.pageUrl && (
                      <a
                        href={legislator.wikipedia.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:underline text-sm"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Read more on Wikipedia
                      </a>
                    )}
                  </div>
                </div>
              )}

              {legislator.bio && (
                <div className="mb-6">
                  <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-red">
                    <span className="w-1 h-4 bg-civiq-red"></span>
                    Biography
                  </h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-4">
                    {legislator.bio.birthday && (
                      <p className="mb-2">
                        <span className="font-bold">Born:</span> {legislator.bio.birthday}
                      </p>
                    )}
                    {legislator.bio.gender && (
                      <p className="mb-2">
                        <span className="font-bold">Gender:</span> {legislator.bio.gender}
                      </p>
                    )}
                    {legislator.bio.occupation && (
                      <p className="mb-2">
                        <span className="font-bold">Occupation:</span> {legislator.bio.occupation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {legislator.terms && legislator.terms.length > 0 && (
                <div>
                  <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-green">
                    <span className="w-1 h-4 bg-civiq-green"></span>
                    State Service History
                  </h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-4">
                    {legislator.terms.map((term, index) => (
                      <div
                        key={index}
                        className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                          <span className="font-bold">
                            {getChamberName(legislator.state, term.chamber)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 ml-4">
                          District {term.district} • {term.startYear}
                          {term.endYear && ` - ${term.endYear}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'voting' && (
            <div className="bg-white border-2 border-black p-6">
              <StateVotingTab
                state={legislator.state}
                legislatorId={legislator.id}
                legislatorName={legislator.name}
              />
            </div>
          )}

          {activeTab === 'bills' && (
            <div className="bg-white border-2 border-black p-6">
              <StateLegislatorBillsList
                state={legislator.state}
                legislatorId={legislator.id}
                legislatorName={legislator.name}
              />
            </div>
          )}

          {activeTab === 'committees' && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-civiq-blue" />
                COMMITTEE MEMBERSHIPS
              </h2>
              {legislator.committees && legislator.committees.length > 0 ? (
                <div className="space-y-3">
                  {legislator.committees.map((committee, index) => (
                    <div key={index} className="bg-gray-50 border-2 border-gray-300 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1 flex-shrink-0">
                            <span className="inline-block w-2 h-2 bg-civiq-blue rounded-full"></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {committee.id ? (
                              <a
                                href={`/state-legislature/${legislator.state}/committee/${committee.id}`}
                                className="font-bold text-gray-900 hover:text-civiq-blue transition-colors"
                              >
                                {committee.name}
                              </a>
                            ) : (
                              <h3 className="font-bold text-gray-900">{committee.name}</h3>
                            )}
                            {committee.role && (
                              <span className="inline-block mt-2 px-2 py-1 bg-white border-2 border-black text-xs font-bold">
                                {committee.role}
                              </span>
                            )}
                          </div>
                        </div>
                        {committee.id && (
                          <a
                            href={`/state-legislature/${legislator.state}/committee/${committee.id}`}
                            className="flex-shrink-0 text-civiq-blue hover:underline text-sm font-semibold"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No committee information available.</p>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="bg-white border-2 border-black">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-civiq-blue" />
                  RECENT NEWS
                </h2>
                <SimpleNewsSection
                  apiEndpoint={`/api/state-legislature/${legislator.state}/legislator/${legislator.id}/news`}
                  representative={
                    {
                      bioguideId: legislator.id,
                      name: legislator.name,
                      firstName: legislator.name.split(' ')[0] || legislator.name,
                      lastName: legislator.name.split(' ').slice(1).join(' ') || legislator.name,
                      state: legislator.state,
                      party: legislator.party,
                      chamber: legislator.chamber === 'upper' ? 'Senate' : 'House',
                      title: '',
                      terms: [],
                    } as unknown as Parameters<typeof SimpleNewsSection>[0]['representative']
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-civiq-blue" />
                CONTACT INFORMATION
              </h2>

              {legislator.contact?.capitolOffice && (
                <div className="mb-6">
                  <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-blue">
                    <MapPin className="w-4 h-4" />
                    Capitol Office
                  </h3>
                  <div className="bg-gray-50 border-2 border-gray-300 p-4">
                    {legislator.contact.capitolOffice.address && (
                      <p className="mb-2">{legislator.contact.capitolOffice.address}</p>
                    )}
                    {legislator.contact.capitolOffice.phone && (
                      <p className="mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-civiq-green" />
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
                  <div className="mb-6">
                    <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-green">
                      <MapPin className="w-4 h-4" />
                      District Offices
                    </h3>
                    <div className="space-y-3">
                      {legislator.contact.districtOffices.map((office, index) => (
                        <div key={index} className="bg-gray-50 border-2 border-gray-300 p-4">
                          <p className="mb-2">{office.address}</p>
                          {office.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-civiq-green" />
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
                  <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-red">
                    <ExternalLink className="w-4 h-4" />
                    Online
                  </h3>
                  <div className="space-y-2">
                    {legislator.links.map((link, index) => (
                      <p key={index}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* District Info */}
          <div className="bg-white border-2 border-black p-4">
            <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-blue">
              <MapPin className="w-4 h-4" />
              DISTRICT
            </h3>
            <Link
              href={
                fromAddress
                  ? `/state-districts/${legislator.state.toLowerCase()}/${legislator.chamber === 'upper' ? 'upper' : 'lower'}/${legislator.district}?address=${encodeURIComponent(fromAddress)}`
                  : `/state-districts/${legislator.state.toLowerCase()}/${legislator.chamber === 'upper' ? 'upper' : 'lower'}/${legislator.district}`
              }
              className="block bg-gray-50 border-2 border-gray-300 p-3 hover:bg-gray-100 hover:border-civiq-blue transition-colors cursor-pointer"
            >
              <div className="font-bold text-lg mb-1">
                {legislator.state} - District {legislator.district}
              </div>
              <div className="text-sm text-gray-600">{chamberName}</div>
              {getCountiesRepresented() && (
                <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-300">
                  <span className="font-semibold">Counties:</span> {getCountiesRepresented()}
                </div>
              )}
            </Link>
          </div>

          {/* District Demographics */}
          <StateDistrictDemographics legislator={legislator} />

          {/* Contact Info Quick Access */}
          {(legislator.email || legislator.phone || getHomePhone()) && (
            <div className="bg-white border-2 border-black p-4">
              <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-green">
                <Phone className="w-4 h-4" />
                CONTACT INFORMATION
              </h3>
              <div className="space-y-2">
                {legislator.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-civiq-blue mt-1 flex-shrink-0" />
                    <a
                      href={`mailto:${legislator.email}`}
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      {legislator.email}
                    </a>
                  </div>
                )}
                {legislator.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-civiq-green flex-shrink-0" />
                    <a
                      href={`tel:${legislator.phone}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {legislator.phone}
                    </a>
                  </div>
                )}
                {getHomePhone() && !legislator.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-civiq-green flex-shrink-0" />
                    <a
                      href={`tel:${getHomePhone()}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {getHomePhone()}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border-2 border-black p-4">
            <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-red">
              <ExternalLink className="w-4 h-4" />
              QUICK ACTIONS
            </h3>
            <div className="space-y-2">
              {legislator.links && legislator.links.length > 0 && legislator.links[0] && (
                <a
                  href={legislator.links[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full aicher-button aicher-button-primary text-center"
                >
                  VISIT WEBSITE
                </a>
              )}
              {legislator.email && (
                <a
                  href={`mailto:${legislator.email}`}
                  className="block w-full aicher-button text-center"
                >
                  SEND EMAIL
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
