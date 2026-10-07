/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Portraits for share images. Scrapers give up after a few seconds, so each
 * source gets a short timeout and the card ships without a photo rather
 * than not at all.
 */

import sharp from 'sharp';
import { getServerBaseUrl } from '@/lib/server-url';

const PORTRAIT_TIMEOUT_MS = 2500;

/**
 * First source that answers with an image, as a 450x550 JPEG data URI.
 * Normalised to JPEG because some sources answer WebP, which Satori can't draw.
 */
export async function fetchPortrait(sources: string[]): Promise<string | undefined> {
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(PORTRAIT_TIMEOUT_MS) });
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) continue;
      const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(450, 550, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 90 })
        .toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    } catch {
      // try the next source
    }
  }
  return undefined;
}

/**
 * A Congress member's portrait: the 450x550 unitedstates photo, else the
 * site's photo route (Commons / House Clerk tiers; covers new members the
 * unitedstates set lags on).
 */
export function fetchMemberPortrait(bioguideId: string): Promise<string | undefined> {
  return fetchPortrait([
    `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/${bioguideId}.jpg`,
    `${getServerBaseUrl()}/api/representative-photo/${bioguideId}`,
  ]);
}
