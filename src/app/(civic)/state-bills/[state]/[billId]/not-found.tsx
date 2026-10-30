/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { NotFoundHybrid } from '@/components/system/NotFoundHybrid';

// A title for the page that doesn't exist, not the one asked for. robots:
// null drops any robots a layout sets; Next.js adds noindex to a 404.
export const metadata: Metadata = {
  title: 'State bill not found',
  description: 'Open States has no bill with this ID.',
  robots: null,
};

export default function NotFound() {
  return <NotFoundHybrid />;
}
