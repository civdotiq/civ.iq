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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center min-h-screen px-4 sm:px-6 lg:px-8">
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
            <h1 className="text-5xl font-bold text-black sm:text-6xl mb-grid-6 aicher-heading">
              Know Your Representatives
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with your federal representatives through real government data from
              Congress.gov, FEC, and Census Bureau
            </p>
          </div>

          {/* Search Bar */}
          <SearchForm />

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
            <div className="flex flex-col items-center p-6 bg-white aicher-border hover:border-civiq-blue transition-colors">
              <div className="w-12 h-12 bg-civiq-blue flex items-center justify-center mb-4 aicher-border">
                <RepresentativesIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 aicher-heading">
                Find Representatives
              </h3>
              <p className="text-gray-600 text-center">
                Discover your House and Senate representatives with detailed contact information and
                voting records
              </p>
            </div>

            <div className="flex flex-col items-center p-grid-3 bg-white border-2 border-black hover:border-civiq-blue transition-colors">
              <div className="w-grid-6 h-grid-6 bg-civiq-green flex items-center justify-center mb-grid-2 border-2 border-black">
                <LegislationIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 aicher-heading">
                Track Legislation
              </h3>
              <p className="text-gray-600 text-center">
                Follow bills, votes, and legislative activity from the current 119th Congress
              </p>
            </div>

            <div className="flex flex-col items-center p-grid-3 bg-white border-2 border-black hover:border-civiq-blue transition-colors">
              <div className="w-grid-6 h-grid-6 bg-civiq-red flex items-center justify-center mb-grid-2 border-2 border-black">
                <StatisticsIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 aicher-heading">
                View Statistics
              </h3>
              <p className="text-gray-600 text-center">
                Analyze campaign finance, voting patterns, and demographic data from official
                sources
              </p>
            </div>
          </div>

          {/* Data Sources */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              Real-time data from Congress.gov, Federal Election Commission, and U.S. Census Bureau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
