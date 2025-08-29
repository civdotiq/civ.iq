'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartSearchInput } from '@/features/search/components/search/SmartSearchInput';

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

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="transform transition-all duration-300 group-hover:scale-105">
              <CiviqLogo className="w-8 h-12" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              CIV.IQ
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/representatives"
              className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full"
            >
              Representatives
            </Link>
            <Link
              href="/districts"
              className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full"
            >
              Districts
            </Link>
            <Link
              href="/about"
              className="relative font-medium text-gray-700 hover:text-[#3ea2d4] transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full"
            >
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="space-y-6">
              <h1
                className="text-5xl md:text-7xl font-black tracking-tight animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                Know Your{' '}
                <span className="bg-gradient-to-r from-[#e11d07] via-[#0a9338] to-[#3ea2d4] bg-clip-text text-transparent">
                  Representatives
                </span>
              </h1>

              <p
                className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up leading-relaxed"
                style={{ animationDelay: '400ms' }}
              >
                Transparent access to government data. Find who represents you at every level.
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
                <div className="relative shadow-2xl rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <SmartSearchInput
                    placeholder="Enter ZIP code or address (e.g., 10001 or 123 Main St, City, State)"
                    className="w-full"
                    showRecentSearches={true}
                    showExamples={true}
                    onSearch={value => {
                      const isZipCode = /^\d{5}$/.test(value.trim());
                      const isAddress = !isZipCode && value.trim().length > 5;

                      if (isZipCode) {
                        router.push(`/results?zip=${encodeURIComponent(value.trim())}`);
                      } else if (isAddress) {
                        router.push(`/results?address=${encodeURIComponent(value.trim())}`);
                      } else {
                        router.push(`/representatives?search=${encodeURIComponent(value.trim())}`);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
