'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { SearchHistory, SearchHistoryItem } from '@/lib/searchHistory';

function CiviqLogo({ className = "w-10 h-15" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      <circle 
        cx="150" 
        cy="100" 
        r="70" 
        fill="#e11d07" 
        className="transition-all duration-700 hover:scale-105"
      />
      
      <rect 
        x="100" 
        y="200" 
        width="100" 
        height="120" 
        fill="#0a9338"
        className="transition-all duration-700 hover:scale-105"
      />
      
      <circle cx="90" cy="370" r="12" fill="#3ea2d4" className="animate-pulse" style={{animationDelay: '0ms'}} />
      <circle cx="130" cy="370" r="12" fill="#3ea2d4" className="animate-pulse" style={{animationDelay: '200ms'}} />
      <circle cx="170" cy="370" r="12" fill="#3ea2d4" className="animate-pulse" style={{animationDelay: '400ms'}} />
      <circle cx="210" cy="370" r="12" fill="#3ea2d4" className="animate-pulse" style={{animationDelay: '600ms'}} />
    </svg>
  );
}

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchHistory(SearchHistory.getHistory());

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (searchInput.trim() && !isSearching) {
      setIsSearching(true);
      SearchHistory.addSearch(searchInput.trim());
      setSearchHistory(SearchHistory.getHistory());
      setShowHistory(false);
      
      const isZipCode = /^\d{5}$/.test(searchInput.trim());
      if (isZipCode) {
        router.push(`/results?zip=${encodeURIComponent(searchInput.trim())}`);
      } else {
        router.push(`/representatives?search=${encodeURIComponent(searchInput.trim())}`);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowHistory(false);
    }
  };

  const handleInputFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleHistoryItemClick = (historyValue: string) => {
    if (!isSearching) {
      setIsSearching(true);
      setSearchInput(historyValue);
      setShowHistory(false);
      SearchHistory.addSearch(historyValue);
      setSearchHistory(SearchHistory.getHistory());
      
      const isZipCode = /^\d{5}$/.test(historyValue);
      if (isZipCode) {
        router.push(`/results?zip=${encodeURIComponent(historyValue)}`);
      } else {
        router.push(`/representatives?search=${encodeURIComponent(historyValue)}`);
      }
    }
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    SearchHistory.removeSearch(value);
    setSearchHistory(SearchHistory.getHistory());
  };

  const handleClearHistory = () => {
    SearchHistory.clearHistory();
    setSearchHistory([]);
    setShowHistory(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 group">
            <div className="transform transition-all duration-300 group-hover:scale-105">
              <CiviqLogo className="w-8 h-12" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">CIV.IQ</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/representatives" className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full">
              Representatives
            </a>
            <a href="/districts" className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full">
              Districts
            </a>
            <a href="/about" className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full">
              About
            </a>
          </nav>
        </div>
      </header>

      <section className="min-h-screen flex items-center justify-center px-4 pt-16 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="max-w-4xl w-full text-center space-y-10">
          <div className="animate-fade-in-up">
            <CiviqLogo className="w-24 h-36 mx-auto mb-8" />
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight animate-fade-in-up" style={{animationDelay: '200ms'}}>
              Know Your <span className="bg-gradient-to-r from-[#e11d07] via-[#0a9338] to-[#3ea2d4] bg-clip-text text-transparent">Representatives</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up leading-relaxed" style={{animationDelay: '400ms'}}>
              Transparent access to government data. Find who represents you at every level.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto relative animate-fade-in-up" style={{animationDelay: '600ms'}}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#3ea2d4]/20 to-[#0a9338]/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <div className="relative flex shadow-2xl rounded-xl overflow-hidden border border-gray-200 bg-white">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none transition-colors duration-200" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter ZIP code (e.g., 10001)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={handleInputFocus}
                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    className="w-full pl-16 pr-6 py-6 text-lg focus:outline-none focus:bg-gray-50/50 transition-all duration-300 placeholder:text-gray-400"
                  />
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={isSearching || !searchInput.trim()}
                  className="bg-[#3ea2d4] hover:bg-[#3ea2d4]/90 disabled:bg-gray-300 text-white px-8 py-6 font-semibold text-lg transition-all duration-300 flex items-center gap-3 group/btn"
                >
                  {isSearching ? (
                    <>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span>Searching</span>
                    </>
                  ) : (
                    <>
                      <span>Find Representatives</span>
                      <ArrowRight className="w-5 h-5 transform transition-transform group-hover/btn:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {showHistory && searchHistory.length > 0 && (
              <div 
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-4 bg-white border border-gray-200 rounded-xl shadow-2xl z-10 max-h-64 overflow-y-auto animate-fade-in-down backdrop-blur-sm"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-sm font-semibold text-gray-700">Recent Searches</span>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-[#e11d07] transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
                
                {searchHistory.map((item, index) => (
                  <div
                    key={`${item.zipCode}-${index}`}
                    onClick={() => handleHistoryItemClick(item.zipCode)}
                    className="px-6 py-4 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between group transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-400 group-hover:text-[#3ea2d4] transition-colors" />
                      <span className="text-gray-700 font-medium">{item.zipCode}</span>
                      {item.displayName && (
                        <span className="text-sm text-gray-500">• {item.displayName}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item.zipCode)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-lg leading-none px-2 py-1 rounded hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Comprehensive Government Data</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">All information sourced directly from official government APIs for complete transparency and accuracy.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-blue-200 animate-fade-in-up">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-[#e11d07]/10 to-[#0a9338]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="35" cy="25" r="10" fill="none" stroke="#e11d07" strokeWidth="4"/>
                    <path d="M20 45 C20 40, 25 35, 35 35 C45 35, 50 40, 50 45 L50 55 L20 55 Z" fill="none" stroke="#e11d07" strokeWidth="4"/>
                    <rect x="55" y="20" width="30" height="40" fill="none" stroke="#0a9338" strokeWidth="4"/>
                    <line x1="62" y1="30" x2="78" y2="30" stroke="#0a9338" strokeWidth="3"/>
                    <line x1="62" y1="38" x2="78" y2="38" stroke="#0a9338" strokeWidth="3"/>
                    <line x1="62" y1="46" x2="78" y2="46" stroke="#0a9338" strokeWidth="3"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-[#e11d07] transition-colors">Complete Profiles</h3>
                <p className="text-gray-600 leading-relaxed">
                  Voting records, committee assignments, sponsored bills, and contact information for every representative.
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-green-200 animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-[#0a9338]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="35" cy="50" r="20" fill="none" stroke="#0a9338" strokeWidth="4"/>
                    <path d="M35 35 L35 65 M28 42 L35 42 C39 42, 42 44, 42 48 C42 52, 39 54, 35 54 L28 54" fill="none" stroke="#0a9338" strokeWidth="4"/>
                    <path d="M60 35 L75 35 L75 50" fill="none" stroke="#3ea2d4" strokeWidth="4"/>
                    <path d="M75 50 L75 65 L60 65" fill="none" stroke="#3ea2d4" strokeWidth="4"/>
                    <path d="M72 32 L78 35 L72 38" fill="#3ea2d4"/>
                    <path d="M63 68 L57 65 L63 62" fill="#3ea2d4"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-[#0a9338] transition-colors">Campaign Finance</h3>
                <p className="text-gray-600 leading-relaxed">
                  Track contributions, expenditures, and funding sources with data directly from the FEC.
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-red-200 animate-fade-in-up" style={{animationDelay: '400ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-[#e11d07]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect x="20" y="45" width="40" height="8" rx="4" fill="none" stroke="#e11d07" strokeWidth="4" transform="rotate(-45 40 49)"/>
                    <circle cx="65" cy="24" r="8" fill="none" stroke="#e11d07" strokeWidth="4"/>
                    <line x1="20" y1="70" x2="80" y2="70" stroke="#e11d07" strokeWidth="4"/>
                    <rect x="55" y="50" width="20" height="28" fill="none" stroke="#3ea2d4" strokeWidth="3"/>
                    <line x1="60" y1="58" x2="70" y2="58" stroke="#3ea2d4" strokeWidth="2"/>
                    <line x1="60" y1="64" x2="70" y2="64" stroke="#3ea2d4" strokeWidth="2"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-[#e11d07] transition-colors">Legislative Activity</h3>
                <p className="text-gray-600 leading-relaxed">
                  Monitor bills, votes, and policy positions with comprehensive tracking and analysis.
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-blue-200 animate-fade-in-up" style={{animationDelay: '600ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-red-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-[#3ea2d4]/10 to-[#e11d07]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M20 30 L40 30 L40 50 L60 50 L60 30 L80 30 L80 70 L60 70 L60 50 L40 50 L40 70 L20 70 Z" fill="none" stroke="#3ea2d4" strokeWidth="4"/>
                    <circle cx="50" cy="40" r="8" fill="none" stroke="#e11d07" strokeWidth="3"/>
                    <path d="M50 48 L50 60" stroke="#e11d07" strokeWidth="3"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-[#3ea2d4] transition-colors">District Information</h3>
                <p className="text-gray-600 leading-relaxed">
                  Demographics, boundaries, and electoral history for congressional and legislative districts.
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-green-200 animate-fade-in-up" style={{animationDelay: '800ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-[#0a9338]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#0a9338" strokeWidth="4"/>
                    <line x1="50" y1="50" x2="50" y2="35" stroke="#0a9338" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="50" y1="50" x2="62" y2="50" stroke="#0a9338" strokeWidth="4" strokeLinecap="round"/>
                    <path d="M75 40 C78 48, 76 58, 68 65" fill="none" stroke="#3ea2d4" strokeWidth="3"/>
                    <path d="M25 60 C22 52, 24 42, 32 35" fill="none" stroke="#3ea2d4" strokeWidth="3"/>
                    <path d="M72 37 L78 40 L72 43" fill="#3ea2d4"/>
                    <path d="M28 63 L22 60 L28 57" fill="#3ea2d4"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-[#0a9338] transition-colors">Real-Time Updates</h3>
                <p className="text-gray-600 leading-relaxed">
                  Fresh data from official government sources, updated daily to keep you informed.
                </p>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-purple-200 animate-fade-in-up" style={{animationDelay: '1000ms'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-br from-purple-100/50 to-pink-100/50 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect x="20" y="35" width="12" height="35" fill="none" stroke="#e11d07" strokeWidth="4"/>
                    <rect x="38" y="25" width="12" height="45" fill="none" stroke="#0a9338" strokeWidth="4"/>
                    <path d="M60 40 L75 40 M60 60 L75 60" stroke="#3ea2d4" strokeWidth="3"/>
                    <path d="M70 35 L75 40 L70 45" fill="none" stroke="#3ea2d4" strokeWidth="3"/>
                    <path d="M70 65 L75 60 L70 55" fill="none" stroke="#3ea2d4" strokeWidth="3"/>
                    <line x1="15" y1="75" x2="55" y2="75" stroke="#666" strokeWidth="3"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors">Comparison Tools</h3>
                <p className="text-gray-600 leading-relaxed">
                  Side-by-side analysis of representatives' voting patterns, funding, and legislative effectiveness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
              <div className="md:col-span-2 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <CiviqLogo className="w-12 h-18" />
                  <span className="text-3xl font-bold">CIV.IQ</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg max-w-md">
                  A civic utility providing transparent access to government data. All information sourced from official government APIs.
                </p>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '200ms'}}>
                <h3 className="text-xl font-semibold mb-6 text-[#3ea2d4]">Information</h3>
                <ul className="space-y-3">
                  <li><a href="/data-sources" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Data Sources</a></li>
                  <li><a href="/about" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">About CIV.IQ</a></li>
                  <li><a href="/privacy" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Privacy Policy</a></li>
                  <li><a href="/terms" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Terms of Service</a></li>
                </ul>
              </div>
              
              <div className="animate-fade-in-up" style={{animationDelay: '400ms'}}>
                <h3 className="text-xl font-semibold mb-6 text-[#0a9338]">Resources</h3>
                <ul className="space-y-3">
                  <li><a href="/docs/api" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">API Documentation</a></li>
                  <li><a href="https://github.com/civiq" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Open Source</a></li>
                  <li><a href="/contact" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Contact</a></li>
                  <li><a href="/changelog" className="text-gray-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">Changelog</a></li>
                </ul>
              </div>
            </div>
            
            <div className="text-center pt-8 border-t border-gray-700 space-y-2">
              <p className="text-gray-400 text-lg font-medium">© 2025 CIV.IQ | Code: MIT License | Docs: CC BY-SA 4.0</p>
              <p className="text-gray-500 text-sm">Built exclusively with public government data</p>
              <p className="text-gray-500 text-sm">Original code and design protected • Government data remains public domain</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}