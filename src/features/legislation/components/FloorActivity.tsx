/**
 * Floor Activity Component - Displays House/Senate floor schedules
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, Play, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';

interface HouseFloorItem {
  id: string;
  legisNum: string;
  title: string;
  category: string;
  documents: Array<{
    url: string;
    type: string;
  }>;
  addDate: string;
  publishDate: string;
}

interface SenateFloorSession {
  conveneTime: string;
  conveneDate: string;
  streamUrl: string | null;
  lastUpdated: string;
  isLive: boolean;
}

interface FloorScheduleResponse {
  success: boolean;
  house: {
    weekOf: string;
    lastUpdated: string;
    items: HouseFloorItem[];
    categories: {
      suspension: HouseFloorItem[];
      rule: HouseFloorItem[];
      other: HouseFloorItem[];
    };
    sourceUrl: string;
  };
  senate: {
    session: SenateFloorSession | null;
    sourceUrl: string;
  };
  liveStreams: {
    house: string;
    senate: string;
    houseYouTube: string;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
  error?: string;
}

export function FloorActivity() {
  const [data, setData] = useState<FloorScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'house' | 'senate'>('house');

  useEffect(() => {
    async function fetchFloorSchedule() {
      try {
        setLoading(true);
        const response = await fetch('/api/floor-schedule');
        if (!response.ok) throw new Error('Failed to fetch floor schedule');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchFloorSchedule();
  }, []);

  if (loading) {
    return (
      <div className="border-2 border-black p-6">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading floor schedule...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-2 border-black p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Unable to load floor schedule</span>
        </div>
      </div>
    );
  }

  const houseItemCount = data.house.items.length;
  const senateIsLive = data.senate.session?.isLive;

  return (
    <div className="border-2 border-black">
      {/* Header */}
      <div className="bg-black text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h2 className="font-bold text-lg">FLOOR ACTIVITY</h2>
          </div>
          <div className="flex gap-2">
            <a
              href={data.liveStreams.house}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-civiq-red text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              <Play className="w-3 h-3" />
              HOUSE LIVE
            </a>
            <a
              href={data.liveStreams.senate}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-civiq-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Play className="w-3 h-3" />
              SENATE LIVE
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-black">
        <button
          onClick={() => setActiveTab('house')}
          className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'house' ? 'bg-gray-100 border-b-4 border-civiq-red' : 'hover:bg-gray-50'
          }`}
        >
          HOUSE ({houseItemCount} bills)
        </button>
        <button
          onClick={() => setActiveTab('senate')}
          className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'senate' ? 'bg-gray-100 border-b-4 border-civiq-blue' : 'hover:bg-gray-50'
          }`}
        >
          SENATE {senateIsLive && <span className="ml-1 text-green-600">● LIVE</span>}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'house' && (
          <div>
            {data.house.weekOf && (
              <p className="text-xs text-gray-600 mb-3">
                Week of {data.house.weekOf} • Last updated: {data.house.lastUpdated}
              </p>
            )}
            {houseItemCount === 0 ? (
              <p className="text-gray-500 text-sm">No bills scheduled for this week.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.house.items.slice(0, 10).map(item => (
                  <div
                    key={item.id}
                    className="border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-civiq-blue">
                            {item.legisNum}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              item.category === 'suspension'
                                ? 'bg-yellow-100 text-yellow-800'
                                : item.category === 'rule'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{item.title}</p>
                      </div>
                      {item.documents.length > 0 && item.documents[0] && (
                        <a
                          href={item.documents[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded"
                          title="View document"
                        >
                          <FileText className="w-4 h-4 text-gray-600" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {houseItemCount > 10 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Showing 10 of {houseItemCount} bills
                  </p>
                )}
              </div>
            )}
            <a
              href={data.house.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-xs text-civiq-blue hover:underline"
            >
              View full schedule on docs.house.gov
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {activeTab === 'senate' && (
          <div>
            {data.senate.session ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {data.senate.session.isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      IN SESSION
                    </span>
                  )}
                  <span className="text-sm text-gray-700">
                    Convenes: {data.senate.session.conveneTime} on{' '}
                    {new Date(data.senate.session.conveneDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {data.senate.session.streamUrl && (
                  <a
                    href={data.senate.session.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-civiq-blue text-white font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Watch Live Stream
                  </a>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No session information available.</p>
            )}
            <a
              href={data.senate.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-xs text-civiq-blue hover:underline"
            >
              View full schedule on senate.gov
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default FloorActivity;
