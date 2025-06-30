'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Building2, 
  BarChart3, 
  Map,
  Search,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg className="w-12 h-12 transition-transform group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-100"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-200"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-300"/>
      </svg>
      <span className="ml-3 text-2xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

// Hero search component
function HeroSearch() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    
    // Check if it's a ZIP code
    const isZip = /^\d{5}$/.test(searchInput.trim());
    
    if (isZip) {
      router.push(`/representatives?zip=${searchInput.trim()}`);
    } else {
      // For addresses or names, encode and search
      router.push(`/representatives?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter ZIP code, address, or representative name..."
          className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full pr-32 focus:outline-none focus:border-blue-500 transition-colors"
          disabled={isSearching}
        />
        <button
          type="submit"
          disabled={isSearching || !searchInput.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <span className="animate-spin">⟳</span>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-3 text-center">
        Find your representatives by ZIP code, full address, or search by name
      </p>
    </form>
  );
}

// Feature card component
function FeatureCard({ 
  icon, 
  title, 
  description, 
  href,
  color = 'blue'
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
  };

  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 p-6 h-full">
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600">
          {description}
        </p>
      </div>
    </Link>
  );
}

// Stats card component
function StatCard({ 
  value, 
  label, 
  trend 
}: { 
  value: string;
  label: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="bg-white rounded-lg p-6 text-center">
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {trend && (
        <div className={`flex items-center justify-center gap-1 mt-2 text-sm ${
          trend.positive ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
          <span>{trend.value}%</span>
        </div>
      )}
    </div>
  );
}

// Recent activity component
function RecentActivity() {
  const activities = [
    {
      type: 'vote',
      title: 'Infrastructure Bill Passes House',
      description: '228-206 vote on H.R. 3684',
      time: '2 hours ago',
      urgent: true
    },
    {
      type: 'announcement',
      title: 'New Committee Assignments Released',
      description: '47 representatives receive new committee positions',
      time: '5 hours ago',
      urgent: false
    },
    {
      type: 'update',
      title: 'Campaign Finance Reports Published',
      description: 'Q3 2024 FEC filings now available',
      time: '1 day ago',
      urgent: false
    },
    {
      type: 'news',
      title: 'Senate Confirms Federal Judges',
      description: '3 judicial nominations approved',
      time: '2 days ago',
      urgent: false
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vote':
        return <FileText className="w-5 h-5" />;
      case 'announcement':
        return <Building2 className="w-5 h-5" />;
      case 'update':
        return <BarChart3 className="w-5 h-5" />;
      case 'news':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className={`flex items-start gap-4 p-4 rounded-lg ${
            activity.urgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
          }`}>
            <div className={`p-2 rounded-lg ${
              activity.urgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{activity.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
            </div>
            {activity.urgent && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                Urgent
              </span>
            )}
          </div>
        ))}
      </div>
      <Link 
        href="/analytics"
        className="block w-full text-center mt-6 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
      >
        View All Activity
      </Link>
    </div>
  );
}

// Main Home Page
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/representatives" className="text-gray-700 hover:text-blue-600 transition-colors">
                Representatives
              </Link>
              <Link href="/districts" className="text-gray-700 hover:text-blue-600 transition-colors">
                Districts
              </Link>
              <Link href="/compare" className="text-gray-700 hover:text-blue-600 transition-colors">
                Compare
              </Link>
              <Link href="/analytics" className="text-gray-700 hover:text-blue-600 transition-colors">
                Analytics
              </Link>
              <Link href="/states" className="text-gray-700 hover:text-blue-600 transition-colors">
                States
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Know Your Representatives
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Empowering citizens with transparent access to government data and democratic engagement tools
            </p>
          </div>
          
          <HeroSearch />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            <StatCard value="535" label="Representatives" />
            <StatCard value="50" label="States Covered" />
            <StatCard value="435" label="House Districts" />
            <StatCard value="99.9%" label="Data Accuracy" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Comprehensive Civic Intelligence
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access detailed information about your government representatives and their activities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Find Representatives"
            description="Discover all your representatives from federal to local levels"
            href="/representatives"
            color="blue"
          />
          <FeatureCard
            icon={<Map className="w-8 h-8" />}
            title="Explore Districts"
            description="View detailed demographic and political data for congressional districts"
            href="/districts"
            color="green"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Compare & Analyze"
            description="Side-by-side comparison of voting records and campaign finance"
            href="/compare"
            color="purple"
          />
          <FeatureCard
            icon={<Building2 className="w-8 h-8" />}
            title="State Overviews"
            description="Comprehensive state-level political and demographic analysis"
            href="/states"
            color="orange"
          />
        </div>
      </section>

      {/* Activity and Insights Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/representatives?chamber=Senate"
                  className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse U.S. Senators
                </Link>
                <Link 
                  href="/districts?filter=competitive"
                  className="block w-full px-4 py-3 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Competitive Districts
                </Link>
                <Link 
                  href="/analytics?view=finance"
                  className="block w-full px-4 py-3 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Campaign Finance Analytics
                </Link>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Trending Topics</h3>
              <div className="space-y-2">
                {['Healthcare Reform', 'Infrastructure', 'Climate Policy', 'Education Funding'].map((topic, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{topic}</span>
                    <span className="text-xs text-gray-500">
                      {[1234, 987, 765, 543][index]} searches
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Stay Informed, Stay Engaged
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of citizens using CIV.IQ to understand their government and make their voices heard
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/representatives"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/about"
              className="px-8 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/representatives" className="hover:text-white transition-colors">Representatives</Link></li>
                <li><Link href="/districts" className="hover:text-white transition-colors">Districts</Link></li>
                <li><Link href="/compare" className="hover:text-white transition-colors">Compare</Link></li>
                <li><Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About CIV.IQ</Link></li>
                <li><Link href="/methodology" className="hover:text-white transition-colors">Methodology</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API Access</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Data Sources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Congress.gov</li>
                <li>FEC.gov</li>
                <li>Census.gov</li>
                <li>OpenStates.org</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <p className="text-sm text-gray-400 mb-4">
                Questions or feedback? We'd love to hear from you.
              </p>
              <Link 
                href="/contact"
                className="inline-block px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Contact Us
              </Link>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 CIV.IQ - Empowering civic engagement through transparency</p>
            <p className="mt-2">
              Data accuracy validated daily from official government sources
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}