import Link from 'next/link';
import Image from 'next/image';

export default function DisclaimerPage() {
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
            Disclaimer
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
                Purpose of This Service
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ is a <strong>civic information utility</strong> &mdash; like a digital
                phonebook for government. We provide easy access to public information about
                federal, state, and local representatives.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>What we are:</strong> An informational tool that presents publicly available
                civic data in an easy-to-understand format.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>What we are NOT:</strong> A political advocacy platform, a voting guide, a
                news organization, or a source of legal or political advice.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Information Accuracy and Sources
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                All data on CIV.IQ comes directly from official government APIs and public sources:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-3">
                <li>
                  Congressional data:{' '}
                  <a
                    href="https://api.congress.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Congress.gov API
                  </a>{' '}
                  (Library of Congress)
                </li>
                <li>
                  Campaign finance:{' '}
                  <a
                    href="https://www.fec.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Federal Election Commission (FEC)
                  </a>
                </li>
                <li>
                  Demographics:{' '}
                  <a
                    href="https://www.census.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    U.S. Census Bureau
                  </a>
                </li>
                <li>
                  State legislatures:{' '}
                  <a
                    href="https://openstates.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Open States API
                  </a>{' '}
                  (
                  <a
                    href="https://docs.openstates.org/api-v3/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    API Documentation
                  </a>
                  )
                </li>
                <li>
                  News articles:{' '}
                  <a
                    href="https://newsapi.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    NewsAPI
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://news.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Google News RSS feeds
                  </a>
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                While we make every effort to provide accurate and up-to-date information, we cannot
                guarantee:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>The completeness of data from government APIs</li>
                <li>Real-time accuracy if official sources are delayed or incorrect</li>
                <li>That all representatives have complete profiles or contact information</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Verify Critical Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                <strong>Always verify important information with official sources.</strong>
              </p>
              <p className="text-gray-700 leading-relaxed mb-grid-2">If you need to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Contact your representative officially &mdash; use their .gov website</li>
                <li>Check voting records or bill status &mdash; visit Congress.gov directly</li>
                <li>Verify campaign finance data &mdash; check FEC.gov</li>
                <li>Confirm district boundaries &mdash; consult your state election board</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Not Legal, Political, or Professional Advice
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ provides <strong>informational content only</strong>. Nothing on this
                platform constitutes:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Legal advice or representation</li>
                <li>Political endorsements or recommendations</li>
                <li>Professional guidance on voting or civic engagement</li>
                <li>Financial or investment advice related to campaign contributions</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                No Responsibility for Government API Errors
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ aggregates data from government APIs that are{' '}
                <strong>outside our control</strong>. If a government API:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Goes offline or experiences downtime</li>
                <li>Returns incorrect or outdated data</li>
                <li>Changes their data format without notice</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-grid-2">
                CIV.IQ is not responsible for those errors or omissions. We will display a
                &ldquo;Data unavailable&rdquo; message when we cannot retrieve information.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                No Endorsements or Political Bias
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ is a <strong>non-partisan civic utility</strong>. We do not endorse, support,
                or oppose any candidate, political party, or legislation. The inclusion of any
                representative, bill, or voting record is purely informational and does not imply
                any endorsement.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Service Availability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ is provided &ldquo;as-is&rdquo; and &ldquo;as-available.&rdquo; We do not
                guarantee:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Uninterrupted access to the platform</li>
                <li>Error-free operation</li>
                <li>That the service will meet your specific needs</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Third-Party Links
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ may contain links to external websites (e.g., .gov domains, news sources,
                social media profiles). We are not responsible for the content, accuracy, or privacy
                practices of these external sites.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                To the fullest extent permitted by law, CIV.IQ and its contributors shall not be
                liable for any damages arising from:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Use or inability to use this platform</li>
                <li>Reliance on information provided by government APIs</li>
                <li>Errors, omissions, or inaccuracies in displayed data</li>
                <li>Any actions taken based on information from this platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Questions or Concerns
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                If you have questions about this disclaimer or believe you have found inaccurate
                information, please contact us:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Through our GitHub repository (report an issue)</li>
                <li>
                  By mail: CIV.IQ c/o Mark Sandford, Detroit, Michigan, USA (see LICENSE file for
                  copyright holder)
                </li>
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
