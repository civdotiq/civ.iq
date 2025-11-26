/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { getChamberName } from '@/types/state-legislature';
import { SimpleNewsSection } from '@/features/news/components/SimpleNewsSection';
import {
  FileText,
  Users,
  Award,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Newspaper,
  Crown,
  Vote,
  BarChart3,
  User,
  Calendar,
  Clock,
  Building,
  AlertCircle,
} from 'lucide-react';
import { encodeBase64Url } from '@/lib/url-encoding';
import { TabLoadingSpinner } from '@/lib/utils/code-splitting';

// Dynamically import heavy components to reduce initial bundle
const StateLegislatorBillsList = dynamic(
  () =>
    import('./StateLegislatorBillsList').then(mod => ({ default: mod.StateLegislatorBillsList })),
  { loading: TabLoadingSpinner, ssr: false }
);

const StateLegislatorVotingRecord = dynamic(
  () =>
    import('./StateLegislatorVotingRecord').then(mod => ({
      default: mod.StateLegislatorVotingRecord,
    })),
  { loading: TabLoadingSpinner, ssr: false }
);

// Tab configuration matching federal design
const stateLegislatorTabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <User className="w-4 h-4" />,
    description: 'Personal details and committee memberships',
  },
  {
    id: 'voting',
    label: 'Voting Records',
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'Voting history and positions',
  },
  {
    id: 'legislation',
    label: 'Sponsored Bills',
    icon: <FileText className="w-4 h-4" />,
    description: 'Bills sponsored and co-sponsored',
  },
  {
    id: 'news',
    label: 'Recent News',
    icon: <Newspaper className="w-4 h-4" />,
    description: 'Recent media coverage',
  },
];

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

  // Stats for the header - matching federal 4-stat layout
  const stats = {
    billsSponsored: legislator.legislation?.sponsored || 0,
    billsCosponsored: legislator.legislation?.cosponsored || 0,
    committees: legislator.committees?.length || 0,
    totalVotes: legislator.votingRecord?.totalVotes || 0,
  };

  // Render sidebar content (for overview tab)
  const renderSidebar = () => (
    <div className="space-y-4">
      {/* District Card - Highlighted */}
      <div className="bg-civiq-red text-white p-4">
        <h3 className="aicher-heading-wide text-xs uppercase mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          District
        </h3>
        <Link
          href={
            fromAddress
              ? `/state-districts/${legislator.state.toLowerCase()}/${legislator.chamber === 'upper' ? 'upper' : 'lower'}/${legislator.district}?address=${encodeURIComponent(fromAddress)}`
              : `/state-districts/${legislator.state.toLowerCase()}/${legislator.chamber === 'upper' ? 'upper' : 'lower'}/${legislator.district}`
          }
          className="block"
        >
          <div className="font-bold text-lg mb-1">
            {legislator.state}-{legislator.district}
          </div>
          <div className="text-sm opacity-90">{chamberName}</div>
          {getCountiesRepresented() && (
            <div className="text-sm opacity-80 mt-2 pt-2 border-t border-white/30">
              <span className="font-semibold">Counties:</span> {getCountiesRepresented()}
            </div>
          )}
        </Link>
      </div>

      {/* Contact Information */}
      <div className="bg-white aicher-border p-4">
        <h3 className="aicher-heading-wide text-xs text-civiq-red uppercase mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Contact Information
        </h3>
        <div className="space-y-3">
          {legislator.contact?.capitolOffice?.address && (
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <div className="aicher-heading-wide text-xs text-gray-600 mb-1">Capitol Office</div>
                <div className="text-sm text-gray-900">
                  {legislator.contact.capitolOffice.address}
                </div>
              </div>
            </div>
          )}
          {(legislator.phone || legislator.contact?.capitolOffice?.phone) && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <div className="aicher-heading-wide text-xs text-gray-600 mb-1">Phone</div>
                <a
                  href={`tel:${legislator.phone || legislator.contact?.capitolOffice?.phone}`}
                  className="text-sm text-gray-900 hover:text-civiq-blue"
                >
                  {legislator.phone || legislator.contact?.capitolOffice?.phone}
                </a>
              </div>
            </div>
          )}
          {legislator.email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <div className="aicher-heading-wide text-xs text-gray-600 mb-1">Email</div>
                <a
                  href={`mailto:${legislator.email}`}
                  className="text-sm text-gray-900 hover:text-civiq-blue break-all"
                >
                  {legislator.email}
                </a>
              </div>
            </div>
          )}
          {legislator.links && legislator.links[0] && (
            <div className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <div className="aicher-heading-wide text-xs text-gray-600 mb-1">
                  Official Website
                </div>
                <a
                  href={legislator.links[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-civiq-blue hover:underline"
                >
                  Visit Website
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Term */}
      {legislator.terms && legislator.terms.length > 0 && (
        <div className="bg-white aicher-border p-4">
          <h3 className="aicher-heading-wide text-xs text-civiq-red uppercase mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Current Term
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {legislator.terms?.[0]?.startYear}
                {legislator.terms?.[0]?.endYear
                  ? ` - ${legislator.terms[0].endYear}`
                  : ' - Present'}
              </div>
              <div className="text-xs text-gray-600">{chamberName}</div>
            </div>
          </div>
        </div>
      )}

      {/* Legislation Links */}
      <div className="bg-white aicher-border p-4">
        <h3 className="aicher-heading-wide text-xs text-civiq-red uppercase mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Legislation
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => setActiveTab('legislation')}
            className="block w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-civiq-blue">
              Sponsored Bills
            </div>
            <div className="text-xs text-gray-600">
              View all legislation sponsored by this representative
            </div>
          </button>
          <button
            onClick={() => setActiveTab('voting')}
            className="block w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-civiq-blue">
              Voting Record
            </div>
            <div className="text-xs text-gray-600">See how they voted on key legislation</div>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white aicher-border p-4">
        <h3 className="aicher-heading-wide text-xs text-civiq-red uppercase mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Quick Actions
        </h3>
        <div className="space-y-3">
          {legislator.links && legislator.links[0] && (
            <a
              href={legislator.links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="aicher-button-high-emphasis"
            >
              Visit Website
            </a>
          )}
          {legislator.email && (
            <a
              href={`mailto:${legislator.email}`}
              className="block w-full text-center py-3 px-5 text-sm aicher-heading transition-all duration-200 bg-white text-black aicher-border border-black hover:bg-black hover:text-white"
            >
              Send Message
            </a>
          )}
        </div>
      </div>
    </div>
  );

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="flex flex-col gap-8">
            {/* Biography Section */}
            <div>
              <h3
                className="aicher-heading text-lg text-civiq-red mb-4 flex items-center gap-2"
                style={{ marginBottom: 'calc(var(--grid) * 3)' }}
              >
                <span className="aicher-border border-civiq-red bg-civiq-red w-4 h-4"></span>
                Biography
              </h3>
              <div className="bg-gray-50 aicher-border p-4">
                {legislator.wikipedia?.summary ? (
                  <>
                    <div
                      className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: legislator.wikipedia.htmlSummary || legislator.wikipedia.summary,
                      }}
                    />
                    {legislator.wikipedia.pageUrl && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Source: Wikipedia</span>
                        <a
                          href={legislator.wikipedia.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-civiq-blue hover:underline text-sm flex items-center gap-1"
                        >
                          Read full biography <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {legislator.bio && (
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                        {legislator.bio.birthday && (
                          <div>
                            <div className="aicher-heading-wide text-xs text-gray-500 mb-1">
                              Born
                            </div>
                            <div className="text-sm text-gray-900">{legislator.bio.birthday}</div>
                          </div>
                        )}
                        {legislator.bio.occupation && (
                          <div>
                            <div className="aicher-heading-wide text-xs text-gray-500 mb-1">
                              Professional Background
                            </div>
                            <div className="text-sm text-gray-900">{legislator.bio.occupation}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : legislator.bio ? (
                  <div className="grid grid-cols-2 gap-4">
                    {legislator.bio.birthday && (
                      <div>
                        <div className="aicher-heading-wide text-xs text-gray-500 mb-1">Born</div>
                        <div className="text-sm text-gray-900">{legislator.bio.birthday}</div>
                      </div>
                    )}
                    {legislator.bio.gender && (
                      <div>
                        <div className="aicher-heading-wide text-xs text-gray-500 mb-1">Gender</div>
                        <div className="text-sm text-gray-900">{legislator.bio.gender}</div>
                      </div>
                    )}
                    {legislator.bio.occupation && (
                      <div>
                        <div className="aicher-heading-wide text-xs text-gray-500 mb-1">
                          Professional Background
                        </div>
                        <div className="text-sm text-gray-900">{legislator.bio.occupation}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No biographical information available.</p>
                )}
              </div>
            </div>

            {/* Committee Memberships */}
            <div>
              <h3
                className="aicher-heading text-lg text-civiq-red mb-4 flex items-center gap-2"
                style={{ marginBottom: 'calc(var(--grid) * 3)' }}
              >
                <span className="aicher-border border-civiq-red bg-civiq-red w-4 h-4"></span>
                Committee Memberships
              </h3>
              {legislator.committees && legislator.committees.length > 0 ? (
                <div className="space-y-3">
                  {legislator.committees.map((committee, index) => (
                    <div key={index} className="bg-gray-50 aicher-border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {committee.id ? (
                            <Link
                              href={`/state-legislature/${legislator.state}/committee/${encodeBase64Url(committee.id)}`}
                              className="font-bold text-civiq-blue hover:underline"
                            >
                              {committee.name}
                            </Link>
                          ) : (
                            <span className="font-bold text-gray-900">{committee.name}</span>
                          )}
                        </div>
                        {committee.role && (
                          <span
                            className={`px-2 py-1 text-xs font-bold border-2 ${
                              committee.role.toLowerCase().includes('chair') &&
                              !committee.role.toLowerCase().includes('vice')
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-500'
                                : committee.role.toLowerCase().includes('vice')
                                  ? 'bg-blue-50 text-blue-800 border-blue-500'
                                  : committee.role.toLowerCase().includes('ranking')
                                    ? 'bg-green-50 text-green-800 border-civiq-green'
                                    : 'bg-white text-gray-800 border-black'
                            }`}
                          >
                            {committee.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 aicher-border p-4">
                  <p className="text-gray-600 text-sm mb-2">No committee information available.</p>
                  <p className="text-xs text-gray-500">
                    Note: State committee data coverage varies by state. The OpenStates API provides
                    approximately 30-70% committee assignment coverage depending on the state.
                  </p>
                </div>
              )}
            </div>

            {/* State Service History */}
            {legislator.terms && legislator.terms.length > 0 && (
              <div>
                <h3
                  className="aicher-heading text-lg text-civiq-red mb-4 flex items-center gap-2"
                  style={{ marginBottom: 'calc(var(--grid) * 3)' }}
                >
                  <span className="aicher-border border-civiq-red bg-civiq-red w-4 h-4"></span>
                  State Service History
                </h3>
                <div className="bg-gray-50 aicher-border p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Calendar className="w-8 h-8 text-civiq-blue" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {legislator.terms.length}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">Total Terms</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="aicher-heading-wide text-xs text-gray-600 mb-3">
                      Career Timeline
                    </div>
                    {legislator.terms.map((term, index) => (
                      <div key={index} className="flex items-center gap-3 mb-2 last:mb-0">
                        <div className="w-8 h-8 bg-civiq-blue text-white flex items-center justify-center text-xs font-bold">
                          {term.chamber === 'upper' ? 'S' : 'H'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getChamberName(legislator.state, term.chamber)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {term.startYear}
                            {term.endYear ? ` - ${term.endYear}` : ' - Present'} • District{' '}
                            {term.district}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Need Help Section */}
            <div
              className="bg-red-50 aicher-border border-civiq-red"
              style={{ padding: 'calc(var(--grid) * 3)' }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-civiq-red flex-shrink-0 mt-1" />
                <div>
                  <h3
                    className="aicher-heading type-lg text-civiq-red"
                    style={{ marginBottom: 'calc(var(--grid) * 2)' }}
                  >
                    Need Help?
                  </h3>
                  <p className="type-sm text-gray-700 leading-relaxed mb-3">
                    Having trouble reaching your representative? Contact information is updated
                    regularly from official sources.
                  </p>
                  <a
                    href={`https://openstates.org/${legislator.state.toLowerCase()}/legislators/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-civiq-red hover:underline type-sm font-semibold aicher-heading-wide"
                  >
                    Find alternative contact methods →
                  </a>
                </div>
              </div>
            </div>
          </div>
        );

      case 'voting':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <StateLegislatorVotingRecord
              state={legislator.state}
              legislatorId={legislator.id}
              legislatorName={legislator.name}
            />
          </Suspense>
        );

      case 'legislation':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <StateLegislatorBillsList
              state={legislator.state}
              legislatorId={legislator.id}
              legislatorName={legislator.name}
            />
          </Suspense>
        );

      case 'news':
        return (
          <SimpleNewsSection
            apiEndpoint={`/api/state-legislature/${legislator.state}/legislator/${encodeBase64Url(legislator.id)}/news`}
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Hero Header with Stats - matching federal design */}
        <div
          className={`bg-white border-2 border-black relative ${getAccentBarClass()} mb-4 sm:mb-6`}
        >
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

                <p className="profile-hero-title accent-title-underline-blue mb-6">
                  {getFullTitle()}
                </p>

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
                  {/* Leadership positions */}
                  {legislator.leadershipRoles &&
                    legislator.leadershipRoles.length > 0 &&
                    legislator.leadershipRoles.map((role, index) => (
                      <span
                        key={index}
                        className="aicher-heading text-xs sm:text-sm font-bold bg-yellow-50 text-yellow-800 border-2 border-yellow-500 px-3 py-2 flex items-center gap-1"
                      >
                        <Crown className="w-3 h-3" />
                        {role.title}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Stats Section - 4-column grid matching federal design */}
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bills Sponsored */}
                <button
                  onClick={() => setActiveTab('legislation')}
                  className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-blue transition-colors cursor-pointer text-left"
                  type="button"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-civiq-blue" />
                    <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                      Bills Sponsored
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.billsSponsored}</div>
                  <div className="text-xs text-gray-500 mt-1">Current session</div>
                </button>

                {/* Votes Cast */}
                <button
                  onClick={() => setActiveTab('voting')}
                  className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-green transition-colors cursor-pointer text-left"
                  type="button"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Vote className="w-4 h-4 text-civiq-green" />
                    <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                      Votes Cast
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalVotes}</div>
                  <div className="text-xs text-gray-500 mt-1">This term</div>
                </button>

                {/* Co-sponsored */}
                <button
                  onClick={() => setActiveTab('legislation')}
                  className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-red transition-colors cursor-pointer text-left"
                  type="button"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-civiq-red" />
                    <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                      Co-sponsored
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.billsCosponsored}</div>
                  <div className="text-xs text-gray-500 mt-1">Current session</div>
                </button>

                {/* Committees */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-blue transition-colors cursor-pointer text-left"
                  type="button"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-civiq-blue" />
                    <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                      Committees
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.committees}</div>
                  <div className="text-xs text-gray-500 mt-1">Current</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="bg-white aicher-border mb-4 sm:mb-6">
          {/* Tab Navigation - matching federal design with icons */}
          <div className="aicher-tabs">
            <nav className="flex overflow-x-auto scroll-smooth snap-x snap-proximity [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
              {stateLegislatorTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`aicher-tab min-h-[44px] snap-start whitespace-nowrap ${activeTab === tab.id ? 'active' : ''} ${
                    index === stateLegislatorTabs.length - 1 ? 'border-r-0' : ''
                  }`}
                  title={tab.description}
                >
                  <span className="w-4 h-4">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content with 2/3 + 1/3 layout for overview */}
          <div className="p-4 sm:p-6">
            {activeTab === 'overview' ? (
              <div className="flex flex-col gap-8">
                <div>
                  <h2
                    className="aicher-heading type-2xl text-gray-900"
                    style={{ marginBottom: 'calc(var(--grid) * 3)' }}
                  >
                    Detailed Information
                  </h2>
                </div>
                <div
                  className="grid grid-cols-1 md:grid-cols-3"
                  style={{ gap: 'calc(var(--grid) * 4)' }}
                >
                  {/* Main Content (2/3) */}
                  <div className="md:col-span-2">{renderMainContent()}</div>
                  {/* Sidebar (1/3) */}
                  <div className="md:col-span-1 md:sticky md:top-4 md:self-start">
                    {renderSidebar()}
                  </div>
                </div>
              </div>
            ) : (
              <Suspense fallback={<TabLoadingSpinner />}>{renderMainContent()}</Suspense>
            )}
          </div>
        </div>

        {/* Data Sources Attribution - matching federal design */}
        <div className="bg-white aicher-border p-4 sm:p-6">
          <h3 className="aicher-heading type-lg text-gray-900 mb-4 sm:mb-6">Data Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="aicher-border border-civiq-blue bg-civiq-blue w-4 h-4"></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">OpenStates</div>
                <div className="type-xs text-gray-600">Bills, votes, committees</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="aicher-border border-civiq-green bg-civiq-green w-4 h-4"></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">Wikipedia</div>
                <div className="type-xs text-gray-600">Biographical information</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="aicher-border border-civiq-red bg-civiq-red w-4 h-4"></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">State Legislature</div>
                <div className="type-xs text-gray-600">Official contact information</div>
              </div>
            </div>
          </div>
          <p className="type-sm text-gray-500 mt-4 sm:mt-6">
            All data is sourced from official government APIs and repositories. Data is refreshed
            automatically and reflects the most current available information.
          </p>
        </div>
      </div>
    </div>
  );
};
