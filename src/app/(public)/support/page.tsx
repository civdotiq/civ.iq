import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get help with CIV.IQ: contact us with questions, data corrections, bug reports, or questions about the public API and MCP server.',
  alternates: { canonical: 'https://civdotiq.org/support' },
};

export default function SupportPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Support', url: 'https://civdotiq.org/support' },
        ]}
      />
      <div className="min-h-screen aicher-background">
        <div className="max-w-4xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2">&rsaquo;</span>
            <span className="font-medium text-gray-900">Support</span>
          </nav>

          {/* Logo */}
          <div className="flex flex-col items-center mb-grid-4 sm:mb-grid-6">
            <Link
              href="/"
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
            >
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
              Support
            </h1>

            <p className="text-gray-700 leading-relaxed mb-grid-4">
              CIV.IQ is a free, nonpartisan tool that presents U.S. congressional data from official
              government sources. If you need help, spot an error, or have a question about the
              data, we want to hear from you.
            </p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Contact us
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Email{' '}
                  <a href="mailto:contact@civdotiq.org" className="text-civiq-blue hover:underline">
                    contact@civdotiq.org
                  </a>{' '}
                  and we will get back to you. This inbox is monitored, and we typically respond
                  within a few business days.
                </p>
              </section>

              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  What we can help with
                </h2>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                  <li>Questions about how to find a representative, vote, bill, or district</li>
                  <li>Data corrections and questions about a specific figure or record</li>
                  <li>Bug reports and pages that are not loading correctly</li>
                  <li>Questions about the public API and MCP server for developers and agents</li>
                </ul>
              </section>

              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Reporting a data correction
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Every figure on CIV.IQ is drawn from an official government source and cited so
                  you can check it yourself. If a number looks wrong, include the page URL and what
                  you expected to see. We will trace it back to the source record and correct any
                  error on our side.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  More information
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  See our{' '}
                  <Link href="/about" className="text-civiq-blue hover:underline">
                    About
                  </Link>
                  ,{' '}
                  <Link href="/privacy" className="text-civiq-blue hover:underline">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="/terms" className="text-civiq-blue hover:underline">
                    Terms of Service
                  </Link>{' '}
                  pages.
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
    </>
  );
}
