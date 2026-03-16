/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investigate — CIV.IQ',
  description:
    'Explore connections between legislators, donors, committees, and government contracts. Follow the money and trace influence through real government data.',
};

export default function InvestigateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
