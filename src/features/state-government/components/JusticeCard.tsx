/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Scale, ExternalLink, Calendar, Briefcase, GraduationCap } from 'lucide-react';
import type { StateSupremeCourtJustice } from '@/types/state-judiciary';

interface JusticeCardProps {
  justice: StateSupremeCourtJustice;
  isChief?: boolean;
}

export const JusticeCard: React.FC<JusticeCardProps> = ({ justice, isChief = false }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className={`bg-white border-2 border-black p-6 ${isChief ? 'accent-bar-blue' : ''}`}>
      {/* Header with Photo and Name */}
      <div className="flex items-start gap-4 mb-4">
        {/* Photo */}
        <div className="flex-shrink-0">
          {!imageError && justice.photoUrl ? (
            <Image
              src={justice.photoUrl}
              alt={justice.name}
              width={80}
              height={80}
              className="w-20 h-20 object-cover border-2 border-gray-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
              <Scale className="w-10 h-10 text-gray-400" />
            </div>
          )}
        </div>

        {/* Name and Title */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{justice.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{justice.position}</p>

          {/* Chief Justice Badge */}
          {isChief && (
            <span className="inline-block px-3 py-1 text-xs font-bold bg-blue-50 text-blue-800 border-2 border-blue-600">
              CHIEF JUSTICE
            </span>
          )}
        </div>
      </div>

      {/* Term Information */}
      {(justice.termStart || justice.termEnd) && (
        <div className="bg-gray-50 border-2 border-gray-300 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-civiq-blue" />
            <span className="font-medium">Term:</span>
            <span>
              {justice.termStart && new Date(justice.termStart).getFullYear()}
              {justice.termEnd && ` - ${new Date(justice.termEnd).getFullYear()}`}
              {!justice.termEnd && ' - Present'}
            </span>
          </div>
        </div>
      )}

      {/* Appointed By */}
      {justice.appointedBy && (
        <div className="mb-3">
          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-civiq-green flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-gray-700">Appointed by: </span>
              <span className="text-gray-600">{justice.appointedBy}</span>
            </div>
          </div>
        </div>
      )}

      {/* Selection Method */}
      {justice.selectionMethod && (
        <div className="mb-3">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Selection: </span>
            <span className="text-gray-600">
              {justice.selectionMethod
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </span>
          </div>
        </div>
      )}

      {/* Education */}
      {justice.education && justice.education.length > 0 && (
        <div className="pt-4 border-t-2 border-gray-200 mb-3">
          <div className="flex items-start gap-2 text-sm mb-2">
            <GraduationCap className="w-4 h-4 text-civiq-blue flex-shrink-0 mt-0.5" />
            <span className="font-semibold text-gray-700">Education</span>
          </div>
          <ul className="space-y-1 ml-6">
            {justice.education.map((edu, index) => (
              <li key={index} className="text-xs text-gray-600">
                {edu}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Previous Positions */}
      {justice.previousPositions && justice.previousPositions.length > 0 && (
        <div className="pt-4 border-t-2 border-gray-200 mb-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Previous Positions</h4>
          <ul className="space-y-1">
            {justice.previousPositions.slice(0, 3).map((position, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-civiq-blue">•</span>
                <span>{position}</span>
              </li>
            ))}
            {justice.previousPositions.length > 3 && (
              <li className="text-xs text-gray-500 ml-4">
                +{justice.previousPositions.length - 3} more positions
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Links */}
      {(justice.wikipediaUrl || justice.courtWebsite) && (
        <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-gray-200">
          {justice.wikipediaUrl && (
            <a
              href={justice.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-black text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Wikipedia
            </a>
          )}
          {justice.courtWebsite && (
            <a
              href={justice.courtWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-gray-300 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Court Website
            </a>
          )}
        </div>
      )}
    </div>
  );
};
