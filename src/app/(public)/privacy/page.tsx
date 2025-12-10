import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>

          <p className="text-sm text-gray-500 mb-grid-4">
            Last Updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Our Commitment to Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ is a free, open-source civic utility. We are committed to protecting your
                privacy and minimizing data collection. This policy explains what data we handle and
                how.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                What We DO NOT Collect or Store
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>
                  <strong>No user accounts</strong> - We do not require registration or login
                </li>
                <li>
                  <strong>No stored addresses</strong> - Your address is never saved to any database
                </li>
                <li>
                  <strong>No email addresses</strong> - We have no newsletter or mailing list
                </li>
                <li>
                  <strong>No selling of data</strong> - We will never sell any information
                </li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                How Address Lookups Work
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                When you search by address to find your representatives:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Your address is sent directly to the U.S. Census Bureau Geocoding API</li>
                <li>
                  The Census API converts your address to geographic coordinates
                  (latitude/longitude)
                </li>
                <li>We use those coordinates to identify your congressional district</li>
                <li>
                  <strong>Your address is never stored by us</strong> - it exists only in memory
                  during the request
                </li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Temporary Server Logs
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                Our hosting provider (Vercel) maintains temporary server logs that may include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                <li>IP addresses</li>
                <li>Geographic coordinates from searches (not full addresses)</li>
                <li>Timestamps and pages visited</li>
                <li>Browser type and device information</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                These logs are automatically deleted after 24 hours and are only used for debugging
                and security purposes.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Third-Party Services
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ retrieves public data from the following government sources:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                <li>Congress.gov API (Library of Congress)</li>
                <li>Federal Election Commission (FEC) API</li>
                <li>U.S. Census Bureau Geocoding API</li>
                <li>OpenStates API (state legislatures)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                Your domain registrar (e.g., Cloudflare) may collect analytics data. Please review
                their privacy policies for details.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Analytics (Google Analytics)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                We use <strong>Google Analytics</strong> to understand how visitors use CIV.IQ. This
                helps us improve the site and ensure it serves citizens effectively.
              </p>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                Google Analytics may collect:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                <li>Pages you visit and how long you stay</li>
                <li>Your approximate geographic location (city/region level)</li>
                <li>Device type, browser, and operating system</li>
                <li>How you arrived at the site (search engine, direct link, etc.)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                Google Analytics uses cookies to track this information. You can opt out by:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                <li>
                  Installing the{' '}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>
                </li>
                <li>Using your browser&apos;s &ldquo;Do Not Track&rdquo; setting</li>
                <li>Blocking cookies in your browser settings</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                For more information, see{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:underline"
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Data Security
              </h2>
              <p className="text-gray-700 leading-relaxed">
                All connections to CIV.IQ use HTTPS encryption. Since we do not store personal data,
                there is minimal risk of data breach. However, no internet transmission is 100%
                secure.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Your Rights
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Since we do not collect or store personal information, there is no data to access,
                correct, or delete. If you have concerns about temporary server logs, please contact
                us.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Children&apos;s Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ is a public civic information utility suitable for all ages. We do not
                knowingly collect any personal information from anyone, including children.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. Changes will be posted on this
                page with an updated date. Continued use of CIV.IQ after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                If you have questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>By email: contact@civdotiq.org</li>
              </ul>
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
