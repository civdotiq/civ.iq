'use client';


/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import Link from 'next/link';
import { AdvancedSearch } from '@/components/AdvancedSearch';

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg className="w-10 h-10 transition-transform group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-100"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-200"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-300"/>
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/representatives" className="text-gray-700 hover:text-blue-600 transition-colors">
                Representatives
              </Link>
              <Link href="/districts" className="text-gray-700 hover:text-blue-600 transition-colors">
                Districts
              </Link>
              <Link href="/analytics" className="text-gray-700 hover:text-blue-600 transition-colors">
                Analytics
              </Link>
              <Link href="/compare" className="text-gray-700 hover:text-blue-600 transition-colors">
                Compare
              </Link>
              <Link href="/search" className="text-blue-600 font-medium">
                Advanced Search
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Advanced Representative Search</h1>
          <p className="text-xl text-gray-600">
            Find representatives using multiple criteria including voting patterns, committee membership, campaign finance, and more
          </p>
        </div>

        {/* Search Component */}
        <AdvancedSearch />

        {/* Search Tips */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Search Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Quick Searches:</h4>
              <ul className="space-y-1">
                <li>• Type a representative's name for direct results</li>
                <li>• Use state abbreviations (e.g., "CA", "TX")</li>
                <li>• Search by committee name or policy area</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advanced Filters:</h4>
              <ul className="space-y-1">
                <li>• Filter by years of experience in office</li>
                <li>• Set campaign fundraising ranges</li>
                <li>• Find representatives by voting patterns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Comparison Tools:</h4>
              <ul className="space-y-1">
                <li>• Select multiple representatives to compare</li>
                <li>• Analyze voting records side-by-side</li>
                <li>• Compare campaign finance data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Export & Share:</h4>
              <ul className="space-y-1">
                <li>• Export search results to CSV</li>
                <li>• Save searches for future reference</li>
                <li>• Share search URLs with others</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Searches */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Progressive Democrats',
              'Republican Senators',
              'Healthcare Committee',
              'Climate Champions',
              'Veterans Affairs',
              'Financial Services',
              'New Representatives 2024',
              'High Fundraisers'
            ].map((search, index) => (
              <button
                key={index}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors text-sm"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Search data sourced from Congress.gov, FEC.gov, and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2024 CIV.IQ - Empowering civic engagement through transparency
          </p>
        </div>
      </footer>
    </div>
  );
}