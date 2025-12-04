/**
 * Client Component wrapper for delegation export button
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { ExportButton } from '@/shared/components/ui/ExportButton';
import { ExportColumn } from '@/lib/utils/data-export';

// Representative type for export
interface DelegationMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  website?: string;
  yearsInOffice?: number;
  nextElection?: string;
}

// Export columns for delegation data - defined in client component to allow format functions
const delegationExportColumns: ExportColumn<DelegationMember>[] = [
  { key: 'name', label: 'Name' },
  { key: 'chamber', label: 'Chamber' },
  { key: 'party', label: 'Party' },
  { key: 'district', label: 'District', format: v => (v ? String(v) : 'N/A (Senator)') },
  { key: 'title', label: 'Title' },
  { key: 'yearsInOffice', label: 'Years in Office', format: v => String(v ?? 'N/A') },
  { key: 'nextElection', label: 'Next Election', format: v => String(v ?? 'N/A') },
  { key: 'phone', label: 'Phone', format: v => String(v ?? '') },
  { key: 'website', label: 'Website', format: v => String(v ?? '') },
];

interface DelegationExportButtonProps {
  data: DelegationMember[];
  stateCode: string;
  stateName: string;
}

export function DelegationExportButton({
  data,
  stateCode,
  stateName,
}: DelegationExportButtonProps) {
  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={delegationExportColumns as unknown as ExportColumn<Record<string, unknown>>[]}
      filename={`${stateCode.toLowerCase()}-delegation`}
      description={`Federal congressional delegation for ${stateName}`}
      size="md"
      ariaLabel={`Export ${stateName} delegation data`}
    />
  );
}
