/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, GraduationCap, Briefcase } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { getBiographyFromWikidata } from '@/lib/api/wikidata';
import { getBiographyFromWikipedia } from '@/lib/api/wikipedia';

interface BiographyCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

interface LegislativeStats {
  billsSponsored?: number;
  committeesCount?: number;
  yearsInOffice?: number;
}

interface BillData {
  title: string;
  date?: string;
  type?: string;
}

interface VoteData {
  position?: string;
}

interface BatchData {
  bills?: {
    totalCareer?: number;
    currentCongress?: {
      count: number;
      congress: number;
    };
    recentBills?: BillData[];
  };
  votes?: {
    votes?: VoteData[];
  };
  finance?: unknown;
}

interface Term {
  startYear?: string;
  endYear?: string;
  congress?: string;
}

function calculateYearsInOffice(terms?: Term[]): number {
  if (!terms || terms.length === 0) return 0;

  const earliestYear = Math.min(...terms.map(t => parseInt(t.startYear || '9999')));
  const currentYear = new Date().getFullYear();

  if (earliestYear === 9999) return 0;
  return currentYear - earliestYear;
}

export function BiographyCard({ representative, className = '' }: BiographyCardProps) {
  const [biographyData, setBiographyData] = useState(representative.biography || null);
  const [isLoading, setIsLoading] = useState(false);
  const [legislativeStats, setLegislativeStats] = useState<LegislativeStats>({});
  const [batchData, setBatchData] = useState<BatchData | null>(null);

  useEffect(() => {
    const fetchBiography = async () => {
      setIsLoading(true);
      try {
        // Fetch biographical and legislative data in parallel
        const [wikidataData, wikipediaData, batchResponse] = await Promise.all([
          biographyData
            ? Promise.resolve(null)
            : getBiographyFromWikidata(representative.bioguideId),
          biographyData
            ? Promise.resolve(null)
            : getBiographyFromWikipedia(
                representative.bioguideId,
                representative.name || `${representative.firstName} ${representative.lastName}`
              ),
          fetch(`/api/representative/${representative.bioguideId}/batch`)
            .then(r => r.json())
            .catch(() => null),
        ]);

        // Process batch data for legislative stats
        if (batchResponse?.success && batchResponse?.data) {
          setBatchData(batchResponse.data);
          const stats: LegislativeStats = {
            billsSponsored: batchResponse.data.bills?.totalCareer || 0,
            committeesCount: representative.committees?.length || 0,
            yearsInOffice: calculateYearsInOffice(representative.terms as Term[]),
          };
          setLegislativeStats(stats);
        }

        // Only update biography if we got new data
        if (wikidataData || wikipediaData) {
          const combinedBiography = {
            birthPlace: wikidataData?.birthPlace || biographyData?.birthPlace,
            education: wikidataData?.education || biographyData?.education,
            occupations: wikidataData?.occupations || biographyData?.occupations,
            spouse: wikidataData?.spouse || biographyData?.spouse,
            children: wikidataData?.children || biographyData?.children,
            awards: wikidataData?.awards || biographyData?.awards,
            wikidataDescription: wikidataData?.description || biographyData?.wikidataDescription,
            wikipediaSummary: wikipediaData?.summary || biographyData?.wikipediaSummary,
            wikipediaHtmlSummary: wikipediaData?.htmlSummary || biographyData?.wikipediaHtmlSummary,
            wikipediaImageUrl: wikipediaData?.imageUrl || biographyData?.wikipediaImageUrl,
            wikipediaPageUrl: wikipediaData?.pageUrl || biographyData?.wikipediaPageUrl,
            lastUpdated: new Date().toISOString(),
          };
          setBiographyData(combinedBiography);
        }
      } catch {
        setBiographyData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBiography();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    representative.bioguideId,
    representative.name,
    representative.firstName,
    representative.lastName,
  ]);

  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}
      >
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 rounded-lg">
              <BookOpen className="w-5 h-5" style={{ color: '#e21f0a' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
              Biography
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Generate a meaningful bio summary
  const generateBioSummary = () => {
    const parts = [];

    // Add professional background if not generic
    const meaningfulOccupations = biographyData?.occupations?.filter(
      occ => !['politician', 'legislator', 'senator', 'representative'].includes(occ.toLowerCase())
    );

    if (meaningfulOccupations && meaningfulOccupations.length > 0) {
      const occupation = meaningfulOccupations[0];
      parts.push(`Former ${occupation}`);
    }

    // Add birthplace for context
    if (biographyData?.birthPlace && !biographyData.birthPlace.includes('United States')) {
      parts.push(`born in ${biographyData.birthPlace}`);
    }

    // Add education highlight
    if (biographyData?.education && biographyData.education.length > 0) {
      const topSchool = biographyData.education[0];
      if (topSchool && (topSchool.includes('University') || topSchool.includes('College'))) {
        parts.push(`educated at ${topSchool}`);
      }
    }

    // Add years of service for context
    if (legislativeStats.yearsInOffice && legislativeStats.yearsInOffice > 0) {
      parts.push(`serving ${representative.state} for ${legislativeStats.yearsInOffice} years`);
    }

    // Focus areas from recent bills
    const focusAreas = new Set<string>();
    batchData?.bills?.recentBills?.forEach(bill => {
      const title = bill.title.toLowerCase();
      if (title.includes('social security')) focusAreas.add('Social Security');
      else if (title.includes('health') || title.includes('medicare')) focusAreas.add('Healthcare');
      else if (title.includes('climate') || title.includes('environment'))
        focusAreas.add('Environment');
      else if (title.includes('education')) focusAreas.add('Education');
      else if (title.includes('defense') || title.includes('military')) focusAreas.add('Defense');
      else if (title.includes('tax')) focusAreas.add('Tax Reform');
      else if (title.includes('immigration')) focusAreas.add('Immigration');
      else if (title.includes('infrastructure')) focusAreas.add('Infrastructure');
    });

    if (focusAreas.size > 0) {
      const areas = Array.from(focusAreas).slice(0, 3).join(', ');
      parts.push(`focused on ${areas}`);
    }

    return parts.length > 0 ? parts.join(', ') : null;
  };

  const bioSummary = generateBioSummary();
  const hasBiographicalData =
    biographyData?.wikipediaSummary || bioSummary || biographyData?.education?.length;

  if (!hasBiographicalData && !batchData) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 rounded-lg">
            <BookOpen className="w-5 h-5" style={{ color: '#e21f0a' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
            Biography
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Concise Bio Summary */}
        {bioSummary && (
          <div className="text-lg text-gray-800 font-medium leading-relaxed">
            {representative.name} is a {bioSummary}.
          </div>
        )}

        {/* Key Legislative Priorities */}
        {batchData?.bills?.recentBills && batchData.bills.recentBills.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Current Legislative Priorities
            </h4>
            <div className="space-y-2">
              {batchData.bills.recentBills.slice(0, 3).map((bill, idx) => {
                // Extract key theme from bill title
                const title = bill.title;
                let summary = title;

                // Simplify common legislative language
                summary = summary.replace(/A bill to amend/gi, 'Amending');
                summary = summary.replace(/A bill to/gi, '');
                summary = summary.replace(/A joint resolution/gi, 'Resolution:');
                summary = summary.replace(/and for other purposes/gi, '');
                summary = summary.replace(/Act of \d{4}/gi, 'Act');

                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-sm mt-0.5">•</span>
                    <span className="text-sm text-gray-700 leading-snug">{summary.trim()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wikipedia Summary - if available but shortened */}
        {biographyData?.wikipediaSummary && !bioSummary && (
          <div className="group">
            <div className="text-gray-700 leading-relaxed">
              {biographyData.wikipediaSummary.split('.').slice(0, 2).join('.').trim()}.
            </div>
            {biographyData.wikipediaPageUrl && (
              <div className="mt-3">
                <a
                  href={biographyData.wikipediaPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  Full biography on Wikipedia
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Background & Education - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {biographyData?.education && biographyData.education.length > 0 && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <GraduationCap className="w-3 h-3 inline mr-1" />
                Education
              </label>
              <div className="mt-1.5 space-y-1">
                {biographyData.education.slice(0, 2).map((school, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    {school}
                  </div>
                ))}
              </div>
            </div>
          )}

          {biographyData?.occupations && biographyData.occupations.length > 0 && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <Briefcase className="w-3 h-3 inline mr-1" />
                Professional Background
              </label>
              <div className="mt-1.5 space-y-1">
                {biographyData.occupations
                  .filter(
                    occ =>
                      !['politician', 'legislator', 'senator', 'representative'].includes(
                        occ.toLowerCase()
                      )
                  )
                  .slice(0, 2)
                  .map((occupation, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {occupation}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Remove all old sections - they're now combined above */}
      </div>
    </div>
  );
}
