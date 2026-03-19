/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="mb-8">
            <span className="text-8xl font-bold text-gray-200">404</span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="bg-white p-6 mb-8 text-left max-w-xl mx-auto border-2 border-black">
            <p className="text-sm font-bold text-gray-900 mb-3">Try one of these instead:</p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-civiq-red mr-2 font-bold">&bull;</span>
                <Link href="/" className="text-civiq-blue hover:text-civiq-blue/80">
                  Search by address
                </Link>
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2 font-bold">&bull;</span>
                <Link href="/representatives" className="text-civiq-blue hover:text-civiq-blue/80">
                  Browse all representatives
                </Link>
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2 font-bold">&bull;</span>
                <Link href="/committees" className="text-civiq-blue hover:text-civiq-blue/80">
                  Explore congressional committees
                </Link>
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2 font-bold">&bull;</span>
                <Link href="/legislation" className="text-civiq-blue hover:text-civiq-blue/80">
                  Track legislation
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 border-2 border-black text-base font-medium text-white bg-civiq-blue hover:bg-civiq-blue/90 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
