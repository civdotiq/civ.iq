/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { NotFoundHybrid } from '@/components/system/NotFoundHybrid';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'There is no page at this address.',
};

export default function NotFound() {
  return <NotFoundHybrid />;
}
