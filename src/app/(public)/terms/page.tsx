import Link from 'next/link';
import Image from 'next/image';

export default function TermsPage() {
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
            Terms of Service
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
                Acceptance of Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using CIV.IQ, you agree to be bound by these Terms of Service and
                all applicable laws and regulations. If you do not agree with any of these terms,
                you are prohibited from using or accessing this site.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Use License
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                Permission is granted to temporarily access CIV.IQ for personal, non-commercial use
                only. This license does not include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for commercial purposes</li>
                <li>Attempting to reverse engineer any software</li>
                <li>Removing copyright or proprietary notations</li>
                <li>Transferring the materials to another person</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Data and Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                CIV.IQ aggregates data from official government sources including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-3">
                <li>Congress.gov API</li>
                <li>Federal Election Commission (FEC)</li>
                <li>U.S. Census Bureau</li>
                <li>OpenStates</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                While we strive for accuracy, we cannot guarantee the completeness or accuracy of
                information provided. Users should verify critical information with official
                sources.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Disclaimer
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                The materials on CIV.IQ are provided on an &ldquo;as is&rdquo; basis. CIV.IQ makes
                no warranties, expressed or implied, and hereby disclaims and negates all other
                warranties including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Implied warranties of merchantability and fitness for a particular purpose</li>
                <li>Non-infringement of intellectual property or other violation of rights</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Limitations
              </h2>
              <p className="text-gray-700 leading-relaxed">
                In no event shall CIV.IQ or its suppliers be liable for any damages arising out of
                the use or inability to use the materials on CIV.IQ, even if CIV.IQ has been
                notified of the possibility of such damage.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                User Conduct
              </h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>Use the platform for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the platform or servers</li>
                <li>Collect or harvest personal data of other users</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Intellectual Property
              </h2>
              <p className="text-gray-700 leading-relaxed">
                The platform design, logo, and original content are owned by CIV.IQ and protected by
                copyright laws. Government data presented on the platform is public domain.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Modifications to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ may revise these terms of service at any time without notice. By using this
                platform, you agree to be bound by the current version of these Terms of Service.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Governing Law
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at
                contact@civdotiq.org.
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
