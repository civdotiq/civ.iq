'use client';

import { useState, useEffect } from 'react';

interface TabsSimpleProps {
  bioguideId: string;
  representative: {
    name: string;
    chamber: string;
    party: string;
    state: string;
  };
}

export function TabsSimple({ bioguideId, representative }: TabsSimpleProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        let url = '';

        switch (activeTab) {
          case 'profile':
            // Just show the representative data we already have
            setData(representative);
            setLoading(false);
            return;
          case 'bills':
            url = `/api/representative/${bioguideId}/bills`;
            break;
          case 'votes':
            url = `/api/representative/${bioguideId}/votes`;
            break;
          case 'finance':
            url = `/api/representative/${bioguideId}/finance`;
            break;
          case 'news':
            url = `/api/representative/${bioguideId}/news`;
            break;
          default:
            setData({ message: 'Select a tab' });
            setLoading(false);
            return;
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, bioguideId, representative]);

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'bills', label: 'Bills' },
    { id: 'votes', label: 'Votes' },
    { id: 'finance', label: 'Finance' },
    { id: 'news', label: 'News' },
  ];

  return (
    <div className="space-y-4">
      {/* Simple Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">
          Tab: {activeTab} | BioguideId: {bioguideId}
        </h3>

        {loading && <div className="text-gray-500">Loading {activeTab} data...</div>}

        {error && (
          <div className="text-red-500">
            Error loading {activeTab}: {error}
          </div>
        )}

        {data !== null && !loading && !error && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Raw data from API:</p>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
