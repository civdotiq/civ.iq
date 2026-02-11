'use client';

import { useState, useCallback } from 'react';
import { getAllDistrictsForZip } from '@/lib/data/zip-district-mapping-119th';
import { US_STATES } from '@/lib/data/us-states';
import type { ZipDistrictMapping } from '@/lib/data/zip-district-mapping-119th';

interface SpendingSearchProps {
  onDistrictSelected: (districtId: string) => void;
  initialDistrict?: string;
}

const STATES_WITH_DISTRICTS = Object.entries(US_STATES)
  .filter(([abbr]) => !['DC', 'AS', 'GU', 'MP', 'PR', 'VI'].includes(abbr))
  .sort(([, a], [, b]) => a.localeCompare(b));

export default function SpendingSearch({
  onDistrictSelected,
  initialDistrict,
}: SpendingSearchProps) {
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState<string | null>(null);
  const [multiDistricts, setMultiDistricts] = useState<ZipDistrictMapping[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [districtNumber, setDistrictNumber] = useState('');

  const handleZipSearch = useCallback(() => {
    setZipError(null);
    setMultiDistricts([]);

    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setZipError('Enter a valid 5-digit ZIP code.');
      return;
    }

    const districts = getAllDistrictsForZip(trimmed);
    if (districts.length === 0) {
      setZipError('No congressional district found for this ZIP code.');
      return;
    }

    if (districts.length === 1) {
      const d = districts[0];
      if (d) {
        onDistrictSelected(`${d.state}-${d.district}`);
      }
    } else {
      setMultiDistricts(districts);
    }
  }, [zip, onDistrictSelected]);

  const handleStateDistrictSearch = useCallback(() => {
    if (!selectedState || !districtNumber) return;
    const padded = districtNumber.padStart(2, '0');
    onDistrictSelected(`${selectedState}-${padded}`);
  }, [selectedState, districtNumber, onDistrictSelected]);

  return (
    <div className="space-y-6">
      {/* ZIP code search */}
      <div>
        <label
          htmlFor="zip-input"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Search by ZIP Code
        </label>
        <div className="flex gap-2">
          <input
            id="zip-input"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={e => {
              setZip(e.target.value.replace(/\D/g, ''));
              setZipError(null);
              setMultiDistricts([]);
            }}
            onKeyDown={e => e.key === 'Enter' && handleZipSearch()}
            placeholder="e.g. 10001"
            className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] px-4 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 w-40 focus:outline-none focus:border-[#3ea2d4]"
          />
          <button
            onClick={handleZipSearch}
            className="bg-[#3ea2d4] text-white border-2 border-black dark:border-[#333333] px-6 py-2 font-semibold hover:bg-[#2d8ab8] transition-colors"
          >
            Search
          </button>
        </div>
        {zipError && <p className="text-sm text-[#e11d07] mt-2">{zipError}</p>}
      </div>

      {/* Multi-district disambiguation */}
      {multiDistricts.length > 1 && (
        <div className="border-2 border-[#3ea2d4] bg-white dark:bg-[#222226] p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            This ZIP code spans multiple districts. Select one:
          </p>
          <div className="flex flex-wrap gap-2">
            {multiDistricts.map(d => (
              <button
                key={`${d.state}-${d.district}`}
                onClick={() => onDistrictSelected(`${d.state}-${d.district}`)}
                className="border-2 border-black dark:border-[#333333] px-4 py-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-[#2a2a2e] transition-colors text-gray-900 dark:text-gray-100"
              >
                {d.state}-{d.district}
                {d.primary && <span className="ml-1 text-xs text-gray-400">(primary)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

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
