'use client';

import { useState, useCallback } from 'react';
import { US_STATES } from '@/lib/data/us-states';
import AddressAutocomplete from '@/components/search/AddressAutocomplete';

interface SpendingSearchProps {
  onDistrictSelected: (districtId: string) => void;
  initialDistrict?: string;
}

interface SearchResult {
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
}

const STATES_WITH_DISTRICTS = Object.entries(US_STATES)
  .filter(([abbr]) => !['DC', 'AS', 'GU', 'MP', 'PR', 'VI'].includes(abbr))
  .sort(([, a], [, b]) => a.localeCompare(b));

export default function SpendingSearch({
  onDistrictSelected,
  initialDistrict,
}: SpendingSearchProps) {
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [districtNumber, setDistrictNumber] = useState('');

  const handleAddressSearch = useCallback(async () => {
    setAddressError(null);

    const trimmed = addressInput.trim();
    if (!trimmed) {
      setAddressError('Enter your home address to find your congressional district.');
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: { results: SearchResult[] } = await response.json();

      // Find the House representative to get the district
      const houseRep = data.results?.find(r => r.chamber === 'House' && r.state && r.district);

      if (houseRep?.state && houseRep.district) {
        onDistrictSelected(`${houseRep.state}-${houseRep.district}`);
        return;
      }

      // If we found any results with state info, use that (at-large districts)
      const anyRep = data.results?.find(r => r.state);
      if (anyRep?.state) {
        onDistrictSelected(`${anyRep.state}-00`);
        return;
      }

      setAddressError(
        'Could not determine congressional district from this address. Try the state and district selector below.'
      );
    } catch {
      setAddressError(
        'Address lookup failed. Please try again or use the state and district selector below.'
      );
    } finally {
      setIsSearching(false);
    }
  }, [addressInput, onDistrictSelected]);

  const handleStateDistrictSearch = useCallback(() => {
    if (!selectedState || !districtNumber) return;
    const padded = districtNumber.padStart(2, '0');
    onDistrictSelected(`${selectedState}-${padded}`);
  }, [selectedState, districtNumber, onDistrictSelected]);

  return (
    <div className="space-y-6">
      {/* Address search */}
      <div>
        <label
          htmlFor="address-input"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Search by Address
        </label>
        <div className="flex gap-2">
          <div className="flex-1 border-2 border-black dark:border-[#333333]">
            <AddressAutocomplete
              onSelect={address => {
                setAddressInput(address);
                setAddressError(null);
              }}
              onChange={value => {
                setAddressInput(value);
                setAddressError(null);
              }}
              placeholder="e.g. 123 Main St, Detroit, MI"
              ariaLabel="Enter your home address to find your congressional district"
            />
          </div>
          <button
            onClick={handleAddressSearch}
            disabled={isSearching || !addressInput.trim()}
            className="bg-[#3ea2d4] text-white border-2 border-black dark:border-[#333333] px-6 py-2 font-semibold hover:bg-[#2d8ab8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {addressError && <p className="text-sm text-amber-600 mt-2">{addressError}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Your address is used only to determine your congressional district and is not stored.
        </p>
      </div>

      {/* State/district dropdown fallback */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Or select by state and district
        </p>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedState}
            onChange={e => {
              setSelectedState(e.target.value);
              setDistrictNumber('');
            }}
            className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#3ea2d4]"
          >
            <option value="">Select state</option>
            {STATES_WITH_DISTRICTS.map(([abbr, name]) => (
              <option key={abbr} value={abbr}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={districtNumber}
            onChange={e => setDistrictNumber(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleStateDistrictSearch()}
            placeholder="District #"
            className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] px-4 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 w-32 focus:outline-none focus:border-[#3ea2d4]"
          />
          <button
            onClick={handleStateDistrictSearch}
            disabled={!selectedState || !districtNumber}
            className="bg-[#3ea2d4] text-white border-2 border-black dark:border-[#333333] px-6 py-2 font-semibold hover:bg-[#2d8ab8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </div>
      </div>

      {initialDistrict && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Currently showing: <span className="font-semibold">{initialDistrict}</span>
        </p>
      )}
    </div>
  );
}
