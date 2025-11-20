/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import {
  Calendar,
  MapPin,
  Award,
  Users,
  Clock,
  ExternalLink,
  Briefcase,
  Home,
  Heart,
} from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface ProfileOverviewProps {
  representative: EnhancedRepresentative;
  className?: string;
}

interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function InfoCard({ title, icon, children, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-white border border-gray-200 border-2 border-black ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface TimelineItemProps {
  date: string;
  title: string;
  description?: string;
  type?: 'term' | 'leadership' | 'committee' | 'other';
}

function TimelineItem({ date, title, description, type = 'other' }: TimelineItemProps) {
  const typeColors = {
    term: 'bg-blue-100 text-blue-800',
    leadership: 'bg-blue-100 text-blue-800',
    committee: 'bg-green-100 text-green-800',
    other: 'bg-white border-2 border-gray-300 text-gray-800',
  };

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex-shrink-0 w-2 h-2 bg-civiq-blue border-2 border-black mt-2"></div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <span
            className={`px-2 py-1 text-xs font-medium border-2 border-black ${typeColors[type]}`}
          >
            {type}
          </span>
        </div>
        <div className="text-sm text-gray-600 mb-1">{date}</div>
        {description && <div className="text-sm text-gray-700">{description}</div>}
      </div>
    </div>
  );
}

export function ProfileOverview({ representative, className = '' }: ProfileOverviewProps) {
  // Get biographical information
  const getBirthInfo = () => {
    if (!representative.bio?.birthday) return null;
    const birthDate = new Date(representative.bio.birthday);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return {
      date: birthDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      age,
    };
  };

  const birthInfo = getBirthInfo();

  // Get years of service
  const getYearsOfService = () => {
    if (!representative.terms || representative.terms.length === 0) return 0;
    const firstTerm = representative.terms[0];
    if (!firstTerm || !firstTerm.startYear) return 0;
    return new Date().getFullYear() - parseInt(firstTerm.startYear);
  };

  const yearsOfService = getYearsOfService();

  // Create timeline from terms and leadership roles
  const createTimeline = () => {
    const timeline: TimelineItemProps[] = [];

    // Add terms
    if (representative.terms) {
      representative.terms.forEach(term => {
        timeline.push({
          date: `${term.startYear} - ${term.endYear}`,
          title: `${representative.chamber} Term`,
          description: `Congress ${term.congress}`,
          type: 'term',
        });
      });
    }

    // Add leadership roles
    if (representative.leadershipRoles) {
      representative.leadershipRoles.forEach(role => {
        timeline.push({
          date: `${role.start}${role.end ? ` - ${role.end}` : ' - Present'}`,
          title: role.title,
          type: 'leadership',
        });
      });
    }

    // Sort by start date (most recent first)
    return timeline.sort((a, b) => {
      const dateAStr = a.date.split(' - ')[0];
      const dateBStr = b.date.split(' - ')[0];
      if (!dateAStr || !dateBStr) return 0;
      const dateA = new Date(dateAStr);
      const dateB = new Date(dateBStr);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const timeline = createTimeline();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Facts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gray-200 border-2 border-black">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Years in Office</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{yearsOfService}</div>
          <div className="text-xs text-gray-500">
            Since {representative.terms?.[0]?.startYear || 'N/A'}
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-200 border-2 border-black">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Committees</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {representative.committees?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Current assignments</div>
        </div>

        {birthInfo && (
          <div className="bg-white p-4 border border-gray-200 border-2 border-black">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Age</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{birthInfo.age}</div>
            <div className="text-xs text-gray-500">Born {birthInfo.date}</div>
          </div>
        )}

        <div className="bg-white p-4 border border-gray-200 border-2 border-black">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Represents</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {representative.state}
            {representative.district && representative.district !== 'AL'
              ? `-${representative.district}`
              : ''}
          </div>
          <div className="text-xs text-gray-500">
            {representative.chamber === 'House' ? 'House District' : 'U.S. Senate'}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <InfoCard title="Personal Information" icon={<Home className="w-5 h-5" />}>
          <div className="space-y-3">
            {representative.fullName && (
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <div className="text-gray-900">
                  {representative.fullName.first}{' '}
                  {representative.fullName.middle && `${representative.fullName.middle} `}
                  {representative.fullName.last}
                  {representative.fullName.suffix && `, ${representative.fullName.suffix}`}
                </div>
                {representative.fullName.nickname && (
                  <div className="text-sm text-gray-600">
                    Known as: {representative.fullName.nickname}
                  </div>
                )}
              </div>
            )}

            {representative.bio?.gender && (
              <div>
                <label className="text-sm font-medium text-gray-600">Gender</label>
                <div className="text-gray-900">
                  {representative.bio.gender === 'M' ? 'Male' : 'Female'}
                </div>
              </div>
            )}

            {representative.bio?.religion && (
              <div>
                <label className="text-sm font-medium text-gray-600">Religion</label>
                <div className="text-gray-900">{representative.bio.religion}</div>
              </div>
            )}

            {representative.currentTerm?.stateRank && representative.chamber === 'Senate' && (
              <div>
                <label className="text-sm font-medium text-gray-600">Senate Rank</label>
                <div className="text-gray-900 capitalize">
                  {representative.currentTerm.stateRank} Senator
                </div>
              </div>
            )}
          </div>
        </InfoCard>

        {/* Current Term Information */}
        <InfoCard title="Current Term" icon={<Briefcase className="w-5 h-5" />}>
          <div className="space-y-3">
            {representative.currentTerm?.start && representative.currentTerm?.end && (
              <div>
                <label className="text-sm font-medium text-gray-600">Term</label>
                <div className="text-gray-900">
                  {new Date(representative.currentTerm.start).getFullYear()} -{' '}
                  {new Date(representative.currentTerm.end).getFullYear()}
                </div>
              </div>
            )}

            {representative.currentTerm?.office && (
              <div>
                <label className="text-sm font-medium text-gray-600">Office</label>
                <div className="text-gray-900">{representative.currentTerm.office}</div>
              </div>
            )}

            {representative.chamber === 'Senate' && representative.currentTerm?.class && (
              <div>
                <label className="text-sm font-medium text-gray-600">Senate Class</label>
                <div className="text-gray-900">Class {representative.currentTerm.class}</div>
              </div>
            )}

            {representative.currentTerm?.website && (
              <div>
                <label className="text-sm font-medium text-gray-600">Official Website</label>
                <div>
                  <a
                    href={representative.currentTerm.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    Visit Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </InfoCard>

        {/* Committee Memberships */}
        {representative.committees && representative.committees.length > 0 && (
          <InfoCard title="Committee Memberships" icon={<Users className="w-5 h-5" />}>
            <div className="space-y-3">
              {representative.committees.map((committee, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-white">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{committee.name}</div>
                    {committee.role && (
                      <div className="text-sm text-blue-600 font-medium">{committee.role}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Service Timeline */}
        {timeline.length > 0 && (
          <InfoCard title="Service Timeline" icon={<Award className="w-5 h-5" />}>
            <div className="space-y-3">
              {timeline.slice(0, 6).map((item, index) => (
                <TimelineItem key={index} {...item} />
              ))}
              {timeline.length > 6 && (
                <div className="text-sm text-gray-500 text-center pt-2">
                  And {timeline.length - 6} more entries...
                </div>
              )}
            </div>
          </InfoCard>
        )}
      </div>

      {/* Social Media Links */}
      {representative.socialMedia && (
        <InfoCard title="Connect Online" icon={<Heart className="w-5 h-5" />}>
          <div className="flex flex-wrap gap-3">
            {representative.socialMedia.twitter && (
              <a
                href={`https://twitter.com/${representative.socialMedia.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <span>Twitter</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {representative.socialMedia.facebook && (
              <a
                href={`https://facebook.com/${representative.socialMedia.facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {representative.socialMedia.youtube && (
              <a
                href={`https://youtube.com/${representative.socialMedia.youtube}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {representative.socialMedia.instagram && (
              <a
                href={`https://instagram.com/${representative.socialMedia.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
              >
                <span>Instagram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoCard>
      )}
    </div>
  );
}
