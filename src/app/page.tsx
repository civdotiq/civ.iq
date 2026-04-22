import Image from 'next/image';
import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import FeatureGrid from '@/components/landing/FeatureGrid';
import QuickStartPaths from '@/components/landing/QuickStartPaths';
import { AskQuestionSection } from '@/components/landing/AskQuestionSection';

export default function HomePage() {
  return (
    <div className="min-h-screen aicher-background density-detailed">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center px-grid-2 sm:px-grid-3 lg:px-grid-4 pt-grid-4 sm:pt-grid-6 pb-grid-2 sm:pb-grid-4">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Logo */}
          <div className="mb-grid-2 sm:mb-grid-4">
            <div className="flex flex-col items-center mb-grid-1 sm:mb-grid-3">
              <div className="mb-grid-1 sm:mb-grid-2">
                <Image
                  src="/images/civiq-logo-hero.webp"
                  alt="CIV.IQ Logo"
                  width={200}
                  height={200}
                  className="w-[140px] h-[140px] sm:w-[200px] sm:h-[200px]"
                  priority
                />
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-black aicher-heading">CIV.IQ</div>
            </div>
            <h1 className="text-xl sm:text-5xl lg:text-6xl mb-grid-1 sm:mb-grid-4 lg:mb-grid-6 leading-tight">
              <span className="accent-display text-black block">Know Your</span>
              <span className="accent-display text-black block text-2xl sm:text-5xl lg:text-6xl">
                Representatives
              </span>
            </h1>
            <p className="text-xs sm:text-xl text-gray-600 max-w-2xl mx-auto px-grid-1 sm:px-0">
              See how your representatives vote, who funds them, and what they sponsor — all from
              public government data.
            </p>
          </div>

          {/* Search Bar */}
          <SearchForm />

          {/* Primary CTA — one-click path to address lookup */}
          <div className="mb-grid-2 sm:mb-grid-4 text-center">
            <Link
              href="/your-reps"
              className="inline-flex items-center justify-center px-grid-3 py-grid-2 text-sm sm:text-base font-semibold text-civiq-blue bg-white border-2 border-civiq-blue hover:bg-civiq-blue hover:text-white transition-colors min-h-[44px] w-full sm:w-auto"
            >
              Find my representatives
            </Link>
          </div>

          {/* Data Sources */}
          <div className="mt-grid-2 sm:mt-grid-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500 px-grid-2">
              Federal data from{' '}
              <a
                href="https://www.congress.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Congress.gov
              </a>
              ,{' '}
              <a
                href="https://www.fec.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                FEC
              </a>
              , and{' '}
              <a
                href="https://www.census.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Census Bureau
              </a>
              . State legislature data from{' '}
              <a
                href="https://openstates.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Open States
              </a>
              .
            </p>
            <p className="text-xs text-gray-400 mt-grid-1">
              All data available via{' '}
              <Link href="/open" className="text-civiq-blue hover:underline">
                open API, RSS, Nostr, and the Fediverse
              </Link>
              . No account required.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Grid Section */}
      <FeatureGrid />

      {/* Quick Start Paths Section */}
      <QuickStartPaths />

      {/* Ask a Question Section */}
      <AskQuestionSection />
    </div>
  );
}
