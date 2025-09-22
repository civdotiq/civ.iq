/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { Subcommittee } from '@/types/committee';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

interface SubcommitteeCardProps {
  subcommittee: Subcommittee;
}

export default function SubcommitteeCard({ subcommittee }: SubcommitteeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{subcommittee.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{subcommittee.focus}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              {subcommittee.chair && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">Chair:</span>
                  <Link
                    href={`/representative/${subcommittee.chair.bioguideId}`}
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <RepresentativePhoto
                      bioguideId={subcommittee.chair.bioguideId}
                      name={subcommittee.chair.name}
                      size="xs"
                      className="mr-2"
                    />
                    {subcommittee.chair.name}
                  </Link>
                </div>
              )}
              {subcommittee.rankingMember && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">Ranking:</span>
                  <Link
                    href={`/representative/${subcommittee.rankingMember.bioguideId}`}
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <RepresentativePhoto
                      bioguideId={subcommittee.rankingMember.bioguideId}
                      name={subcommittee.rankingMember.name}
                      size="xs"
                      className="mr-2"
                    />
                    {subcommittee.rankingMember.name}
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center">
            {subcommittee.members.length > 0 && (
              <span className="text-sm text-gray-500 mr-3">
                <Users className="w-4 h-4 inline mr-1" />
                {subcommittee.members.length} members
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && subcommittee.members.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Subcommittee Members</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-4">Member</th>
                    <th className="pb-2 pr-4">Party</th>
                    <th className="pb-2 pr-4">State</th>
                    <th className="pb-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {subcommittee.members.map(member => (
                    <tr key={member.representative.bioguideId} className="border-t border-gray-200">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/representative/${member.representative.bioguideId}`}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <RepresentativePhoto
                            bioguideId={member.representative.bioguideId}
                            name={member.representative.name}
                            size="xs"
                            className="mr-2"
                          />
                          {member.representative.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.representative.party === 'Democrat' ||
                            member.representative.party === 'D'
                              ? 'bg-blue-100 text-blue-800'
                              : member.representative.party === 'Independent'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {member.representative.party}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-900">
                        {member.representative.state}
                        {member.representative.district && `-${member.representative.district}`}
                      </td>
                      <td className="py-3 text-sm text-gray-900">{member.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
