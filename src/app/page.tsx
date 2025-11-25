import Image from 'next/image';
import SearchForm from '@/components/SearchForm';
import FeatureGrid from '@/components/landing/FeatureGrid';
import QuickStartPaths from '@/components/landing/QuickStartPaths';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen aicher-background density-detailed">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center min-h-screen px-grid-2 sm:px-grid-3 lg:px-grid-4 py-grid-4 sm:py-grid-4">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Logo */}
          <div className="mb-grid-2 sm:mb-grid-4">
            <div className="flex flex-col items-center mb-grid-1 sm:mb-grid-3">
              <div className="mb-grid-1 sm:mb-grid-2">
                <Image
                  src="/images/civiq-logo.png"
                  alt="CIV.IQ Logo"
                  width={120}
                  height={120}
                  className="border-2 border-black w-[80px] h-[80px] sm:w-[120px] sm:h-[120px]"
                  priority
                />
              </div>
              <div className="text-2xl sm:text-4xl font-bold text-civiq-red aicher-heading">
                CIV.IQ
              </div>
            </div>
            <h1 className="text-xl font-bold text-black sm:text-5xl lg:text-6xl mb-grid-1 sm:mb-grid-4 lg:mb-grid-6 aicher-heading leading-tight">
              Know Your Representatives
            </h1>
            <p className="text-xs sm:text-xl text-gray-600 max-w-2xl mx-auto px-grid-1 sm:px-0">
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>
          </div>

          {/* Search Bar */}
          <SearchForm />

          {/* Data Sources */}
          <div className="mt-grid-3 sm:mt-grid-8 text-center">
            <p className="text-xs sm:text-sm text-gray-500 px-grid-2">
              Federal data from Congress.gov, FEC, and Census Bureau. State legislature data from
              Open States.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Grid Section */}
      <FeatureGrid />

      {/* Quick Start Paths Section */}
      <QuickStartPaths />

      {/* Legal Links */}
      <div className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 py-grid-4 sm:py-grid-6 mt-grid-4 sm:mt-grid-6 border-t border-gray-200">
        <div className="flex flex-wrap justify-center gap-x-grid-3 gap-y-grid-1 text-xs sm:text-sm">
          <a
            href="/about"
            className="text-gray-600 hover:text-civiq-blue transition-colors underline"
          >
            About
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="/privacy"
            className="text-gray-600 hover:text-civiq-blue transition-colors underline"
          >
            Privacy Policy
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="/terms"
            className="text-gray-600 hover:text-civiq-blue transition-colors underline"
          >
            Terms of Service
          </a>
          <span className="text-gray-400">•</span>
          <a
            href="/disclaimer"
            className="text-gray-600 hover:text-civiq-blue transition-colors underline"
          >
            Disclaimer
          </a>
        </div>
        <p className="text-xs text-gray-400 text-center mt-grid-2">
          © {new Date().getFullYear()} CIV.IQ. All rights reserved.
        </p>
      </div>
    </div>
  );
}
