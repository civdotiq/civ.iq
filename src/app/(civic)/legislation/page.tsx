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

export default function LegislationPage() {
  const [activeTab, setActiveTab] = useState<'recent' | 'tracked' | 'search'>('recent');
  
  // Mock data for demonstration
  const recentBills = [
    {
      id: 'HR1234',
      title: 'Infrastructure Investment Act',
      summary: 'A bill to provide funding for infrastructure improvements across the United States.',
      status: 'In Committee',
      sponsor: 'Rep. John Smith (D-NY)',
      date: '2025-06-15',
      category: 'Infrastructure'
    },
    {
      id: 'S5678',
      title: 'Climate Action and Innovation Act',
      summary: 'Legislation to address climate change through renewable energy investments and carbon reduction.',
      status: 'Passed House',
      sponsor: 'Sen. Jane Doe (D-CA)',
      date: '2025-06-10',
      category: 'Environment'
    },
    {
      id: 'HR9012',
      title: 'Small Business Relief Act',
      summary: 'Providing tax relief and support programs for small businesses affected by economic challenges.',
      status: 'Introduced',
      sponsor: 'Rep. Mike Johnson (R-TX)',
      date: '2025-06-20',
      category: 'Economy'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Passed': return 'bg-green-100 text-green-800';
      case 'Passed House': return 'bg-blue-100 text-blue-800';
      case 'Passed Senate': return 'bg-blue-100 text-blue-800';
      case 'In Committee': return 'bg-yellow-100 text-yellow-800';
      case 'Introduced': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Infrastructure': return 'bg-orange-100 text-orange-800';
      case 'Environment': return 'bg-green-100 text-green-800';
      case 'Economy': return 'bg-blue-100 text-blue-800';
      case 'Healthcare': return 'bg-red-100 text-red-800';
      case 'Education': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <Link href="/states" className="font-medium hover:text-civiq-blue transition-colors">States</Link>
            <Link href="/local" className="font-medium hover:text-civiq-blue transition-colors">Local</Link>
            <Link href="/legislation" className="font-medium text-civiq-blue transition-colors">Legislation</Link>
            <Link href="/about" className="font-medium hover:text-civiq-blue transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-4 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">Track Legislation</h1>
          
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Follow bills through Congress, from introduction to law. See how your representatives vote on issues that matter to you.
          </p>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'recent'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recent Bills
                </button>
                <button
                  onClick={() => setActiveTab('tracked')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tracked'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Your Tracked Bills
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'search'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Search Bills
                </button>
              </nav>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'recent' && (
            <div className="space-y-6">
              {recentBills.map(bill => (
                <div key={bill.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{bill.id}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(bill.category)}`}>
                          {bill.category}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium mb-2">{bill.title}</h4>
                      <p className="text-gray-600 mb-3">{bill.summary}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Sponsor: {bill.sponsor}</span>
                        <span>•</span>
                        <span>Introduced: {bill.date}</span>
                      </div>
                    </div>
                    <button className="ml-4 px-4 py-2 border border-civiq-blue text-civiq-blue rounded hover:bg-civiq-blue hover:text-white transition-colors">
                      Track Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tracked' && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">Track Bills That Matter to You</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Start tracking bills to receive updates on their progress, committee actions, and how your representatives vote.
              </p>
              <Link 
                href="/"
                className="inline-block bg-civiq-blue text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
              >
                Find Your Representatives First
              </Link>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-semibold mb-6 text-center">Search Legislation</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search by bill number, title, or keyword..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-transparent">
                      <option value="">All Categories</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="environment">Environment</option>
                      <option value="economy">Economy</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                    </select>
                    <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-transparent">
                      <option value="">All Statuses</option>
                      <option value="introduced">Introduced</option>
                      <option value="committee">In Committee</option>
                      <option value="passed-house">Passed House</option>
                      <option value="passed-senate">Passed Senate</option>
                      <option value="enacted">Enacted</option>
                    </select>
                  </div>
                  <button className="w-full bg-civiq-blue text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Search Bills
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* How Bills Become Laws */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">How a Bill Becomes a Law</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <p className="font-medium">Introduction</p>
                <p className="text-sm text-gray-600">Bill is introduced in House or Senate</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <p className="font-medium">Committee</p>
                <p className="text-sm text-gray-600">Reviewed and amended</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <p className="font-medium">Floor Vote</p>
                <p className="text-sm text-gray-600">Debate and vote</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">4</span>
                </div>
                <p className="font-medium">Other Chamber</p>
                <p className="text-sm text-gray-600">Process repeats</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">5</span>
                </div>
                <p className="font-medium">President</p>
                <p className="text-sm text-gray-600">Signs into law</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
