'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || isLoading) return;

    setIsLoading(true);

    const cleanInput = searchInput.trim();

    if (/^\d{5}(-\d{4})?$/.test(cleanInput)) {
      const zipCode = cleanInput.split('-')[0];
      router.push(`/representatives?zip=${zipCode}`);
    } else {
      router.push(`/representatives?query=${encodeURIComponent(cleanInput)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="text-4xl font-bold text-civiq-red mb-4">CIV.IQ</div>
            <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl mb-6">
              Know Your Representatives
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your ZIP code or address..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="block w-full pl-10 pr-32 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!searchInput.trim() || isLoading}
                  className="absolute inset-y-0 right-0 flex items-center px-6 text-white bg-civiq-blue hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </form>
            <p className="text-sm text-gray-500 mt-2">
              Try: &ldquo;48221&rdquo;, &ldquo;1600 Pennsylvania Avenue&rdquo;, or &ldquo;Detroit,
              MI&rdquo;
            </p>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-blue rounded-lg flex items-center justify-center mb-4">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Representatives</h3>
              <p className="text-gray-600 text-center">
                Discover your House and Senate representatives with detailed contact information and
                voting records
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-green rounded-lg flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Legislation</h3>
              <p className="text-gray-600 text-center">
                Follow bills, votes, and legislative activity from the current 119th Congress
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-red rounded-lg flex items-center justify-center mb-4">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Statistics</h3>
              <p className="text-gray-600 text-center">
                Analyze campaign finance, voting patterns, and demographic data from official
                sources
              </p>
            </div>
          </div>

          {/* Data Sources */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              Real-time data from Congress.gov, Federal Election Commission, and U.S. Census Bureau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
