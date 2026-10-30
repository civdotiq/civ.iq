import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStateName, isValidStateCode } from '@/lib/data/us-states';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state } = await params;
  if (!isValidStateCode(state)) return { title: 'State not found' };
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: { default: `${stateName} Bills`, template: '%s | CIV.IQ' },
    description: `Browse current and recent bills in the ${stateName} state legislature. Search by topic, sponsor, or status.`,
    openGraph: {
      images: SITE_OG_IMAGES,
      title: `${stateName} Bills | CIV.IQ`,
      description: `Browse current and recent bills in the ${stateName} state legislature. Search by topic, sponsor, or status.`,
      url: `https://civdotiq.org/state-bills/${state.toLowerCase()}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

// Checked here so the bill pages below get a real 404 too. No loading.tsx in
// this segment: it would commit a 200 before any notFound() below it.
export default async function StateBillsLayout({ children, params }: LayoutProps) {
  const { state } = await params;
  if (!isValidStateCode(state)) notFound();
  return <>{children}</>;
}
