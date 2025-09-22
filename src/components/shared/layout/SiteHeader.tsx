/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="aicher-card aicher-no-radius sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <Link href="/" className="inline-flex items-center gap-2 aicher-hover transition-opacity">
          <span className="aicher-heading text-xl text-gray-900">CIV.IQ</span>
        </Link>
      </div>
    </header>
  );
}
