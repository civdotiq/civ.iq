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

interface StateData {
  name: string;
  code: string;
  senators: number;
  representatives: number;
  population: string;
  capital: string;
}

export default function StatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const statesData: StateData[] = [
    { name: 'Alabama', code: 'AL', senators: 2, representatives: 7, population: '5.0M', capital: 'Montgomery' },
    { name: 'Alaska', code: 'AK', senators: 2, representatives: 1, population: '0.7M', capital: 'Juneau' },
    { name: 'Arizona', code: 'AZ', senators: 2, representatives: 9, population: '7.3M', capital: 'Phoenix' },
    { name: 'Arkansas', code: 'AR', senators: 2, representatives: 4, population: '3.0M', capital: 'Little Rock' },
    { name: 'California', code: 'CA', senators: 2, representatives: 52, population: '39.5M', capital: 'Sacramento' },
    { name: 'Colorado', code: 'CO', senators: 2, representatives: 8, population: '5.8M', capital: 'Denver' },
    { name: 'Connecticut', code: 'CT', senators: 2, representatives: 5, population: '3.6M', capital: 'Hartford' },
    { name: 'Delaware', code: 'DE', senators: 2, representatives: 1, population: '1.0M', capital: 'Dover' },
    { name: 'Florida', code: 'FL', senators: 2, representatives: 28, population: '21.5M', capital: 'Tallahassee' },
    { name: 'Georgia', code: 'GA', senators: 2, representatives: 14, population: '10.7M', capital: 'Atlanta' },
    { name: 'Hawaii', code: 'HI', senators: 2, representatives: 2, population: '1.5M', capital: 'Honolulu' },
    { name: 'Idaho', code: 'ID', senators: 2, representatives: 2, population: '1.8M', capital: 'Boise' },
    { name: 'Illinois', code: 'IL', senators: 2, representatives: 17, population: '12.7M', capital: 'Springfield' },
    { name: 'Indiana', code: 'IN', senators: 2, representatives: 9, population: '6.8M', capital: 'Indianapolis' },
    { name: 'Iowa', code: 'IA', senators: 2, representatives: 4, population: '3.2M', capital: 'Des Moines' },
    { name: 'Kansas', code: 'KS', senators: 2, representatives: 4, population: '2.9M', capital: 'Topeka' },
    { name: 'Kentucky', code: 'KY', senators: 2, representatives: 6, population: '4.5M', capital: 'Frankfort' },
    { name: 'Louisiana', code: 'LA', senators: 2, representatives: 6, population: '4.7M', capital: 'Baton Rouge' },
    { name: 'Maine', code: 'ME', senators: 2, representatives: 2, population: '1.4M', capital: 'Augusta' },
    { name: 'Maryland', code: 'MD', senators: 2, representatives: 8, population: '6.2M', capital: 'Annapolis' },
    { name: 'Massachusetts', code: 'MA', senators: 2, representatives: 9, population: '7.0M', capital: 'Boston' },
    { name: 'Michigan', code: 'MI', senators: 2, representatives: 13, population: '10.1M', capital: 'Lansing' },
    { name: 'Minnesota', code: 'MN', senators: 2, representatives: 8, population: '5.7M', capital: 'St. Paul' },
    { name: 'Mississippi', code: 'MS', senators: 2, representatives: 4, population: '3.0M', capital: 'Jackson' },
    { name: 'Missouri', code: 'MO', senators: 2, representatives: 8, population: '6.2M', capital: 'Jefferson City' },
    { name: 'Montana', code: 'MT', senators: 2, representatives: 2, population: '1.1M', capital: 'Helena' },
    { name: 'Nebraska', code: 'NE', senators: 2, representatives: 3, population: '2.0M', capital: 'Lincoln' },
    { name: 'Nevada', code: 'NV', senators: 2, representatives: 4, population: '3.1M', capital: 'Carson City' },
    { name: 'New Hampshire', code: 'NH', senators: 2, representatives: 2, population: '1.4M', capital: 'Concord' },
    { name: 'New Jersey', code: 'NJ', senators: 2, representatives: 12, population: '9.3M', capital: 'Trenton' },
    { name: 'New Mexico', code: 'NM', senators: 2, representatives: 3, population: '2.1M', capital: 'Santa Fe' },
    { name: 'New York', code: 'NY', senators: 2, representatives: 26, population: '20.2M', capital: 'Albany' },
    { name: 'North Carolina', code: 'NC', senators: 2, representatives: 14, population: '10.4M', capital: 'Raleigh' },
    { name: 'North Dakota', code: 'ND', senators: 2, representatives: 1, population: '0.8M', capital: 'Bismarck' },
    { name: 'Ohio', code: 'OH', senators: 2, representatives: 15, population: '11.8M', capital: 'Columbus' },
    { name: 'Oklahoma', code: 'OK', senators: 2, representatives: 5, population: '4.0M', capital: 'Oklahoma City' },
    { name: 'Oregon', code: 'OR', senators: 2, representatives: 6, population: '4.2M', capital: 'Salem' },
    { name: 'Pennsylvania', code: 'PA', senators: 2, representatives: 17, population: '13.0M', capital: 'Harrisburg' },
    { name: 'Rhode Island', code: 'RI', senators: 2, representatives: 2, population: '1.1M', capital: 'Providence' },
    { name: 'South Carolina', code: 'SC', senators: 2, representatives: 7, population: '5.1M', capital: 'Columbia' },
    { name: 'South Dakota', code: 'SD', senators: 2, representatives: 1, population: '0.9M', capital: 'Pierre' },
    { name: 'Tennessee', code: 'TN', senators: 2, representatives: 9, population: '6.9M', capital: 'Nashville' },
    { name: 'Texas', code: 'TX', senators: 2, representatives: 38, population: '29.1M', capital: 'Austin' },
    { name: 'Utah', code: 'UT', senators: 2, representatives: 4, population: '3.3M', capital: 'Salt Lake City' },
    { name: 'Vermont', code: 'VT', senators: 2, representatives: 1, population: '0.6M', capital: 'Montpelier' },
    { name: 'Virginia', code: 'VA', senators: 2, representatives: 11, population: '8.6M', capital: 'Richmond' },
    { name: 'Washington', code: 'WA', senators: 2, representatives: 10, population: '7.7M', capital: 'Olympia' },
    { name: 'West Virginia', code: 'WV', senators: 2, representatives: 2, population: '1.8M', capital: 'Charleston' },
    { name: 'Wisconsin', code: 'WI', senators: 2, representatives: 8, population: '5.9M', capital: 'Madison' },
    { name: 'Wyoming', code: 'WY', senators: 2, representatives: 1, population: '0.6M', capital: 'Cheyenne' }
  ];

  const filteredStates = statesData.filter(state => 
    state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Link href="/districts" className="font-medium hover:text-civiq-blue transition-colors">Districts</Link>
            <Link href="/states" className="font-medium text-civiq-blue transition-colors">States</Link>
            <Link href="/local" className="font-medium hover:text-civiq-blue transition-colors">Local</Link>
            <Link href="/legislation" className="font-medium hover:text-civiq-blue transition-colors">Legislation</Link>
            <Link href="/about" className="font-medium hover:text-civiq-blue transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-4 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">U.S. States & Territories</h1>
          
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Explore representation across all 50 states. Each state has 2 senators and a varying number of representatives based on population.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-12">
            <input
              type="text"
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
            />
          </div>

          {/* States Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStates.map(state => (
              <div key={state.code} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{state.name}</h3>
                    <p className="text-gray-500">{state.code}</p>
                  </div>
                  <span className="text-3xl font-bold text-civiq-blue">
                    {state.senators + state.representatives}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Senators:</span>
                    <span className="font-medium">{state.senators}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Representatives:</span>
                    <span className="font-medium">{state.representatives}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Population:</span>
                    <span className="font-medium">{state.population}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Capital:</span>
                    <span className="font-medium">{state.capital}</span>
                  </div>
                </div>
                
                <Link 
                  href={`/results?state=${state.code}`}
                  className="block w-full text-center bg-civiq-blue text-white py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  View Representatives
                </Link>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">U.S. Congress Composition</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-civiq-red">100</p>
                <p className="text-gray-600">U.S. Senators</p>
                <p className="text-sm text-gray-500 mt-2">2 per state</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-civiq-green">435</p>
                <p className="text-gray-600">U.S. Representatives</p>
                <p className="text-sm text-gray-500 mt-2">Based on population</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-civiq-blue">535</p>
                <p className="text-gray-600">Total Members</p>
                <p className="text-sm text-gray-500 mt-2">In Congress</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
