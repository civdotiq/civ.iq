/**
 * Committee biographical information component displaying Wikipedia/Wikidata context
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ExternalLink,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';
import type { CommitteeBiographicalData } from '@/lib/services/wikipedia.service';

interface CommitteeBiographicalInfoProps {
  committeeId: string;
  committeeName: string;
  className?: string;
}

interface WikipediaAPIResponse {
  data: CommitteeBiographicalData | null;
  metadata: {
    committeeId: string;
    committeeName: string;
    chamber: string;
    lastUpdated: string;
    cacheable: boolean;
    sources: string[];
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

export default function CommitteeBiographicalInfo({
  committeeId,
  committeeName: _committeeName,
  className = '',
}: CommitteeBiographicalInfoProps) {
  const [data, setData] = useState<CommitteeBiographicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchWikipediaData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/committee/${committeeId}/wikipedia`);
        const result: WikipediaAPIResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.errors?.[0]?.message || 'Failed to fetch Wikipedia data');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (committeeId) {
      fetchWikipediaData();
    }
  }, [committeeId]);

  // Don't render if loading or no data
  if (loading || !data) {
    return null;
  }

  if (error) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 p-4 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-700">
            Unable to load biographical information: {error}
          </p>
        </div>
      </div>
    );
  }

  const hasSubstantialContent =
    (data.wikipedia?.extract && data.wikipedia.extract.length > 200) ||
    (data.history?.nameChanges && data.history.nameChanges.length > 0) ||
    (data.oversight && data.oversight.length > 0);

  if (!hasSubstantialContent) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Globe className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900">Committee Background</h3>
              <p className="text-sm text-blue-700">
                Historical context and jurisdictional information
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-blue-200 bg-white">
          <div className="p-6 space-y-6">
            {/* Wikipedia Extract */}
            {data.wikipedia?.extract && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-gray-900 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Overview
                  </h4>
                  {data.wikipedia.pageurl && (
                    <a
                      href={data.wikipedia.pageurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      View on Wikipedia
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: data.wikipedia.extract_html || data.wikipedia.extract,
                  }}
                />
              </div>
            )}

            {/* Jurisdiction */}
            {data.jurisdiction && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-900 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Jurisdiction
                </h4>
                <p className="text-gray-700">{data.jurisdiction}</p>
              </div>
            )}

            {/* Historical Information */}
            {data.history && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Historical Context
                </h4>
                <div className="space-y-3">
                  {data.history.establishedDate && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Established:</span>{' '}
                      {data.history.establishedDate}
                    </p>
                  )}

                  {data.history.nameChanges && data.history.nameChanges.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Name Changes:</p>
                      <div className="space-y-1">
                        {data.history.nameChanges.map((change, index) => (
                          <p
                            key={index}
                            className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200"
                          >
                            Previously known as &quot;{change.from}&quot;
                            {change.congress && ` (until ${change.congress})`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.history.previousNames && data.history.previousNames.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Previous Names:</p>
                      <div className="flex flex-wrap gap-2">
                        {data.history.previousNames.map((name, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white border-2 border-gray-300 text-xs text-gray-700 rounded"
                          >
                            {name.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Oversight Agencies */}
            {data.oversight && data.oversight.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-900 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Oversight & Jurisdiction
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.oversight.map((agency, index) => (
                    <div key={index} className="bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm text-gray-900">
                            {agency.agency}
                            {agency.acronym && (
                              <span className="text-gray-500 text-xs ml-1">({agency.acronym})</span>
                            )}
                          </h5>
                          {agency.description && (
                            <p className="text-xs text-gray-600 mt-1">{agency.description}</p>
                          )}
                        </div>
                        {agency.wikipediaUrl && (
                          <a
                            href={agency.wikipediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Entities */}
            {data.relatedEntities && data.relatedEntities.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-gray-900">
                  Related Committees & Departments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.relatedEntities.map((entity, index) => (
                    <div key={index} className="flex items-center">
                      {entity.wikipediaUrl ? (
                        <a
                          href={entity.wikipediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200"
                        >
                          {entity.name}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <span className="px-3 py-1 bg-white border-2 border-gray-300 text-gray-700 text-xs rounded-full">
                          {entity.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Information sourced from:{' '}
                {[data.wikipedia && 'Wikipedia', data.wikidata && 'Wikidata']
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
