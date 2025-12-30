'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartSearchInput } from '@/features/search/components/search/SmartSearchInput';
import { MultiDistrictNotification } from '@/components/search/MultiDistrictNotification';
import { GeolocationLookup } from '@/components/search/GeolocationLookup';
import { AddressRefinementInput } from '@/components/search/AddressRefinementInput';
import {
  checkMultiDistrict,
  DistrictInfo,
  MultiDistrictResponse,
} from '@/lib/multi-district/detection';
import { Header } from '@/shared/components/navigation/Header';

function CiviqLogo({ className = 'w-10 h-15' }: { className?: string }) {
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

      <circle
        cx="90"
        cy="370"
        r="12"
        fill="#3ea2d4"
        className="animate-pulse"
        style={{ animationDelay: '0ms' }}
      />
      <circle
        cx="130"
        cy="370"
        r="12"
        fill="#3ea2d4"
        className="animate-pulse"
        style={{ animationDelay: '200ms' }}
      />
      <circle
        cx="170"
        cy="370"
        r="12"
        fill="#3ea2d4"
        className="animate-pulse"
        style={{ animationDelay: '400ms' }}
      />
      <circle
        cx="210"
        cy="370"
        r="12"
        fill="#3ea2d4"
        className="animate-pulse"
        style={{ animationDelay: '600ms' }}
      />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [multiDistrictData, setMultiDistrictData] = useState<MultiDistrictResponse | null>(null);
  const [showGeolocation, setShowGeolocation] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [currentZipCode, setCurrentZipCode] = useState('');

  const handleSearch = async (value: string) => {
    const isZipCode = /^\d{5}$/.test(value.trim());
    const isAddress = !isZipCode && value.trim().length > 5;

    if (isZipCode) {
      setCurrentZipCode(value.trim());
      // Check if this ZIP code has multiple districts
      const multiDistrictCheck = await checkMultiDistrict(value.trim());

      if (multiDistrictCheck.success && multiDistrictCheck.isMultiDistrict) {
        // Show multi-district notification
        setMultiDistrictData(multiDistrictCheck);
        return;
      } else {
        // Single district or failed check - proceed to results
        router.push(`/results?zip=${encodeURIComponent(value.trim())}`);
      }
    } else if (isAddress) {
      router.push(`/results?address=${encodeURIComponent(value.trim())}`);
    } else {
      router.push(`/representatives?search=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleDistrictSelect = (district: DistrictInfo) => {
    router.push(
      `/results?zip=${encodeURIComponent(currentZipCode)}&district=${district.state}-${district.district}`
    );
  };

  const handleGeolocationSuccess = (latitude: number, longitude: number) => {
    setShowGeolocation(false);
    // Navigate to results with coordinates
    router.push(
      `/results?lat=${latitude}&lng=${longitude}&zip=${encodeURIComponent(currentZipCode)}`
    );
  };

  const handleGeolocationError = () => {
    setShowGeolocation(false);
    // Fallback to address input
    setShowAddressInput(true);
  };

  const handleAddressSuccess = (address: string) => {
    setShowAddressInput(false);
    router.push(`/results?address=${encodeURIComponent(address)}`);
  };

  const handleCloseNotifications = () => {
    setMultiDistrictData(null);
    setShowGeolocation(false);
    setShowAddressInput(false);
    setCurrentZipCode('');
  };

  return (
    <>
      <Header />

      <section className="min-h-screen flex items-center justify-center px-4 pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="max-w-4xl w-full text-center space-y-6 md:space-y-10">
          <div className="animate-fade-in-up">
            <CiviqLogo className="w-16 h-24 md:w-24 md:h-36 mx-auto mb-6 md:mb-8" />
          </div>

          <div className="space-y-4 md:space-y-8">
            <h1
              className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight animate-fade-in-up leading-tight px-2"
              style={{ animationDelay: '200ms' }}
            >
              <span className="block sm:inline">KNOW YOUR </span>
              <span className="block sm:inline bg-gradient-to-r from-[#e11d07] via-[#0a9338] to-[#3ea2d4] bg-clip-text text-transparent font-bold">
                REPRESENTATIVES
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto animate-fade-in-up leading-relaxed font-medium px-4"
              style={{ animationDelay: '400ms' }}
            >
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>

            <div className="text-center animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <Link
                href="/districts"
                className="inline-flex items-center gap-2 text-[#3ea2d4] hover:text-[#3ea2d4]/80 font-medium transition-colors"
              >
                <span>Search by representative name</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div
            className="max-w-2xl mx-auto relative animate-fade-in-up"
            style={{ animationDelay: '600ms' }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#3ea2d4]/20 to-[#0a9338]/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <SmartSearchInput
                  placeholder="Enter ZIP code or address (e.g., 10001 or 123 Main St, City, State)"
                  className="w-full"
                  showRecentSearches={true}
                  showExamples={true}
                  onSearch={handleSearch}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Multi-District Notification */}
        {multiDistrictData && multiDistrictData.isMultiDistrict && (
          <div className="mt-8">
            <MultiDistrictNotification
              zipCode={currentZipCode}
              districts={multiDistrictData.districts}
              onSelectDistrict={handleDistrictSelect}
              onUseLocation={() => setShowGeolocation(true)}
              onRefineAddress={() => setShowAddressInput(true)}
              onClose={handleCloseNotifications}
            />
          </div>
        )}

        {/* Geolocation Lookup */}
        {showGeolocation && (
          <div className="mt-8">
            <GeolocationLookup
              zipCode={currentZipCode}
              onSuccess={handleGeolocationSuccess}
              onError={handleGeolocationError}
              onCancel={handleCloseNotifications}
            />
          </div>
        )}

        {/* Address Refinement Input */}
        {showAddressInput && (
          <div className="mt-8">
            <AddressRefinementInput
              zipCode={currentZipCode}
              onSuccess={handleAddressSuccess}
              onCancel={handleCloseNotifications}
            />
          </div>
        )}
      </section>

      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
              Comprehensive Government Data
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium leading-relaxed">
              All information sourced directly from official government APIs for complete
              transparency and accuracy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
            <div className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-[#e11d07]/10 to-[#0a9338]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <circle cx="35" cy="25" r="10" fill="none" stroke="#e11d07" strokeWidth="4" />
                    <path
                      d="M20 45 C20 40, 25 35, 35 35 C45 35, 50 40, 50 45 L50 55 L20 55 Z"
                      fill="none"
                      stroke="#e11d07"
                      strokeWidth="4"
                    />
                    <rect
                      x="55"
                      y="20"
                      width="30"
                      height="40"
                      fill="none"
                      stroke="#0a9338"
                      strokeWidth="4"
                    />
                    <line x1="62" y1="30" x2="78" y2="30" stroke="#0a9338" strokeWidth="3" />
                    <line x1="62" y1="38" x2="78" y2="38" stroke="#0a9338" strokeWidth="3" />
                    <line x1="62" y1="46" x2="78" y2="46" stroke="#0a9338" strokeWidth="3" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-[#e11d07] transition-colors tracking-tight">
                  Complete Profiles
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Voting records, committee assignments, sponsored bills, and contact information
                  for every representative.
                </p>
              </div>
            </div>

            <div
              className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-[#0a9338]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <circle cx="35" cy="50" r="20" fill="none" stroke="#0a9338" strokeWidth="4" />
                    <path
                      d="M35 35 L35 65 M28 42 L35 42 C39 42, 42 44, 42 48 C42 52, 39 54, 35 54 L28 54"
                      fill="none"
                      stroke="#0a9338"
                      strokeWidth="4"
                    />
                    <path d="M60 35 L75 35 L75 50" fill="none" stroke="#3ea2d4" strokeWidth="4" />
                    <path d="M75 50 L75 65 L60 65" fill="none" stroke="#3ea2d4" strokeWidth="4" />
                    <path d="M72 32 L78 35 L72 38" fill="#3ea2d4" />
                    <path d="M63 68 L57 65 L63 62" fill="#3ea2d4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-[#0a9338] transition-colors tracking-tight">
                  Campaign Finance
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Track contributions, expenditures, and funding sources with data directly from the
                  FEC.
                </p>
              </div>
            </div>

            <div
              className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-[#e11d07]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <rect
                      x="20"
                      y="45"
                      width="40"
                      height="8"
                      rx="4"
                      fill="none"
                      stroke="#e11d07"
                      strokeWidth="4"
                      transform="rotate(-45 40 49)"
                    />
                    <circle cx="65" cy="24" r="8" fill="none" stroke="#e11d07" strokeWidth="4" />
                    <line x1="20" y1="70" x2="80" y2="70" stroke="#e11d07" strokeWidth="4" />
                    <rect
                      x="55"
                      y="50"
                      width="20"
                      height="28"
                      fill="none"
                      stroke="#3ea2d4"
                      strokeWidth="3"
                    />
                    <line x1="60" y1="58" x2="70" y2="58" stroke="#3ea2d4" strokeWidth="2" />
                    <line x1="60" y1="64" x2="70" y2="64" stroke="#3ea2d4" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-[#e11d07] transition-colors tracking-tight">
                  Legislative Activity
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Monitor bills, votes, and policy positions with comprehensive tracking and
                  analysis.
                </p>
              </div>
            </div>

            <div
              className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: '600ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-red-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-[#3ea2d4]/10 to-[#e11d07]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <path
                      d="M20 30 L40 30 L40 50 L60 50 L60 30 L80 30 L80 70 L60 70 L60 50 L40 50 L40 70 L20 70 Z"
                      fill="none"
                      stroke="#3ea2d4"
                      strokeWidth="4"
                    />
                    <circle cx="50" cy="40" r="8" fill="none" stroke="#e11d07" strokeWidth="3" />
                    <path d="M50 48 L50 60" stroke="#e11d07" strokeWidth="3" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-[#3ea2d4] transition-colors tracking-tight">
                  District Information
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Demographics, boundaries, and electoral history for congressional and legislative
                  districts.
                </p>
              </div>
            </div>

            <div
              className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: '800ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-[#0a9338]/10 to-[#3ea2d4]/10 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#0a9338" strokeWidth="4" />
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="35"
                      stroke="#0a9338"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="50"
                      y1="50"
                      x2="62"
                      y2="50"
                      stroke="#0a9338"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M75 40 C78 48, 76 58, 68 65"
                      fill="none"
                      stroke="#3ea2d4"
                      strokeWidth="3"
                    />
                    <path
                      d="M25 60 C22 52, 24 42, 32 35"
                      fill="none"
                      stroke="#3ea2d4"
                      strokeWidth="3"
                    />
                    <path d="M72 37 L78 40 L72 43" fill="#3ea2d4" />
                    <path d="M28 63 L22 60 L28 57" fill="#3ea2d4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-[#0a9338] transition-colors tracking-tight">
                  Real-Time Updates
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Fresh data from official government sources, updated daily to keep you informed.
                </p>
              </div>
            </div>

            <div
              className="group relative bg-white rounded-2xl p-10 text-center border-2 border-black hover:border-2 border-black transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: '1000ms' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-gray-50/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-8 p-5 bg-gradient-to-br from-blue-100/50 to-gray-100/50 rounded-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <rect
                      x="20"
                      y="35"
                      width="12"
                      height="35"
                      fill="none"
                      stroke="#e11d07"
                      strokeWidth="4"
                    />
                    <rect
                      x="38"
                      y="25"
                      width="12"
                      height="45"
                      fill="none"
                      stroke="#0a9338"
                      strokeWidth="4"
                    />
                    <path d="M60 40 L75 40 M60 60 L75 60" stroke="#3ea2d4" strokeWidth="3" />
                    <path d="M70 35 L75 40 L70 45" fill="none" stroke="#3ea2d4" strokeWidth="3" />
                    <path d="M70 65 L75 60 L70 55" fill="none" stroke="#3ea2d4" strokeWidth="3" />
                    <line x1="15" y1="75" x2="55" y2="75" stroke="#666" strokeWidth="3" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-6 text-gray-900 group-hover:text-civiq-blue transition-colors tracking-tight">
                  Comparison Tools
                </h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Side-by-side analysis of representatives&apos; voting patterns, funding, and
                  legislative effectiveness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
