/**
 * Image Sitemap for Representative Photos
 * Helps Google Images index representative photos
 * URL: /sitemap-images.xml
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://civdotiq.org';

export const dynamic = 'force-static';
export const revalidate = 86400; // Regenerate daily

export async function GET() {
  // Read photo files from public/photos
  const photosDir = path.join(process.cwd(), 'public', 'photos');
  let photoFiles: string[] = [];

  try {
    photoFiles = fs.readdirSync(photosDir).filter(f => f.endsWith('.jpg') || f.endsWith('.webp'));
  } catch {
    // Directory might not exist in some environments
  }

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${photoFiles
  .map(photo => {
    const bioguideId = photo.replace(/\.(jpg|webp)$/, '');
    return `  <url>
    <loc>${BASE_URL}/representative/${bioguideId}</loc>
    <image:image>
      <image:loc>${BASE_URL}/photos/${photo}</image:loc>
      <image:title>Official photo of U.S. Congress member ${bioguideId}</image:title>
      <image:caption>Official congressional portrait</image:caption>
    </image:image>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
