'use client';

import Link from 'next/link';
import { useState } from 'react';

function CiviqLogo({ className = "w-10 h-15" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="100" r="70" fill="#e11d09" />
      <rect x="100" y="200" width="100" height="120" fill="#0a9338" />
      <circle cx="90"  cy="370" r="12" fill="#3ea0d2" />
      <circle cx="130" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="170" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="210" cy="370" r="12" fill="#3ea0d2" />
    </svg>
  );
}

export default function DistrictsPage() {
  const [selectedState, setSelectedState] = useState('');
  
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <CiviqLogo className="w-8 h-12" />
            <span className="text-2xl font-bold tracking-tight">CIV.IQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/representatives" className="font-medium hover:text-civiq-blue transition-colors">Representatives</Link>
            <Link href="/districts" className="font-medium text-civiq-blue transition-colors">Districts</Link>
            <Link href="/states" className="font-medium hover:text-civiq-blue transition-colors">States</Link>
            <Link href="/local" className="font-medium hover:text-civiq-blue transition-colors">Local</Link>
            <Link href="/legislation" className="font-medium hover:text-civiq-blue transition-colors">Legislation</Link>
            <Link href="/about" className="font-medium hover:text-civiq-blue transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">Congressional Districts</h1>
          
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Explore congressional districts across the United States. Each district elects one representative to the U.S. House of Representatives.
          </p>

          {/* State Selector */}
          <div className="max-w-md mx-auto mb-12">
            <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select a State
            </label>
            <select
              id="state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
            >
              <option value="">Choose a state...</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* District Information */}
          {selectedState && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">{selectedState} Congressional Districts</h2>
              <p className="text-gray-600 mb-6">
                {selectedState} has multiple congressional districts. Each district is represented by one member in the U.S. House of Representatives.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Example districts - in real implementation, this would be dynamic */}
                {[1, 2, 3, 4, 5, 6].map(district => (
                  <div key={district} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-lg mb-2">District {district}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Population: ~750,000<br />
                      Major Cities: Example City
                    </p>
                    <Link 
                      href={`/results?state=${selectedState}&district=${district}`}
                      className="text-civiq-blue hover:underline text-sm"
                    >
                      View Representatives →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational Content */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">What are Districts?</h3>
              <p className="text-gray-600">
                Congressional districts are geographic areas within states that elect representatives to the U.S. House. Each district represents approximately 760,000 people.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Redistricting</h3>
              <p className="text-gray-600">
                Districts are redrawn every 10 years after the census to ensure equal representation. This process can significantly impact political representation.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Your District</h3>
              <p className="text-gray-600">
                Not sure which district you're in? Use our ZIP code search on the homepage to find your representatives and district information.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
