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

  return (
    <footer
      className={`${isDark ? 'bg-gray-900 text-white' : 'border-t border-gray-200'} ${className}`}
    >
      <div className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 py-grid-4 sm:py-grid-6">
        {/* Legal Links */}
        <div className="flex flex-wrap justify-center gap-x-grid-3 gap-y-grid-1 text-xs sm:text-sm">
          <Link
            href="/about"
            className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`}
          >
            About
          </Link>
          <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>•</span>
          <Link
            href="/privacy"
            className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`}
          >
            Privacy Policy
          </Link>
          <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>•</span>
          <Link
            href="/terms"
            className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`}
          >
            Terms of Service
          </Link>
          <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>•</span>
          <Link
            href="/disclaimer"
            className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-civiq-blue'} transition-colors underline`}
          >
            Disclaimer
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
