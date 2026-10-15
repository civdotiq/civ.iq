/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Accessibility statement',
  description:
    'CIV.IQ targets WCAG 2.2 Level AA and does not meet it yet. How the site was tested, the problems we know about, and how to report a barrier.',
  alternates: { canonical: 'https://civdotiq.org/accessibility' },
};

const ISSUE_FORM_URL = 'https://github.com/civdotiq/civ.iq/issues/new?template=accessibility.yml';

// Mirrors the "Known issues" table in ACCESSIBILITY.md. Update both together.
const KNOWN_ISSUES: ReadonlyArray<{
  title: string;
  detail: string;
  criterion: string;
  where: string;
}> = [
  {
    title: 'Low-contrast text',
    detail:
      'The blue used for links, breadcrumbs, tabs and buttons has a 2.86:1 contrast ratio on white; Level AA needs 4.5:1 for normal text. It accounts for 263 of the 593 failing elements. Light gray captions, white text on blue buttons, amber warning text and party labels on tinted backgrounds also fall short.',
    criterion: '1.4.3 Contrast (Minimum), AA',
    where: 'Every page tested',
  },
  {
    title: 'Links inside text are shown by color alone',
    detail:
      'Source links and "See methodology" links have no underline, and their color is too close to the surrounding text.',
    criterion: '1.4.1 Use of Color, A',
    where: 'Home, representative profile, district, address lookup results',
  },
  {
    title: 'ARIA attribute not allowed',
    detail:
      'The search box in the site header sets aria-expanded without a combobox role, so screen readers may misreport it. A dropdown container on some pages has the same problem.',
    criterion: '4.1.2 Name, Role, Value, A',
    where: 'Every page tested',
  },
  {
    title: 'Demographic bar labels are unreliable',
    detail:
      'The race and ethnicity bars put labels on plain elements that screen readers may ignore.',
    criterion: '4.1.2 Name, Role, Value, A',
    where: 'District pages',
  },
  {
    title: 'Location status is not announced',
    detail:
      'After "Use my location" is pressed, "Finding your location…" appears inside the button but is not in a live region, so screen readers may not read it.',
    criterion: '4.1.3 Status Messages, AA',
    where: 'Home page search',
  },
  {
    title: 'Spinner keeps moving when reduced motion is on',
    detail:
      'The loading spinner ignores the reduced-motion setting. This is beyond our AA target and is listed for completeness.',
    criterion: '2.3.3 Animation from Interactions, AAA',
    where: 'Home page search',
  },
];

const linkClass = 'text-black underline underline-offset-2 hover:text-civiq-blue';
const h2Class = 'text-xl sm:text-2xl font-semibold text-black mb-grid-2 aicher-heading';

export default function AccessibilityPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Accessibility', url: 'https://civdotiq.org/accessibility' },
        ]}
      />
      <div className="min-h-screen aicher-background">
        <div className="max-w-4xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-600 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              &rsaquo;
            </span>
            <span className="font-medium text-gray-900">Accessibility</span>
          </nav>

          <div className="aicher-card p-grid-3 sm:p-grid-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-black mb-grid-3 sm:mb-grid-4 aicher-heading">
              Accessibility statement
            </h1>

            <p className="text-sm text-gray-600 mb-grid-4">Last tested: October 15, 2026</p>

            <section className="mb-grid-4">
              <p className="text-gray-700 leading-relaxed">
                CIV.IQ should work for everyone, including people who use a screen reader, a
                keyboard instead of a mouse, browser zoom, or high-contrast settings.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className={h2Class}>Target</h2>
              <p className="text-gray-700 leading-relaxed">
                Our target is{' '}
                <a href="https://www.w3.org/TR/WCAG22/" className={linkClass}>
                  WCAG 2.2
                </a>{' '}
                Level AA. <strong>The site does not meet that target yet.</strong> The problems we
                know about are listed below. We will not claim conformance until a test shows it.
              </p>
            </section>

            <section className="mb-grid-4">
              <h2 className={h2Class}>How we tested</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>
                  <strong>Automated scan.</strong> axe-core 4.13.0, WCAG 2.0, 2.1 and 2.2 Level A
                  and AA rules, in Chrome at 1280px wide, on the live site. We scanned the home
                  page, a representative profile, a bill, a district, a state, the developer page,
                  and the results of a full-address lookup.
                </li>
                <li>
                  <strong>Keyboard and screen-reader tests.</strong> The project&apos;s automated
                  browser tests. Most failures came from out-of-date tests; two point to real
                  problems, listed below.
                </li>
                <li>
                  <strong>Not yet done.</strong> Automated tools catch only part of what matters.
                  There has been no full manual audit and no testing with screen-reader users.
                </li>
              </ul>
            </section>

            <section className="mb-grid-4">
              <h2 className={h2Class}>Known issues</h2>
              <ol className="space-y-grid-2">
                {KNOWN_ISSUES.map((issue, i) => (
                  <li key={issue.title} className="border-l-2 border-gray-300 pl-grid-2">
                    <p className="font-semibold text-black">
                      {i + 1}. {issue.title}
                    </p>
                    <p className="text-gray-700 leading-relaxed">{issue.detail}</p>
                    <p className="text-sm text-gray-600 mt-grid-1">
                      WCAG {issue.criterion} · {issue.where}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mb-grid-4">
              <h2 className={h2Class}>Report a problem</h2>
              <p className="text-gray-700 leading-relaxed mb-grid-2">
                If something on CIV.IQ stops you from using it, please tell us:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-grid-1 ml-grid-2">
                <li>
                  <a href={ISSUE_FORM_URL} className={linkClass}>
                    Open an accessibility issue
                  </a>{' '}
                  on GitHub, or
                </li>
                <li>
                  email{' '}
                  <a href="mailto:contact@civdotiq.org" className={linkClass}>
                    contact@civdotiq.org
                  </a>{' '}
                  if you do not use GitHub.
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-grid-2">
                Please include the page address and, if you can, the browser and assistive
                technology you use.
              </p>
            </section>

            <section>
              <h2 className={h2Class}>Updates</h2>
              <p className="text-gray-700 leading-relaxed">
                When an issue is fixed or a new test is run, this page and the date above are
                updated. The same statement is kept in the project repository as{' '}
                <a
                  href="https://github.com/civdotiq/civ.iq/blob/main/ACCESSIBILITY.md"
                  className={linkClass}
                >
                  ACCESSIBILITY.md
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
