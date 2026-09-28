/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { NextRequest } from 'next/server';

/** True when the request carries `Authorization: Bearer ${CRON_SECRET}`. */
export function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`;
}
