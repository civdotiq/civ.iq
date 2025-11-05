/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Shield, Mail, Phone, MapPin, ExternalLink, Calendar } from 'lucide-react';

interface StateExecutive {
  id: string;
  name: string;
  position:
    | 'governor'
    | 'lieutenant_governor'
    | 'attorney_general'
    | 'secretary_of_state'
    | 'treasurer'
    | 'comptroller'
    | 'auditor'
    | 'other';
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  termStart: string;
  termEnd: string;
  isIncumbent: boolean;
  previousOffices?: Array<{
    office: string;
    startYear: number;
    endYear: number;
  }>;
  keyInitiatives?: string[];
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}

interface ExecutiveProfileCardProps {
  official: StateExecutive;
  highlighted?: boolean;
}

export const ExecutiveProfileCard: React.FC<ExecutiveProfileCardProps> = ({
  official,
  highlighted = false,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Format position title
  const formatPosition = (position: string): string => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get party color classes
  const getPartyBadgeClass = () => {
    if (official.party === 'Republican') {
      return 'bg-red-50 text-red-800 border-civiq-red';
    }
    if (official.party === 'Democratic') {
      return 'bg-blue-50 text-blue-800 border-civiq-blue';
    }
    if (official.party === 'Independent') {
      return 'bg-purple-50 text-purple-800 border-purple-600';
    }
    return 'bg-gray-50 text-gray-800 border-gray-400';
  };

  // Get accent bar color
  const getAccentBarClass = () => {
    if (official.party === 'Republican') return 'accent-bar-red';
    if (official.party === 'Democratic') return 'accent-bar-blue';
    return 'accent-bar-green';
  };

  return (
    <div
      className={`bg-white border-2 border-black relative ${getAccentBarClass()} ${
        highlighted ? 'shadow-lg' : ''
      }`}
    >
      <div className="p-6">
        {/* Header with Photo and Name */}
        <div className="flex items-start gap-4 mb-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {!imageError && official.photoUrl ? (
              <Image
                src={official.photoUrl}
                alt={official.name}
                width={96}
                height={96}
                className="w-24 h-24 object-cover border-2 border-gray-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                <Shield className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Name and Title */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{official.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{formatPosition(official.position)}</p>

            {/* Party Badge */}
            <span
              className={`inline-block px-3 py-1 text-xs font-bold border-2 ${getPartyBadgeClass()}`}
            >
              {official.party}
            </span>

            {/* Incumbent Badge */}
            {official.isIncumbent && (
              <span className="ml-2 inline-block px-3 py-1 text-xs font-bold bg-green-50 text-green-800 border-2 border-green-600">
                INCUMBENT
              </span>
            )}
          </div>
        </div>

        {/* Term Information */}
        <div className="bg-gray-50 border-2 border-gray-300 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-civiq-blue" />
            <span className="font-medium">Term:</span>
            <span>
              {new Date(official.termStart).getFullYear()} -{' '}
              {new Date(official.termEnd).getFullYear()}
            </span>
          </div>
        </div>

        {/* Contact Information */}
        {(official.email || official.phone || official.office) && (
          <div className="space-y-2 mb-4">
            {official.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-civiq-blue flex-shrink-0" />
                <a
                  href={`mailto:${official.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {official.email}
                </a>
              </div>
            )}
            {official.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-civiq-green flex-shrink-0" />
                <a href={`tel:${official.phone}`} className="text-blue-600 hover:underline">
                  {official.phone}
                </a>
              </div>
            )}
            {official.office && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-civiq-red flex-shrink-0" />
                <span className="text-gray-700">{official.office}</span>
              </div>
            )}
          </div>
        )}

        {/* Social Media Links */}
        {official.socialMedia && (
          <div className="flex flex-wrap gap-2 mb-4">
            {official.socialMedia.website && (
              <a
                href={official.socialMedia.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-black text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            )}
            {official.socialMedia.twitter && (
              <a
                href={`https://twitter.com/${official.socialMedia.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-gray-300 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Twitter
              </a>
            )}
            {official.socialMedia.facebook && (
              <a
                href={official.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-gray-300 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Facebook
              </a>
            )}
          </div>
        )}

        {/* Previous Offices */}
        {official.previousOffices && official.previousOffices.length > 0 && (
          <div className="pt-4 border-t-2 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Previous Service</h4>
            <div className="space-y-1">
              {official.previousOffices.slice(0, 3).map((office, index) => (
                <div key={index} className="text-xs text-gray-600">
                  <span className="font-medium">{office.office}</span>
                  <span className="mx-1">•</span>
                  <span>
                    {office.startYear}-{office.endYear}
                  </span>
                </div>
              ))}
              {official.previousOffices.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{official.previousOffices.length - 3} more positions
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Initiatives */}
        {official.keyInitiatives && official.keyInitiatives.length > 0 && (
          <div className="pt-4 border-t-2 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Initiatives</h4>
            <ul className="space-y-1">
              {official.keyInitiatives.slice(0, 3).map((initiative, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-civiq-blue">•</span>
                  <span>{initiative}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
