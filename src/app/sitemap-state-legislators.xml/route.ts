/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Sitemap of every sitting state legislator profile (~7,400 URLs).
 * URL: /sitemap-state-legislators.xml
 *
 * A separate file rather than a `generateSitemaps` split of sitemap.ts: that
 * would move /sitemap.xml, which is the URL registered in Search Console and
 * Bing. Built from the roster corpus, so it lists exactly the members whose
 * pages resolve — and serving it costs no OpenStates quota.
 */

import { NextResponse } from 'next/server';
import { getAllPeople } from '@/lib/data-sources/openstates-people/load-people';
import { buildStateLegislatorUrl } from '@/lib/helpers/url-builders';

const BASE_URL = 'https://civdotiq.org';

export const dynamic = 'force-dynamic';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const corpus = await getAllPeople();
  if (!corpus) {
    // An empty sitemap would tell crawlers every profile is gone.
    return new NextResponse('State legislator roster unavailable', { status: 503 });
  }

  const lastmod = corpus.upstreamCommittedAt.slice(0, 10);
  const urls = corpus.people
    .map(person => {
      const loc = `${BASE_URL}${buildStateLegislatorUrl(person.jurisdiction, person.id, person.name)}`;
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
