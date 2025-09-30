/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * SiteHeader - Systematic logo placement following Ulm School principles
 * - Fixed 64px height (8px grid multiple)
 * - 2px black border bottom (Aicher's Lufthansa approach)
 * - Logo positioned with 16px padding (grid-aligned)
 * - Functions as navigation home link
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function SiteHeader() {
  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-grid-2 h-16 flex items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="CIV.IQ Home"
        >
          <Image
            src="/images/civiq-logo.png"
            alt="CIV.IQ Logo"
            width={48}
            height={48}
            className="w-12 h-12 md:w-12 md:h-12"
            priority
          />
          <span className="aicher-heading text-xl md:text-2xl text-gray-900 tracking-aicher">
            CIV.IQ
          </span>
        </Link>
      </div>
    </header>
  );
}
