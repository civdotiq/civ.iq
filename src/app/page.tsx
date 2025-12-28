import Image from 'next/image';
import SearchForm from '@/components/SearchForm';
import FeatureGrid from '@/components/landing/FeatureGrid';
import QuickStartPaths from '@/components/landing/QuickStartPaths';
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen aicher-background density-detailed">
      {/* Structured Data for SEO */}
      <OrganizationSchema />
      <WebSiteSchema />
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center px-grid-2 sm:px-grid-3 lg:px-grid-4 pt-grid-4 sm:pt-grid-6 pb-grid-2 sm:pb-grid-4">
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
            <h1 className="text-xl sm:text-5xl lg:text-6xl mb-grid-1 sm:mb-grid-4 lg:mb-grid-6 leading-tight">
              <span className="accent-display text-black block">Know Your</span>
              <span className="accent-highlight text-2xl sm:text-5xl lg:text-6xl">
                Representatives
              </span>
            </h1>
            <p className="text-xs sm:text-xl text-gray-600 max-w-2xl mx-auto px-grid-1 sm:px-0">
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>
          </div>

          {/* Search Bar */}
          <SearchForm />

          {/* Data Sources */}
          <div className="mt-grid-2 sm:mt-grid-4 text-center">
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
    </main>
  );
}
