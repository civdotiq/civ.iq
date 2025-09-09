import { UserGroupIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import SearchForm from '@/components/SearchForm';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="flex flex-col justify-center items-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="text-4xl font-bold text-civiq-red mb-4">CIV.IQ</div>
            <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-blue rounded-lg flex items-center justify-center mb-4">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Representatives</h3>
              <p className="text-gray-600 text-center">
                Discover your House and Senate representatives with detailed contact information and
                voting records
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-green rounded-lg flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Legislation</h3>
              <p className="text-gray-600 text-center">
                Follow bills, votes, and legislative activity from the current 119th Congress
              </p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-civiq-red rounded-lg flex items-center justify-center mb-4">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Statistics</h3>
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
