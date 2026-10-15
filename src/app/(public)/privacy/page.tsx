import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'CIV.IQ privacy policy: no accounts, no data sale, and addresses are never logged. What data the site handles and who else sees it.',
  alternates: { canonical: 'https://civdotiq.org/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Privacy Policy', url: 'https://civdotiq.org/privacy' },
        ]}
      />
      <div className="min-h-screen aicher-background">
        <div className="max-w-4xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2">&rsaquo;</span>
            <span className="font-medium text-gray-900">Privacy Policy</span>
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
              Privacy Policy
            </h1>

            <p className="text-sm text-gray-500 mb-grid-4">Last updated: October 15, 2026</p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Our commitment
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  CIV.IQ is a free, open-source civic utility. It exists to make government data
                  easy to use, not to collect data about you. This page lists everything the site
                  handles, and who else sees it.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  What we do not collect
                </h2>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                  <li>
                    <strong>No accounts.</strong> There is no registration, login or user profile.
                  </li>
                  <li>
                    <strong>No address database.</strong> Your address is never saved with anything
                    that identifies you, and it is never written to our logs.
                  </li>
                  <li>
                    <strong>No selling or sharing of data</strong> for advertising or any other
                    purpose.
                  </li>
                </ul>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Address lookups
                </h2>
                <p className="text-gray-700 leading-relaxed mb-grid-2">
                  When you enter your address to find your representatives:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                  <li>
                    As you type, the address box sends what you have typed to Radar.io to suggest
                    complete addresses.
                  </li>
                  <li>
                    When you search, your address goes to the U.S. Census Bureau Geocoder, which
                    returns your congressional and state legislative districts.
                  </li>
                  <li>
                    Our servers log at most the city and state of a lookup, never the street
                    address.
                  </li>
                  <li>
                    To make repeat lookups fast, the district result is cached for up to 7 days
                    under a one-way hash of the address. The cache is not linked to you, because
                    CIV.IQ has no accounts or user IDs.
                  </li>
                </ul>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Site search
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Text you type into the site search boxes is sent as part of the page address (the
                  URL). Our hosting provider’s request logs record URLs, so a search you type there
                  can appear in those logs. To keep a home address out of them, use the address
                  lookup on the home page instead.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Email alerts and the weekly digest
                </h2>
                <p className="text-gray-700 leading-relaxed mb-grid-2">
                  These are the only features that store personal information. If you sign up:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                  <li>
                    We store your email address, what you chose to follow and when you signed up.
                    Records are kept in our database (Upstash Redis) under a one-way hash of your
                    email.
                  </li>
                  <li>
                    You must confirm by email. If you don’t confirm within 48 hours, the sign-up is
                    deleted.
                  </li>
                  <li>
                    Emails are sent through Resend. Every email has a one-click unsubscribe link,
                    and unsubscribing deletes your record.
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  We use your email address only to send what you signed up for.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Server logs and hosting
                </h2>
                <p className="text-gray-700 leading-relaxed mb-grid-2">
                  CIV.IQ runs on Vercel. Like any web host, Vercel keeps request logs for a limited
                  time. They may include:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                  <li>Your IP address</li>
                  <li>The pages and URLs requested, and when</li>
                  <li>Your browser and device type</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  To prevent abuse, our rate limiter counts requests per IP address. Each count
                  expires after one minute. We also use Vercel Web Analytics, which counts page
                  views without cookies.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Analytics (Google Analytics)
                </h2>
                <p className="text-gray-700 leading-relaxed mb-grid-2">
                  We use <strong>Google Analytics</strong> to see how the site is used in aggregate.
                  Google Analytics sets cookies and may collect:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                  <li>The pages you visit and how long you stay</li>
                  <li>Your approximate location (city or region)</li>
                  <li>Your device type, browser and operating system</li>
                  <li>How you arrived at the site</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-grid-2">You can opt out by:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2 mb-grid-2">
                  <li>
                    Installing the{' '}
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-civiq-blue hover:underline"
                    >
                      Google Analytics opt-out browser add-on
                    </a>
                  </li>
                  <li>
                    Blocking cookies or analytics scripts in your browser. The site works the same
                    without them.
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  For more information, see{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civiq-blue hover:underline"
                  >
                    Google’s privacy policy
                  </a>
                  .
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Stored on your device
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Your browser saves a few things locally: your light or dark theme, your recent
                  searches, your last-viewed district, and error details if a page breaks. They stay
                  on your device and are never sent to us. Clearing your browser’s site data removes
                  them.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Data security
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  All connections to CIV.IQ use HTTPS. The only personal data we keep is subscriber
                  email addresses. No system is perfectly secure, but there is very little here to
                  expose.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Your rights
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  If you subscribed to alerts or the digest, the unsubscribe link deletes your
                  record. You can also email us to have it deleted. For anything else, including
                  questions about server logs, contact us.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Children’s privacy
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  CIV.IQ is a public civic information site, suitable for all ages. We do not
                  knowingly collect personal information from children.
                </p>
              </section>
              <section className="mb-grid-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Changes to this policy
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  When this policy changes, we post the new version here and update the date at the
                  top.
                </p>
              </section>
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading">
                  Contact us
                </h2>
                <p className="text-gray-700 leading-relaxed mb-grid-2">
                  Questions about this policy:
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
    </>
  );
}
