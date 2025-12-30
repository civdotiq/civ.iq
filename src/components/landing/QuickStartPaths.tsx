'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRightIcon } from '@/components/icons/AicherIcons';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington, D.C.' },
];

// Example high-profile representatives (can be updated)
const EXAMPLE_REPS = [
  { id: 'J000294', name: 'Hakeem Jeffries', title: 'House Democratic Leader' },
  { id: 'T000278', name: 'John Thune', title: 'Senate Republican Leader' },
  { id: 'S000148', name: 'Chuck Schumer', title: 'Senate Majority Leader' },
];

export default function QuickStartPaths() {
  const [selectedState, setSelectedState] = useState('');

  return (
    <section className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 pt-grid-2 pb-grid-4 sm:pb-grid-6">
      <div className="mb-grid-2 sm:mb-grid-3 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 aicher-heading">QUICK START</h2>
        <p className="text-xs text-gray-600 mt-1">Alternative ways to explore the platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-2 sm:gap-grid-3">
        {/* Browse by State */}
        <div className="aicher-card p-grid-2 sm:p-grid-3 flex flex-col">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 aicher-heading">
            BROWSE BY STATE
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-600 mb-grid-1">
            View state legislature and federal representatives
          </p>
          <div className="flex-grow">
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="w-full border-2 border-black px-3 py-2.5 min-h-[44px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-civiq-blue"
              aria-label="Select a state"
            >
              <option value="">Select a state...</option>
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          {selectedState && (
            <Link
              href={`/state-legislature/${selectedState}`}
              className="mt-grid-1 bg-civiq-blue text-white px-3 py-2.5 min-h-[44px] text-center text-xs font-bold aicher-border aicher-hover flex items-center justify-center gap-1"
            >
              VIEW {selectedState}
              <ArrowRightIcon className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Example Profile */}
        <div className="aicher-card p-grid-2 sm:p-grid-3 flex flex-col">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 aicher-heading">
            EXAMPLE PROFILE
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-600 mb-grid-1">
            See what representative profiles look like
          </p>
          <div className="flex-grow space-y-1">
            {EXAMPLE_REPS.map(rep => (
              <Link
                key={rep.id}
                href={`/representative/${rep.id}`}
                className="block border-2 border-gray-200 px-3 py-2.5 min-h-[44px] aicher-hover text-[10px] sm:text-xs"
              >
                <div className="font-semibold text-gray-900">{rep.name}</div>
                <div className="text-gray-600">{rep.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Explore Data */}
        <div className="aicher-card p-grid-2 sm:p-grid-3 flex flex-col">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 aicher-heading">
            EXPLORE DATA
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-600 mb-grid-1">
            Browse comprehensive datasets
          </p>
          <div className="flex-grow space-y-1">
            <Link
              href="/districts"
              className="block border-2 border-gray-200 px-3 py-2.5 min-h-[44px] aicher-hover"
            >
              <div className="text-xs font-semibold text-gray-900">All Districts</div>
              <div className="text-[10px] text-gray-600">435 congressional districts</div>
            </Link>
            <Link
              href="/states"
              className="block border-2 border-gray-200 px-3 py-2.5 min-h-[44px] aicher-hover"
            >
              <div className="text-xs font-semibold text-gray-900">All States</div>
              <div className="text-[10px] text-gray-600">50 states + territories</div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
