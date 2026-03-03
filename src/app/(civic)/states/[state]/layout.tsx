/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export default async function StateLayout({ children, params }: LayoutProps) {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
          { name: stateName, url: `https://civdotiq.org/states/${state}` },
        ]}
      />
      {children}
    </>
  );
}
