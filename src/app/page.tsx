'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SearchHistory, SearchHistoryItem } from '@/lib/searchHistory';

function CiviqLogo({ className = "w-10 h-15" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      {/* A perfect red circle */}
      <circle cx="150" cy="100" r="70" fill="#e11d09" />
      
      {/* A perfect green rectangle */}
      <rect x="100" y="200" width="100" height="120" fill="#0a9338" />
      
      {/* Four identical, perfectly spaced blue circles */}
      <circle cx="90"  cy="370" r="12" fill="#3ea0d2" />
      <circle cx="130" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="170" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="210" cy="370" r="12" fill="#3ea0d2" />
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
      
      // Check if it's a ZIP code or address
      const isZipCode = /^\d{5}$/.test(searchInput.trim());
      if (isZipCode) {
        router.push(`/results?zip=${encodeURIComponent(searchInput.trim())}`);
      } else {
        router.push(`/results?address=${encodeURIComponent(searchInput.trim())}`);
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
        router.push(`/results?address=${encodeURIComponent(historyValue)}`);
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
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3">
            <CiviqLogo className="w-8 h-12" />
            <span className="text-2xl font-bold tracking-tight">CIV.IQ</span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#representatives" className="font-medium hover:text-civiq-blue transition-colors">Representatives</a>
            <a href="#districts" className="font-medium hover:text-civiq-blue transition-colors">Districts</a>
            <a href="#states" className="font-medium hover:text-civiq-blue transition-colors">States</a>
            <a href="#local" className="font-medium hover:text-civiq-blue transition-colors">Local</a>
            <a href="#legislation" className="font-medium hover:text-civiq-blue transition-colors">Legislation</a>
            <a href="#about" className="font-medium hover:text-civiq-blue transition-colors">About</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="animate-fadeIn">
            <CiviqLogo className="w-20 h-[120px] mx-auto mb-8" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight animate-fadeIn animation-delay-100">
            Know Your Representatives
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto animate-fadeIn animation-delay-200">
            Enter your ZIP code or address to discover who represents you at every level of government
          </p>
          
          <div className="max-w-2xl mx-auto relative animate-fadeIn animation-delay-300">
            <div className="flex shadow-xl rounded-lg overflow-hidden border border-gray-200">
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter ZIP Code or Address"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                className="flex-1 px-6 py-5 text-lg focus:outline-none focus:bg-gray-50 transition-colors"
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching || !searchInput.trim()}
                className="bg-civiq-green text-white px-8 py-5 font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSearching ? 'Searching...' : 'Find My Representatives'}
              </button>
            </div>
            
            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div 
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Recent Searches</span>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-civiq-red transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                
                {searchHistory.map((item, index) => (
                  <div
                    key={`${item.zipCode}-${index}`}
                    onClick={() => handleHistoryItemClick(item.zipCode)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{item.zipCode}</span>
                      {item.displayName && (
                        <span className="text-sm text-gray-500">• {item.displayName}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(e, item.zipCode)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xl leading-none px-2"
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

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16 max-w-6xl mx-auto">
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* Complete Profiles Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Person icon with document */}
                  <circle cx="35" cy="25" r="10" fill="none" stroke="#e11d09" strokeWidth="4"/>
                  <path d="M20 45 C20 40, 25 35, 35 35 C45 35, 50 40, 50 45 L50 55 L20 55 Z" fill="none" stroke="#e11d09" strokeWidth="4"/>
                  {/* Document */}
                  <rect x="55" y="20" width="30" height="40" fill="none" stroke="#0a9338" strokeWidth="4"/>
                  <line x1="62" y1="30" x2="78" y2="30" stroke="#0a9338" strokeWidth="3"/>
                  <line x1="62" y1="38" x2="78" y2="38" stroke="#0a9338" strokeWidth="3"/>
                  <line x1="62" y1="46" x2="78" y2="46" stroke="#0a9338" strokeWidth="3"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Complete Profiles</h3>
              <p className="text-gray-600 leading-relaxed">
                Voting records, committee assignments, sponsored bills, and contact information for every representative.
              </p>
            </div>
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* Campaign Finance Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Dollar sign with flow arrows */}
                  <circle cx="35" cy="50" r="20" fill="none" stroke="#0a9338" strokeWidth="4"/>
                  <path d="M35 35 L35 65 M28 42 L35 42 C39 42, 42 44, 42 48 C42 52, 39 54, 35 54 L28 54" fill="none" stroke="#0a9338" strokeWidth="4"/>
                  {/* Flow arrows */}
                  <path d="M60 35 L75 35 L75 50" fill="none" stroke="#3ea0d2" strokeWidth="4"/>
                  <path d="M75 50 L75 65 L60 65" fill="none" stroke="#3ea0d2" strokeWidth="4"/>
                  <path d="M72 32 L78 35 L72 38" fill="#3ea0d2"/>
                  <path d="M63 68 L57 65 L63 62" fill="#3ea0d2"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Campaign Finance</h3>
              <p className="text-gray-600 leading-relaxed">
                Track contributions, expenditures, and funding sources with data directly from the FEC.
              </p>
            </div>
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* Legislative Activity Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Gavel */}
                  <rect x="20" y="45" width="40" height="8" rx="4" fill="none" stroke="#e11d09" strokeWidth="4" transform="rotate(-45 40 49)"/>
                  <circle cx="65" cy="24" r="8" fill="none" stroke="#e11d09" strokeWidth="4"/>
                  <line x1="20" y1="70" x2="80" y2="70" stroke="#e11d09" strokeWidth="4"/>
                  {/* Document/Bill */}
                  <rect x="55" y="50" width="20" height="28" fill="none" stroke="#3ea0d2" strokeWidth="3"/>
                  <line x1="60" y1="58" x2="70" y2="58" stroke="#3ea0d2" strokeWidth="2"/>
                  <line x1="60" y1="64" x2="70" y2="64" stroke="#3ea0d2" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Legislative Activity</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor bills, votes, and policy positions across federal, state, and local governments.
              </p>
            </div>
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* District Information Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Map/District boundaries */}
                  <path d="M20 30 L40 30 L40 50 L60 50 L60 30 L80 30 L80 70 L60 70 L60 50 L40 50 L40 70 L20 70 Z" fill="none" stroke="#3ea0d2" strokeWidth="4"/>
                  {/* Location pin */}
                  <circle cx="50" cy="40" r="8" fill="none" stroke="#e11d09" strokeWidth="3"/>
                  <path d="M50 48 L50 60" stroke="#e11d09" strokeWidth="3"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">District Information</h3>
              <p className="text-gray-600 leading-relaxed">
                Demographics, boundaries, and electoral history for every congressional and legislative district.
              </p>
            </div>
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* Real-Time Updates Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Clock circle */}
                  <circle cx="50" cy="50" r="25" fill="none" stroke="#0a9338" strokeWidth="4"/>
                  {/* Clock hands */}
                  <line x1="50" y1="50" x2="50" y2="35" stroke="#0a9338" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="50" y1="50" x2="62" y2="50" stroke="#0a9338" strokeWidth="4" strokeLinecap="round"/>
                  {/* Refresh arrows */}
                  <path d="M75 40 C78 48, 76 58, 68 65" fill="none" stroke="#3ea0d2" strokeWidth="3"/>
                  <path d="M25 60 C22 52, 24 42, 32 35" fill="none" stroke="#3ea0d2" strokeWidth="3"/>
                  <path d="M72 37 L78 40 L72 43" fill="#3ea0d2"/>
                  <path d="M28 63 L22 60 L28 57" fill="#3ea0d2"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Real-Time Updates</h3>
              <p className="text-gray-600 leading-relaxed">
                Fresh data from official government sources, updated daily to keep you informed.
              </p>
            </div>
            <div className="text-center group cursor-pointer transition-all hover:transform hover:-translate-y-2">
              {/* Comparison Tools Pictogram */}
              <div className="w-24 h-24 mx-auto mb-6 transition-all group-hover:scale-110">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Two bars for comparison */}
                  <rect x="20" y="35" width="12" height="35" fill="none" stroke="#e11d09" strokeWidth="4"/>
                  <rect x="38" y="25" width="12" height="45" fill="none" stroke="#0a9338" strokeWidth="4"/>
                  {/* Comparison arrows */}
                  <path d="M60 40 L75 40 M60 60 L75 60" stroke="#3ea0d2" strokeWidth="3"/>
                  <path d="M70 35 L75 40 L70 45" fill="none" stroke="#3ea0d2" strokeWidth="3"/>
                  <path d="M70 65 L75 60 L70 55" fill="none" stroke="#3ea0d2" strokeWidth="3"/>
                  {/* Scale base */}
                  <line x1="15" y1="75" x2="55" y2="75" stroke="#000" strokeWidth="3"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Comparison Tools</h3>
              <p className="text-gray-600 leading-relaxed">
                Side-by-side analysis of representatives' voting patterns, funding, and legislative effectiveness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold mb-4">CIV.IQ</h3>
              <p className="text-gray-400 leading-relaxed">
                A civic utility providing transparent access to government data. All information sourced from official government APIs.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Data Sources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Congress.gov</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FEC.gov</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Census.gov</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">OpenStates.org</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Open Source</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-500">Public utility. No rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}