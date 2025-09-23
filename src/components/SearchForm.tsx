'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from '@/components/icons/AicherIcons';
import { quickMultiDistrictCheck } from '@/lib/multi-district/detection';

export default function SearchForm() {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [multiDistrictWarning, setMultiDistrictWarning] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || isLoading) return;

    setIsLoading(true);
    setMultiDistrictWarning(false);

    const cleanInput = searchInput.trim();

    if (/^\d{5}(-\d{4})?$/.test(cleanInput)) {
      const zipCode = cleanInput.split('-')[0];

      // Quick pre-check for known multi-district ZIPs
      if (zipCode) {
        const isLikelyMultiDistrict = quickMultiDistrictCheck(zipCode);
        if (isLikelyMultiDistrict) {
          setMultiDistrictWarning(true);
        }
      }

      router.push(`/representatives?zip=${zipCode}`);
    } else {
      router.push(`/representatives?query=${encodeURIComponent(cleanInput)}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Enter your ZIP code or address..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="block w-full pl-grid-5 pr-grid-12 py-grid-2 text-lg border-aicher border-gray-300 focus:outline-none focus:border-civiq-blue"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!searchInput.trim() || isLoading}
            className="absolute inset-y-0 right-0 flex items-center px-grid-3 text-white bg-civiq-blue hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors aicher-heading"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>
      {multiDistrictWarning && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <div className="flex items-start">
            <svg
              className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium">Multi-District ZIP Code Detected</p>
              <p className="mt-1">
                This ZIP code may span multiple congressional districts. You&apos;ll be prompted to
                provide your street address for precise representative identification.
              </p>
            </div>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Try: &ldquo;48221&rdquo;, &ldquo;1600 Pennsylvania Avenue&rdquo;, or &ldquo;Detroit,
        MI&rdquo;
      </p>
    </div>
  );
}
