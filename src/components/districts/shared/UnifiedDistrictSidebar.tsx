/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

/**
 * Navigation link interface for flexible sidebar links
 */
interface NavLink {
  href: string;
  label: string;
}

/**
 * District info for state-level pages
 */
interface DistrictInfo {
  state: string;
  district: string;
  chamber: string;
}

interface UnifiedDistrictSidebarProps {
  // Optional representative info (federal pages)
  representativeName?: string;
  representativeLink?: string;

  // Optional district info (state pages)
  districtInfo?: DistrictInfo;

  // Optional geographic data
  counties?: string[];
  majorCities?: string[];

  // Navigation links
  quickLinks: NavLink[];
}

/**
 * Unified District Sidebar Component
 *
 * Flexible sidebar that works for both federal and state district pages.
 * Displays:
 * - District info (state pages)
 * - Representative link (federal pages)
 * - Counties and cities (both, when available)
 * - Quick navigation links (both)
 */
export default function UnifiedDistrictSidebar({
  representativeName,
  representativeLink,
  districtInfo,
  counties = [],
  majorCities = [],
  quickLinks,
}: UnifiedDistrictSidebarProps) {
  return (
    <div className="space-y-6">
      {/* District Info Card (State Pages) */}
      {districtInfo && (
        <div className="bg-blue-50 border-2 border-blue-200 p-6">
          <h3 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wide">
            District Info
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-700">State:</span>{' '}
              <span className="text-gray-900">{districtInfo.state}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">District:</span>{' '}
              <span className="text-gray-900">{districtInfo.district}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Chamber:</span>{' '}
              <span className="text-gray-900">{districtInfo.chamber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Facts Card (Federal Pages + Enhanced State Pages) */}
      <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Facts</h3>

        <div className="space-y-4">
          {/* Representative Link (Federal) */}
          {representativeName && representativeLink && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Representative</h4>
              <Link
                href={representativeLink}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {representativeName}
              </Link>
            </div>
          )}

          {/* Counties */}
          {counties.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Major Counties</h4>
              <div className="text-sm text-gray-600">
                {counties.slice(0, 3).join(', ')}
                {counties.length > 3 && ` and ${counties.length - 3} more`}
              </div>
            </div>
          )}

          {/* Cities */}
          {majorCities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Major Cities</h4>
              <div className="text-sm text-gray-600">
                {majorCities.slice(0, 3).join(', ')}
                {majorCities.length > 3 && ` and ${majorCities.length - 3} more`}
              </div>
            </div>
          )}

          {/* Quick Links */}
          {quickLinks.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Links</h4>
              <div className="space-y-2">
                {quickLinks.map((link, index) => (
                  <Link
                    key={index}
                    href={link.href}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
