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
 * Shared site footer with legal links and copyright.
 * Should appear on every page for consistent navigation and legal compliance.
 */
export function SiteFooter({ variant = 'light', className = '' }: SiteFooterProps) {
  const isDark = variant === 'dark';
  const linkClass = `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`;
  const separatorClass = isDark ? 'text-gray-600' : 'text-gray-400';

  return (
    <footer
      className={`${isDark ? 'bg-gray-900 text-white' : 'border-t border-gray-200'} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 py-grid-4 sm:py-grid-6">
        {/* Open Protocols */}
        <div className="flex flex-wrap justify-center gap-x-grid-3 gap-y-grid-1 text-xs sm:text-sm mb-grid-2">
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Open Protocols:</span>
          <Link href="/feeds/bills" className={linkClass}>
            RSS Feeds
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/api/v1" className={linkClass}>
            Public API
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/embed-docs" className={linkClass}>
            Embed Widgets
          </Link>
          <span className={separatorClass}>•</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nostr civiq@civ.iq</span>
          <span className={separatorClass}>•</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Fediverse @civiq@civ.iq
          </span>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap justify-center gap-x-grid-3 gap-y-grid-1 text-xs sm:text-sm">
          <Link href="/about" className={linkClass}>
            About
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/glossary" className={linkClass}>
            Glossary
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/education" className={linkClass}>
            Education
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/open" className={linkClass}>
            Open Data
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/disclaimer" className={linkClass}>
            Disclaimer
          </Link>
          <span className={separatorClass}>•</span>
          <Link href="/transparency/reading-levels" className={linkClass}>
            Reading Level Compliance
          </Link>
        </div>

        {/* Copyright */}
        <p
          className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center mt-grid-2`}
        >
          © {new Date().getFullYear()} CIV.IQ. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
