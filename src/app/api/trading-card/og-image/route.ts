/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOpenGraphTags } from '@/lib/socialSharing';

/**
 * API endpoint to serve Open Graph metadata for trading cards
 * This enables rich previews when sharing on social media
 * 
 * Example: /api/trading-card/og-image?bioguideId=S001234&imageUrl=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bioguideId = searchParams.get('bioguideId');
    const imageUrl = searchParams.get('imageUrl');
    const name = searchParams.get('name');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const title = searchParams.get('title');

    if (!bioguideId || !name) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Generate Open Graph tags
    const ogTags = generateOpenGraphTags(
      {
        bioguideId,
        name,
        state: state || '',
        district: district || '',
        title: title || 'U.S. Representative',
        party: '',
        chamber: '',
        firstName: '',
        lastName: ''
      },
      imageUrl || '/api/placeholder-card.png'
    );

    // Generate HTML with Open Graph meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${Object.entries(ogTags).map(([property, content]) => 
    property.startsWith('twitter:') 
      ? `<meta name="${property}" content="${content}" />`
      : `<meta property="${property}" content="${content}" />`
  ).join('\n  ')}
  <title>${ogTags['og:title']}</title>
</head>
<body>
  <h1>${name}'s Trading Card</h1>
  <p>${ogTags['og:description']}</p>
  ${imageUrl ? `<img src="${imageUrl}" alt="${name}'s trading card" />` : ''}
  <p><a href="/">Back to CIV.IQ</a></p>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error) {
    console.error('Error generating OG image metadata:', error);
    return NextResponse.json(
      { error: 'Failed to generate metadata' },
      { status: 500 }
    );
  }
}

// Handle HEAD requests for faster social media crawlers
export async function HEAD(request: NextRequest) {
  return GET(request);
}