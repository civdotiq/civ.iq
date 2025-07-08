'use client';

import Link from 'next/link';

function CiviqLogo({ className = "w-10 h-15" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="100" r="70" fill="#e11d09" />
      <rect x="100" y="200" width="100" height="120" fill="#0a9338" />
      <circle cx="90"  cy="370" r="12" fill="#3ea0d2" />
      <circle cx="130" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="170" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="210" cy="370" r="12" fill="#3ea0d2" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <CiviqLogo className="w-8 h-12" />
            <span className="text-2xl font-bold tracking-tight">CIV.IQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/representatives" className="font-medium hover:text-civiq-blue transition-colors">Representatives</Link>
            <Link href="/districts" className="font-medium hover:text-civiq-blue transition-colors">Districts</Link>
            <Link href="/states" className="font-medium hover:text-civiq-blue transition-colors">States</Link>
            <Link href="/local" className="font-medium hover:text-civiq-blue transition-colors">Local</Link>
            <Link href="/legislation" className="font-medium hover:text-civiq-blue transition-colors">Legislation</Link>
            <Link href="/about" className="font-medium text-civiq-blue transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">About CIV.IQ</h1>
          
          <div className="prose prose-lg mx-auto">
            <p className="text-xl text-gray-600 text-center mb-12">
              CIV.IQ is a civic intelligence platform that empowers citizens with transparent access to government data 
              and democratic engagement tools.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-700">
                To democratize access to government information, enabling every citizen to understand their representation, 
                track legislative activities, and engage meaningfully with their elected officials at all levels of government.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3 text-civiq-red">Aggregate Official Data</h3>
                  <p className="text-gray-600">
                    We collect and organize data from official government sources including Congress.gov, FEC.gov, 
                    and Census.gov to provide accurate, up-to-date information.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3 text-civiq-green">Simplify Complexity</h3>
                  <p className="text-gray-600">
                    Government data can be overwhelming. We present it in clear, understandable formats that make 
                    civic engagement accessible to everyone.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3 text-civiq-blue">Enable Engagement</h3>
                  <p className="text-gray-600">
                    From finding your representatives to tracking legislation, we provide tools that help you 
                    participate actively in democracy.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3 text-gray-700">Maintain Neutrality</h3>
                  <p className="text-gray-600">
                    We present information without partisan bias, allowing citizens to form their own informed opinions 
                    based on facts.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Principles</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-civiq-green mr-3 text-2xl">✓</span>
                  <div>
                    <strong>Transparency:</strong> All data sources are clearly cited and linked to official government websites.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-civiq-green mr-3 text-2xl">✓</span>
                  <div>
                    <strong>Accessibility:</strong> Free access for all citizens, no registration required, fully compliant with WCAG standards.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-civiq-green mr-3 text-2xl">✓</span>
                  <div>
                    <strong>Accuracy:</strong> Real-time validation against official sources with 99.9% accuracy targets.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-civiq-green mr-3 text-2xl">✓</span>
                  <div>
                    <strong>Privacy:</strong> No tracking, no personal data collection, no advertising.
                  </div>
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Data Sources</h2>
              <p className="text-gray-700 mb-4">
                CIV.IQ aggregates data from trusted government sources:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <ul className="space-y-3">
                  <li>
                    <strong>Congress.gov:</strong> Federal legislative data, member information, voting records
                  </li>
                  <li>
                    <strong>FEC.gov:</strong> Campaign finance data, contribution records, spending reports
                  </li>
                  <li>
                    <strong>Census.gov:</strong> District boundaries, demographic information, geographic data
                  </li>
                  <li>
                    <strong>OpenStates.org:</strong> State legislature information and voting records
                  </li>
                  <li>
                    <strong>GDELT Project:</strong> News aggregation for representative-related current events
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Open Source</h2>
              <p className="text-gray-700">
                CIV.IQ is an open-source project. We believe civic technology should be transparent and collaborative. 
                Visit our <a href="https://github.com/Sandford28/civiq" className="text-civiq-blue hover:underline" target="_blank" rel="noopener noreferrer">GitHub repository</a> to 
                contribute or learn more about our technology.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Contact</h2>
              <p className="text-gray-700">
                Have questions, suggestions, or found an issue? We'd love to hear from you. 
                This is a public utility project designed to strengthen democratic participation.
              </p>
              <div className="mt-6 flex gap-4">
                <a 
                  href="https://github.com/Sandford28/civiq/issues" 
                  className="bg-gray-900 text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Report an Issue
                </a>
                <a 
                  href="https://github.com/Sandford28/civiq" 
                  className="bg-civiq-blue text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
