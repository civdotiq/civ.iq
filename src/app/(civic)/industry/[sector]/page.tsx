/**
 * Industry Sector Page — Server Component
 *
 * Provides generateMetadata for SEO, breadcrumbs, and wraps
 * the client component that handles SWR data fetching.
 */

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { IndustrySectorClient } from './IndustrySectorClient';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { IndustrySectorPage } from '@/components/sectors/IndustrySectorPage';

interface PageProps {
  params: Promise<{ sector: string }>;
  searchParams: Promise<{ v?: string }>;
}

function formatSectorName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parseSector(input: string): IndustrySector | null {
  const normalized = decodeURIComponent(input).toLowerCase().replace(/-/g, ' ');
  for (const value of Object.values(IndustrySector)) {
    if (value.toLowerCase() === normalized) return value;
    if (value.toLowerCase().replace(/[/&]/g, ' ') === normalized) return value;
  }
  return null;
}

async function fetchWikiSummary(sectorName: string): Promise<string | null> {
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: `${sectorName} industry United States`,
        srlimit: '3',
        origin: '*',
      });

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5_000) });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const extractUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'extracts',
        exintro: 'true',
        explaintext: 'true',
        titles: title,
        origin: '*',
      });

    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(5_000) });
    if (!extractRes.ok) return null;

    const extractData = (await extractRes.json()) as {
      query?: { pages?: Record<string, { extract?: string; missing?: boolean }> };
    };
    const pages = extractData.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing) return null;

    return page.extract?.slice(0, 400) ?? null;
  } catch {
    return null;
  }
}

export default async function IndustrySectorPageRoute({ params, searchParams }: PageProps) {
  const { sector } = await params;
  const { v } = await searchParams;
  const resolved = parseSector(sector);
  const displayName = resolved ?? formatSectorName(sector);

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = (v === 'new' || isPreviewEnv) && resolved !== null;

  if (useRedesign && resolved) {
    return <IndustrySectorPage sector={resolved} sectorSlug={sector} displayName={displayName} />;
  }

  const wikiSummary = await fetchWikiSummary(displayName);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Industries', href: '/industry' },
            { label: displayName, href: `/industry/${sector}` },
          ]}
          className="mb-6"
        />

        <IndustrySectorClient sector={sector} displayName={displayName} wikiSummary={wikiSummary} />

        <OpenDataStrip
          apiUrl={`/api/industry/${encodeURIComponent(sector)}/connections`}
          className="mt-8"
        />
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sector } = await params;
  const resolved = parseSector(sector);
  const displayName = resolved ?? formatSectorName(sector);

  const title = `${displayName} — Industry sector`;
  const description = `Federal legislation, congressional committees, lobbying organizations, and enforcement activity connected to the ${displayName.toLowerCase()} sector.`;

  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/industry/${sector}` },
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/industry/${sector}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@civdotiq',
    },
  };
}
