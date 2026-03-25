/**
 * State Delegation View - Shows all federal representatives from a state
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { US_STATES, getStateName, isValidStateCode } from '@/lib/data/us-states';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { DelegationExportButton } from './DelegationExportButton';
import { GovernmentOrganizationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

// ISR: Revalidate daily
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ stateCode: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stateCode } = await params;
  const stateName = getStateName(stateCode.toUpperCase());

  if (!stateName) {
    return { title: 'State Not Found' };
  }

  return {
    title: `${stateName} Congressional Delegation`,
    description: `View all U.S. Senators and Representatives from ${stateName}. Complete federal delegation with contact information and committee assignments.`,
  };
}

// Generate static params for all states
export async function generateStaticParams() {
  return Object.keys(US_STATES).map(stateCode => ({
    stateCode: stateCode.toLowerCase(),
  }));
}

// Representative type for this page
interface DelegationMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  website?: string;
  yearsInOffice?: number;
  nextElection?: string;
}

function getPartyColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat') || p === 'd')
    return 'bg-civiq-blue/10 text-civiq-blue border-civiq-blue';
  if (p.includes('republican') || p === 'r')
    return 'bg-civiq-red/10 text-civiq-red border-civiq-red';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function getPartyBorderColor(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat') || p === 'd') return 'border-l-blue-500';
  if (p.includes('republican') || p === 'r') return 'border-l-red-500';
  return 'border-l-gray-400';
}

// Delegation member card component
function DelegationCard({ member }: { member: DelegationMember }) {
  return (
    <div
      className={`bg-white border-2 border-black hover:border-civiq-blue transition-all duration-200 p-4 border-l-4 ${getPartyBorderColor(member.party)}`}
    >
      <div className="flex items-start gap-4">
        <Link href={`/representative/${member.bioguideId}`}>
          <RepresentativePhoto bioguideId={member.bioguideId} name={member.name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/representative/${member.bioguideId}`} className="group">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-civiq-blue transition-colors">
              {member.name}
            </h3>
          </Link>
          <p className="text-sm text-gray-600">{member.title}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium border ${getPartyColor(member.party)}`}
            >
              {member.party}
            </span>
            {member.chamber === 'Senate' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-civiq-blue/10 text-civiq-blue border border-civiq-blue">
                Senator
              </span>
            )}
            {member.chamber === 'House' && member.district && (
              <Link
                href={`/districts/${member.state}-${member.district}`}
                className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 hover:text-civiq-blue border border-amber-200 hover:border-civiq-blue transition-colors"
              >
                {member.state}-{member.district}
              </Link>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
            {member.yearsInOffice !== undefined && member.yearsInOffice > 0 && (
              <p>{member.yearsInOffice} years in office</p>
            )}
            {member.nextElection && member.nextElection !== '0' && (
              <p>Next election: {member.nextElection}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function StateDelegationPage({ params }: PageProps) {
  const { stateCode } = await params;
  const normalizedCode = stateCode.toUpperCase();

  // Validate state code
  if (!isValidStateCode(normalizedCode)) {
    notFound();
  }

  const stateName = getStateName(normalizedCode);

  // Fetch all representatives and filter by state
  const allRepresentatives = await getAllEnhancedRepresentatives();
  const stateReps = allRepresentatives.filter(rep => rep.state?.toUpperCase() === normalizedCode);

  // Separate senators and house members
  const senators = stateReps.filter(rep => rep.chamber === 'Senate');
  const houseMembers = stateReps
    .filter(rep => rep.chamber === 'House')
    .sort((a, b) => {
      const distA = parseInt(a.district ?? '0') || 0;
      const distB = parseInt(b.district ?? '0') || 0;
      return distA - distB;
    });

  // Calculate party breakdown
  const partyCount = {
    democrat: stateReps.filter(r => r.party?.toLowerCase().includes('democrat')).length,
    republican: stateReps.filter(r => r.party?.toLowerCase().includes('republican')).length,
    other: stateReps.filter(
      r =>
        !r.party?.toLowerCase().includes('democrat') &&
        !r.party?.toLowerCase().includes('republican')
    ).length,
  };

  // Transform data for display and export
  const delegationData: DelegationMember[] = stateReps.map(rep => ({
    bioguideId: rep.bioguideId,
    name: rep.name,
    party: rep.party,
    state: rep.state,
    district: rep.district,
    chamber: rep.chamber as 'House' | 'Senate',
    title: rep.title,
    phone: rep.contact?.dcOffice?.phone ?? rep.phone,
    website: rep.website,
    yearsInOffice: rep.yearsInOffice,
    nextElection: rep.nextElection,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data for SEO */}
      <GovernmentOrganizationSchema
        name={`${stateName} Congressional Delegation`}
        description={`All ${stateReps.length} members of the ${stateName} federal congressional delegation: ${senators.length} Senators and ${houseMembers.length} Representatives in the 119th Congress.`}
        url={`https://civdotiq.org/delegation/${normalizedCode.toLowerCase()}`}
        parentOrganization="United States Congress"
        member={delegationData.map(m => ({
          name: m.name,
          url: `https://civdotiq.org/representative/${m.bioguideId}`,
          role: m.chamber === 'Senate' ? 'Senator' : `Representative, District ${m.district}`,
        }))}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
          {
            name: `${stateName} Delegation`,
            url: `https://civdotiq.org/delegation/${normalizedCode.toLowerCase()}`,
          },
        ]}
      />

      {/* Header */}
      <div className="bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2">›</span>
            <Link href="/states" className="hover:text-civiq-blue">
              States
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-900">{stateName} Delegation</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{stateName}</h1>
              <p className="text-lg text-gray-600 mt-1">Federal Congressional Delegation</p>
            </div>

            <div className="flex items-center gap-4">
              <DelegationExportButton
                data={delegationData}
                stateCode={normalizedCode}
                stateName={stateName ?? ''}
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 border-2 border-black p-4 text-center">
              <div className="text-3xl font-bold">{stateReps.length}</div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                Total Members
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-black p-4 text-center">
              <div className="text-3xl font-bold">{senators.length}</div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                Senators
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-black p-4 text-center">
              <div className="text-3xl font-bold">{houseMembers.length}</div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                Representatives
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-black p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {partyCount.democrat > 0 && (
                  <span className="text-2xl font-bold text-civiq-blue">{partyCount.democrat}D</span>
                )}
                {partyCount.democrat > 0 && partyCount.republican > 0 && (
                  <span className="text-gray-400">-</span>
                )}
                {partyCount.republican > 0 && (
                  <span className="text-2xl font-bold text-civiq-red">
                    {partyCount.republican}R
                  </span>
                )}
                {partyCount.other > 0 && (
                  <span className="text-2xl font-bold text-gray-600">+{partyCount.other}</span>
                )}
              </div>
              <div className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                Party Split
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stateReps.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-black">
            <p className="text-gray-600">No federal representatives found for {stateName}.</p>
            <p className="text-sm text-gray-500 mt-2">
              This may indicate a data loading issue. Please try refreshing the page.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Senators Section */}
            {senators.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-civiq-blue"></span>
                  U.S. Senators
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {senators.map(senator => (
                    <DelegationCard
                      key={senator.bioguideId}
                      member={{
                        bioguideId: senator.bioguideId,
                        name: senator.name,
                        party: senator.party,
                        state: senator.state,
                        chamber: 'Senate',
                        title: senator.title,
                        phone: senator.contact?.dcOffice?.phone ?? senator.phone,
                        website: senator.website,
                        yearsInOffice: senator.yearsInOffice,
                        nextElection: senator.nextElection,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* House Members Section */}
            {houseMembers.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-amber-500"></span>
                  U.S. Representatives ({houseMembers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {houseMembers.map(rep => (
                    <DelegationCard
                      key={rep.bioguideId}
                      member={{
                        bioguideId: rep.bioguideId,
                        name: rep.name,
                        party: rep.party,
                        state: rep.state,
                        district: rep.district,
                        chamber: 'House',
                        title: rep.title,
                        phone: rep.contact?.dcOffice?.phone ?? rep.phone,
                        website: rep.website,
                        yearsInOffice: rep.yearsInOffice,
                        nextElection: rep.nextElection,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Related Links */}
            <section className="bg-white border-2 border-black p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Related Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href={`/state-legislature/${normalizedCode.toLowerCase()}`}
                  className="flex items-center gap-2 text-civiq-blue hover:underline"
                >
                  <span>→</span>
                  <span>{stateName} State Legislature</span>
                </Link>
                <Link
                  href={`/state-bills/${normalizedCode.toLowerCase()}`}
                  className="flex items-center gap-2 text-civiq-blue hover:underline"
                >
                  <span>→</span>
                  <span>{stateName} State Bills</span>
                </Link>
                <Link
                  href="/representatives"
                  className="flex items-center gap-2 text-civiq-blue hover:underline"
                >
                  <span>→</span>
                  <span>All Federal Representatives</span>
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
