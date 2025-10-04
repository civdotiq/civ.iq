import Image from 'next/image';
import SearchForm from '@/components/SearchForm';
import {
  RepresentativesIcon,
  LegislationIcon,
  StatisticsIcon,
} from '@/components/icons/AicherIcons';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen aicher-background">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center min-h-screen px-grid-2 sm:px-grid-3 lg:px-grid-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-grid-4">
            <div className="flex flex-col items-center mb-grid-3">
              <div className="mb-grid-2">
                <Image
                  src="/images/civiq-logo.png"
                  alt="CIV.IQ Logo"
                  width={120}
                  height={120}
                  className="border-2 border-black"
                  priority
                />
              </div>
              <div className="text-4xl font-bold text-civiq-red aicher-heading">CIV.IQ</div>
            </div>
            <h1 className="text-3xl font-bold text-black sm:text-5xl lg:text-6xl mb-grid-3 sm:mb-grid-4 lg:mb-grid-6 aicher-heading leading-tight">
              Know Your Representatives
            </h1>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>
          </div>

          {/* Search Bar */}
          <SearchForm />

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-2 sm:gap-grid-4 max-w-4xl mx-auto mt-grid-4 sm:mt-grid-8">
            <div className="aicher-card aicher-hover flex flex-col items-center p-grid-3 sm:p-grid-4">
              <div className="w-grid-6 h-grid-6 bg-civiq-blue flex items-center justify-center mb-grid-2 aicher-border">
                <RepresentativesIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-grid-2 aicher-heading text-center">
                Find Representatives
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Discover your House and Senate representatives with detailed contact information and
                voting records
              </p>
            </div>

            <div className="aicher-card aicher-hover flex flex-col items-center p-grid-3 sm:p-grid-4">
              <div className="w-grid-6 h-grid-6 bg-civiq-green flex items-center justify-center mb-grid-2 border-2 border-black">
                <LegislationIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-grid-2 aicher-heading text-center">
                Track Legislation
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Follow bills, votes, and legislative activity from the current 119th Congress
              </p>
            </div>

            <div className="aicher-card aicher-hover flex flex-col items-center p-grid-3 sm:p-grid-4">
              <div className="w-grid-6 h-grid-6 bg-civiq-red flex items-center justify-center mb-grid-2 border-2 border-black">
                <StatisticsIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-grid-2 aicher-heading text-center">
                View Statistics
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Analyze campaign finance, voting patterns, and demographic data from official
                sources
              </p>
            </div>
          </div>

          {/* Data Sources */}
          <div className="mt-grid-8 text-center">
            <p className="text-sm text-gray-500">
              Real-time data from Congress.gov, Federal Election Commission, and U.S. Census Bureau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
