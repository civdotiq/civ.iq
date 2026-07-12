/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your representatives',
  description:
    'Your federal and state representatives, found from your home address: contact information, committees, voting records, and campaign finance.',
  robots: { index: false, follow: true },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
