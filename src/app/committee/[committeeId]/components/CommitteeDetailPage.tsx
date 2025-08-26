/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ExternalLink, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Committee } from '@/types/committee';

interface CommitteeDetailPageProps {
  committee: Committee;
  metadata: {
    dataSource: 'congress.gov' | 'congress-legislators' | 'mock';
    lastUpdated: string;
    memberCount: number;
    subcommitteeCount: number;
    cacheable: boolean;
  };
}

export function CommitteeDetailPage({ committee, metadata }: CommitteeDetailPageProps) {
  const hasRealData = metadata.dataSource !== 'mock' && committee.members.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{committee.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {committee.chamber}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {committee.type} Committee
              </span>
              {committee.id && <span className="text-xs text-gray-500">ID: {committee.id}</span>}
            </div>
            <p className="text-gray-700 mb-4">{committee.jurisdiction}</p>
          </div>
          {committee.url && (
            <a
              href={committee.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Official Page
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leadership */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leadership
            </h2>

            {hasRealData ? (
              <div className="space-y-4">
                {committee.leadership.chair && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Chair</h3>
                    <Link
                      href={`/representative/${committee.leadership.chair.representative.bioguideId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {committee.leadership.chair.representative.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {committee.leadership.chair.representative.party} -{' '}
                      {committee.leadership.chair.representative.state}
                    </p>
                  </div>
                )}

                {committee.leadership.rankingMember && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Ranking Member</h3>
                    <Link
                      href={`/representative/${committee.leadership.rankingMember.representative.bioguideId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {committee.leadership.rankingMember.representative.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {committee.leadership.rankingMember.representative.party} -{' '}
                      {committee.leadership.rankingMember.representative.state}
                    </p>
                  </div>
                )}

                {committee.leadership.vice_chair && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Vice Chair</h3>
                    <Link
                      href={`/representative/${committee.leadership.vice_chair.representative.bioguideId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {committee.leadership.vice_chair.representative.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {committee.leadership.vice_chair.representative.party} -{' '}
                      {committee.leadership.vice_chair.representative.state}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Leadership data loading...</p>
                <p className="text-xs text-gray-400 mt-1">Check back soon for updates</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Committee Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Members</span>
                <span className="font-medium">{committee.members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subcommittees</span>
                <span className="font-medium">{committee.subcommittees.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Source</span>
                <span className="text-xs text-gray-500">{metadata.dataSource}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-xs text-gray-500">
                  {new Date(metadata.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Committee Members ({committee.members.length})
            </h2>

            {hasRealData ? (
              <div className="space-y-4">
                {/* Group members by party */}
                {['Republican', 'Democratic', 'Independent'].map(party => {
                  const partyMembers = committee.members.filter(
                    member => member.representative.party === party
                  );

                  if (partyMembers.length === 0) return null;

                  return (
                    <div key={party}>
                      <h3 className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                        {party} ({partyMembers.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {partyMembers.map((member, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <Link
                                href={`/representative/${member.representative.bioguideId}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                {member.representative.name}
                              </Link>
                              <p className="text-sm text-gray-600">
                                {member.representative.state}
                                {member.representative.district &&
                                  ` - District ${member.representative.district}`}
                              </p>
                            </div>
                            {member.role !== 'Member' && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {member.role}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Committee member data is loading...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Member information will be populated from official Congressional sources
                </p>
              </div>
            )}
          </div>

          {/* Subcommittees */}
          {committee.subcommittees.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Subcommittees ({committee.subcommittees.length})
              </h2>
              <div className="space-y-3">
                {committee.subcommittees.map((subcommittee, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{subcommittee.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{subcommittee.focus}</p>
                    {subcommittee.chair && (
                      <div className="text-sm">
                        <span className="text-gray-500">Chair: </span>
                        <Link
                          href={`/representative/${subcommittee.chair.bioguideId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {subcommittee.chair.name}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Section Placeholder */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Committee activity data coming soon</p>
          <p className="text-sm text-gray-400 mt-2">
            Recent bills, hearings, and committee actions will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
