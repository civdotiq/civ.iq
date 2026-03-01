/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Embed Documentation Page
 * Copy-paste embed codes for CIV.IQ widgets.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Embeddable Widgets | CIV.IQ',
  description:
    'Embed CIV.IQ civic data widgets on your website. District representatives, bill trackers, and district snapshots — free, no API key required.',
};

const BASE_URL = 'https://civdotiq.org';

interface WidgetDoc {
  name: string;
  description: string;
  path: string;
  params: { name: string; description: string; example: string }[];
  exampleUrl: string;
}

const WIDGETS: WidgetDoc[] = [
  {
    name: 'District Representatives',
    description:
      'Shows all federal representatives (senators + House member) for a given congressional district.',
    path: '/embed/reps/{districtId}',
    params: [
      {
        name: 'districtId',
        description: 'State abbreviation + district number (e.g., MI-12, CA-04, AK-AL)',
        example: 'MI-12',
      },
    ],
    exampleUrl: `${BASE_URL}/embed/reps/MI-12`,
  },
  {
    name: 'Bill Status Tracker',
    description:
      'Shows the current status of a bill with a visual progress bar from introduction to enactment.',
    path: '/embed/bill/{billId}',
    params: [
      {
        name: 'billId',
        description: 'Bill ID in congress-type-number format (e.g., 119-hr-1, 119-s-100)',
        example: '119-hr-1',
      },
    ],
    exampleUrl: `${BASE_URL}/embed/bill/119-hr-1`,
  },
  {
    name: 'District Snapshot',
    description:
      'Shows a compact overview of a congressional district: representative, demographics, and geography.',
    path: '/embed/district/{districtId}',
    params: [
      {
        name: 'districtId',
        description: 'State abbreviation + district number (e.g., MI-12, CA-04)',
        example: 'MI-12',
      },
    ],
    exampleUrl: `${BASE_URL}/embed/district/MI-12`,
  },
];

function generateIframeCode(widget: WidgetDoc): string {
  return `<iframe
  src="${widget.exampleUrl}"
  width="100%"
  height="300"
  frameborder="0"
  style="border: 2px solid #e5e7eb; max-width: 480px;"
  title="CIV.IQ ${widget.name}"
></iframe>`;
}

const RESIZE_SCRIPT = `<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'civiq-embed-resize') {
      var iframes = document.querySelectorAll('iframe[src*="civdotiq.org/embed"]');
      iframes.forEach(function(iframe) {
        if (iframe.contentWindow === e.source) {
          iframe.style.height = e.data.height + 'px';
        }
      });
    }
  });
</script>`;

export default function EmbedDocsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span className="mx-2">&rsaquo;</span>
        <span className="font-medium text-gray-900">Embeddable Widgets</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">Embeddable Widgets</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Embed live civic data on your website using iframes. All widgets are free, require no API
        key, and update automatically with real government data.
      </p>

      {/* Auto-resize section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Auto-Resizing</h2>
        <p className="text-gray-600 mb-4">
          Widgets send their height via{' '}
          <code className="text-sm bg-gray-100 px-1">postMessage</code>. Add this script to your
          page for automatic iframe resizing:
        </p>
        <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black mb-4">
          <code>{RESIZE_SCRIPT}</code>
        </pre>
      </section>

      {/* Widget docs */}
      {WIDGETS.map((widget, index) => (
        <section key={widget.name} className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {index + 1}. {widget.name}
          </h2>
          <p className="text-gray-600 mb-4">{widget.description}</p>

          {/* Parameters */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Parameters
          </h3>
          <table className="w-full mb-4 text-sm border-2 border-black">
            <thead>
              <tr className="bg-black text-white">
                <th className="text-left p-2 font-semibold">Parameter</th>
                <th className="text-left p-2 font-semibold">Description</th>
                <th className="text-left p-2 font-semibold">Example</th>
              </tr>
            </thead>
            <tbody>
              {widget.params.map(param => (
                <tr key={param.name} className="border-t border-gray-200">
                  <td className="p-2 font-mono text-sm">{param.name}</td>
                  <td className="p-2 text-gray-600">{param.description}</td>
                  <td className="p-2 font-mono text-sm">{param.example}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* URL */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">URL</h3>
          <pre className="bg-gray-100 p-3 mb-4 text-sm overflow-x-auto border border-gray-200">
            <code>{`${BASE_URL}${widget.path}`}</code>
          </pre>

          {/* Embed code */}
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Embed Code
          </h3>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black">
            <code>{generateIframeCode(widget)}</code>
          </pre>
        </section>
      ))}

      {/* Usage notes */}
      <section className="mb-12 border-t-2 border-black pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Notes</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
          <li>Widgets are delivered via iframe for complete style isolation.</li>
          <li>All data comes from official government APIs (Congress.gov, Census Bureau).</li>
          <li>Widgets are server-rendered and cached for 24 hours.</li>
          <li>No JavaScript SDK or API key required.</li>
          <li>
            Set <code className="bg-gray-100 px-1">width=&quot;100%&quot;</code> for responsive
            behavior.
          </li>
          <li>
            For questions or issues, contact us at{' '}
            <a href="https://github.com/civdotiq" className="text-[#3ea2d4] hover:underline">
              github.com/civdotiq
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
