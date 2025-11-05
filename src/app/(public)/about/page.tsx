import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="min-h-screen aicher-background">
      <div className="max-w-4xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-grid-4 sm:mb-grid-6">
          <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <Image
              src="/images/civiq-logo.png"
              alt="CIV.IQ Logo"
              width={80}
              height={80}
              className="border-2 border-black mb-grid-2"
            />
            <div className="text-2xl font-bold text-civiq-red aicher-heading">CIV.IQ</div>
          </Link>
        </div>

        {/* Content */}
        <div className="aicher-card p-grid-3 sm:p-grid-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-grid-3 sm:mb-grid-4 aicher-heading">
            About CIV.IQ
          </h1>

          <div className="prose prose-gray max-w-none">
            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Our Mission
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ is a civic engagement platform dedicated to making government more accessible
                and transparent. We believe that informed citizens are essential to a healthy
                democracy.
              </p>
              <p className="text-gray-700 leading-relaxed">
                By aggregating real government data from official sources like Congress.gov, the
                Federal Election Commission, and the U.S. Census Bureau, we provide citizens with
                the tools they need to stay informed about their representatives and the legislative
                process.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Real Data, No Guesswork
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                We are committed to data integrity. Every piece of information on CIV.IQ comes
                directly from official government APIs:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Congressional data from Congress.gov API</li>
                <li>Campaign finance from Federal Election Commission</li>
                <li>Demographic data from U.S. Census Bureau</li>
                <li>State legislature data from OpenStates</li>
                <li>News from verified sources like NewsAPI and Google News</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Open Source & Transparent
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ is built with transparency in mind. Our platform is open source, and we
                welcome contributions from developers and civic-minded individuals who want to help
                improve government accessibility.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Have questions, feedback, or want to contribute? Reach out to us through our GitHub
                repository or contact our team directly.
              </p>
            </section>
          </div>

          {/* Back to Home */}
          <div className="mt-grid-6 pt-grid-4 border-t border-gray-200 text-center">
            <Link
              href="/"
              className="inline-block px-grid-3 py-grid-2 bg-civiq-blue text-white font-semibold aicher-border hover:opacity-90 transition-opacity"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
