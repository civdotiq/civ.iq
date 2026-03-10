/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Money Report Card',
  description:
    "Enter your address to see how campaign money connects to your representatives' voting records.",
};

export default function MoneyReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
