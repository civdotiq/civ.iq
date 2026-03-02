/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Follow the Money | CIV.IQ',
  description:
    'Search any PAC, Super PAC, or political committee to see who they fund in Congress. All data from FEC.gov.',
};

export default function InfluenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
