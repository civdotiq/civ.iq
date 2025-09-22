/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" />
      </svg>
      <span className="ml-2 text-lg font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

export default function RepresentativeNotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center">
              <CiviqLogo />
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/representatives" className="text-sm text-gray-600 hover:text-gray-900">
                All Representatives
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* 404 Icon */}
          <div className="mx-auto flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title and Description */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Representative Not Found</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            We couldn&apos;t find the representative you&apos;re looking for. This could be because:
          </p>

          {/* Reasons List */}
          <div className="bg-white rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto shadow-sm">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-civiq-red mr-2">•</span>
                The Bioguide ID is incorrect or doesn&apos;t exist
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2">•</span>
                The representative is not currently serving in the 119th Congress
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2">•</span>
                There may be a temporary issue with our data sources
              </li>
              <li className="flex items-start">
                <span className="text-civiq-red mr-2">•</span>
                The URL might have been typed incorrectly
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/representatives"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-civiq-blue hover:bg-civiq-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-civiq-blue transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Browse All Representatives
            </Link>

            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-civiq-blue transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go to Homepage
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-12 text-sm text-gray-500">
            <p>
              Need help finding a specific representative?{' '}
              <Link href="/representatives" className="text-civiq-blue hover:text-civiq-blue/80">
                Try our search feature
              </Link>{' '}
              or{' '}
              <Link href="/" className="text-civiq-blue hover:text-civiq-blue/80">
                search by ZIP code
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
