/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

interface SiteFooterProps {
  /** Optional variant for different page contexts */
  variant?: 'light' | 'dark';
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Shared site footer with developer links, open protocols, and legal links.
 * Should appear on every page for consistent navigation and legal compliance.
 */
export function SiteFooter({ variant = 'light', className = '' }: SiteFooterProps) {
  const isDark = variant === 'dark';
  const linkClass = `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`;
  const labelClass = isDark ? 'text-gray-500' : 'text-gray-400';

  return (
    <footer
      className={`${isDark ? 'bg-gray-900 text-white' : 'border-t border-gray-200'} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 py-grid-4 sm:py-grid-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-grid-4 sm:gap-grid-6">
          {/* Platform */}
          <div>
            <h3
              className={`text-[11px] uppercase tracking-[0.08em] font-medium ${labelClass} mb-grid-2`}
            >
              Platform
            </h3>
            <ul className="space-y-grid-1 text-xs sm:text-sm">
              <li>
                <Link href="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/education" className={linkClass}>
                  Education
                </Link>
              </li>
              <li>
                <Link href="/glossary" className={linkClass}>
                  Glossary
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3
              className={`text-[11px] uppercase tracking-[0.08em] font-medium ${labelClass} mb-grid-2`}
            >
              Developers
            </h3>
            <ul className="space-y-grid-1 text-xs sm:text-sm">
              <li>
                <Link href="/docs/api" className={linkClass}>
                  Public API
                </Link>
              </li>
              <li>
                <Link href="/developers#mcp" className={linkClass}>
                  MCP Server
                </Link>
              </li>
              <li>
                <Link href="/developers#sdk" className={linkClass}>
                  TypeScript SDK
                </Link>
              </li>
              <li>
                <Link href="/embed-docs" className={linkClass}>
                  Embed Widgets
                </Link>
              </li>
              <li>
                <a href="/openapi.json" className={linkClass}>
                  OpenAPI Spec
                </a>
              </li>
              <li>
                <Link href="/developers#bulk-data" className={linkClass}>
                  Bulk Data
                </Link>
              </li>
              <li>
                <Link href="/open" className={linkClass}>
                  Open Data
                </Link>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/org/civiq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  npm Packages
                </a>
              </li>
            </ul>
          </div>

          {/* Open Protocols */}
          <div>
            <h3
              className={`text-[11px] uppercase tracking-[0.08em] font-medium ${labelClass} mb-grid-2`}
            >
              Open Protocols
            </h3>
            <ul className="space-y-grid-1 text-xs sm:text-sm">
              <li>
                <a
                  href="https://github.com/civdotiq/civ.iq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/feeds/bills" className={linkClass}>
                  RSS Feeds
                </Link>
              </li>
              <li>
                <a
                  href="https://njump.me/civiq@civdotiq.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Nostr
                </a>
              </li>
              <li>
                <span className={linkClass}>Fediverse</span>
              </li>
              <li>
                <a href="/llms.txt" className={linkClass}>
                  llms.txt
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3
              className={`text-[11px] uppercase tracking-[0.08em] font-medium ${labelClass} mb-grid-2`}
            >
              Legal
            </h3>
            <ul className="space-y-grid-1 text-xs sm:text-sm">
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className={linkClass}>
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <p
          className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center mt-grid-4 pt-grid-3 ${isDark ? 'border-t border-gray-800' : 'border-t border-gray-200'}`}
        >
          © {new Date().getFullYear()} CIV.IQ. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
