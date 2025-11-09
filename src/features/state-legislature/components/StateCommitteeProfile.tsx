/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users, UserCheck, Award, ExternalLink, Building2 } from 'lucide-react';
import type { StateCommittee } from '@/types/state-legislature';
import { getChamberName } from '@/types/state-legislature';
import { encodeBase64Url } from '@/lib/url-encoding';

interface StateCommitteeProfileProps {
  committee: StateCommittee;
  state: string;
}

/**
 * Full profile component for displaying state committee details
 * Includes complete membership roster with roles and party affiliations
 */
export const StateCommitteeProfile: React.FC<StateCommitteeProfileProps> = ({
  committee,
  state,
}) => {
  const chamberName = getChamberName(state, committee.chamber);

  // Separate members by role
  const leadership = committee.members?.filter(
    m => m.role === 'Chair' || m.role === 'Vice Chair' || m.role === 'Ranking Member'
  );
  const regularMembers = committee.members?.filter(m => m.role === 'Member');

  // Get party badge styling
  const getPartyBadgeClass = (party?: string) => {
    if (party === 'Democratic') {
      return 'bg-blue-50 text-blue-800 border-blue-300';
    }
    if (party === 'Republican') {
      return 'bg-red-50 text-red-800 border-red-300';
    }
    if (party === 'Independent') {
      return 'bg-purple-50 text-purple-800 border-purple-300';
    }
    return 'bg-gray-50 text-gray-800 border-gray-300';
  };

  // Get role icon and color
  const getRoleIcon = (role: string) => {
    if (role === 'Chair') return <UserCheck className="w-5 h-5 text-civiq-blue" />;
    if (role === 'Vice Chair') return <UserCheck className="w-5 h-5 text-civiq-green" />;
    if (role === 'Ranking Member') return <Award className="w-5 h-5 text-civiq-red" />;
    return <Users className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border-2 border-black mb-6">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-civiq-blue/10 border-2 border-civiq-blue flex items-center justify-center">
                <Building2 className="w-8 h-8 text-civiq-blue" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{committee.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="aicher-heading text-sm font-bold bg-gray-100 border-2 border-black px-3 py-1.5">
                  {state.toUpperCase()} {chamberName}
                </span>
                {committee.classification && (
                  <span className="text-sm text-gray-600 capitalize">
                    {committee.classification} Committee
                  </span>
                )}
                <span className="text-gray-400">•</span>
                <span className="text-sm font-semibold text-gray-700">
                  {committee.members?.length || 0} Members
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leadership Section */}
      {leadership && leadership.length > 0 && (
        <div className="bg-white border-2 border-black mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-civiq-blue" />
              LEADERSHIP
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadership.map((member, index) => (
                <div key={index} className="bg-gray-50 border-2 border-gray-300 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getRoleIcon(member.role)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                        {member.role}
                      </div>
                      {member.legislator_id ? (
                        <Link
                          href={`/state-legislature/${state}/legislator/${encodeBase64Url(member.legislator_id)}`}
                          className="font-bold text-gray-900 hover:text-civiq-blue transition-colors"
                        >
                          {member.legislator_name}
                        </Link>
                      ) : (
                        <div className="font-bold text-gray-900">{member.legislator_name}</div>
                      )}
                      {member.party && (
                        <div className="mt-2">
                          <span
                            className={`inline-block text-xs font-bold px-2 py-1 border rounded ${getPartyBadgeClass(member.party)}`}
                          >
                            {member.party}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Members Section */}
      {regularMembers && regularMembers.length > 0 && (
        <div className="bg-white border-2 border-black mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-civiq-green" />
              COMMITTEE MEMBERS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {regularMembers.map((member, index) => (
                <div key={index} className="bg-gray-50 border border-gray-300 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {member.legislator_id ? (
                        <Link
                          href={`/state-legislature/${state}/legislator/${encodeBase64Url(member.legislator_id)}`}
                          className="font-semibold text-gray-900 hover:text-civiq-blue transition-colors truncate block"
                        >
                          {member.legislator_name}
                        </Link>
                      ) : (
                        <div className="font-semibold text-gray-900 truncate">
                          {member.legislator_name}
                        </div>
                      )}
                    </div>
                    {member.party && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 border rounded flex-shrink-0 ${getPartyBadgeClass(member.party)}`}
                      >
                        {member.party.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Committee Info */}
      <div className="bg-white border-2 border-black mb-6">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-civiq-red" />
            COMMITTEE INFORMATION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Chamber</h3>
              <p className="text-gray-900">{chamberName}</p>
            </div>
            {committee.classification && (
              <div>
                <h3 className="font-bold text-gray-700 mb-2">Type</h3>
                <p className="text-gray-900 capitalize">{committee.classification} Committee</p>
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Total Members</h3>
              <p className="text-gray-900 font-semibold">{committee.members?.length || 0}</p>
            </div>
            {committee.website && (
              <div>
                <h3 className="font-bold text-gray-700 mb-2">Official Website</h3>
                <a
                  href={committee.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:underline flex items-center gap-1"
                >
                  Visit Website
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sources */}
      {committee.sources && committee.sources.length > 0 && (
        <div className="bg-white border-2 border-black">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-gray-600" />
              DATA SOURCES
            </h2>
            <div className="space-y-2">
              {committee.sources.map((source, index) => (
                <div key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline text-sm flex items-center gap-1"
                  >
                    {source.note || 'Official Source'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
