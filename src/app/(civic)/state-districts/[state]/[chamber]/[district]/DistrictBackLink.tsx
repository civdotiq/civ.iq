'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home } from 'lucide-react';

/**
 * Breadcrumb back link. Reads ?address= / ?from= on the client so the page
 * itself stays cacheable (reading searchParams on the server forces a
 * per-request render).
 */
export default function DistrictBackLink({
  stateCode,
  stateName,
}: {
  stateCode: string;
  stateName: string;
}) {
  const searchParams = useSearchParams();
  const fromAddress = searchParams.get('address') || searchParams.get('from');

  return (
    <Link
      href={
        fromAddress
          ? `/representatives?address=${encodeURIComponent(fromAddress)}`
          : `/state-legislature/${stateCode}`
      }
      className="inline-flex items-center gap-2 text-civiq-blue hover:text-civiq-blue transition-colors"
    >
      <Home className="w-4 h-4" />
      <span>
        {fromAddress ? 'Back to All Representatives' : `Back to ${stateName} Legislature`}
      </span>
    </Link>
  );
}
