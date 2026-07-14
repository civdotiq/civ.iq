/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * IndexNow instant-indexing submission.
 *
 * IndexNow (https://www.indexnow.org) lets us push changed URLs to Bing,
 * Yandex, Seznam, and Naver the moment we publish, instead of waiting for a
 * crawl. Bing's index also powers ChatGPT Search and Copilot, so faster Bing
 * indexing means fresher civic data in AI answers.
 *
 * Ownership is proven by a public key file served at `https://<host>/<key>.txt`
 * whose body is the key (see public/<key>.txt). Submission is gated on
 * INDEXNOW_KEY so it stays dark on preview/dev and until the domain is verified
 * in Bing Webmaster Tools.
 */

import logger from '@/lib/logging/simple-logger';
import { getServerBaseUrl } from '@/lib/server-url';
import { buildBillUrl, buildVoteUrl, buildStateBillUrl } from '@/lib/helpers/url-builders';
import type {
  CivicEvent,
  BillActionEvent,
  BillIntroducedEvent,
  VoteRecordEvent,
  StateBillIntroducedEvent,
  StateBillActionEvent,
} from '@/types/nostr';

/** Shared, engine-neutral endpoint — one POST notifies all participating engines. */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** IndexNow accepts up to 10,000 URLs per request. */
const MAX_URLS_PER_REQUEST = 10_000;

/**
 * Map a published CivicEvent to its canonical civ.iq path, or null when the
 * event type has no indexable civ.iq detail page (executive orders, comment
 * periods, hearings, state votes). Returning null keeps 404s out of IndexNow.
 */
export function eventToCanonicalPath(event: CivicEvent): string | null {
  switch (event.type) {
    case 'bill-action': {
      const d = event.data as BillActionEvent;
      return buildBillUrl(d.congress, d.billType, d.billNumber);
    }
    case 'bill-introduced': {
      const d = event.data as BillIntroducedEvent;
      return buildBillUrl(d.congress, d.billType, d.billNumber);
    }
    case 'vote-record': {
      const d = event.data as VoteRecordEvent;
      return buildVoteUrl(d.voteId);
    }
    case 'state-bill-introduced': {
      const d = event.data as StateBillIntroducedEvent;
      return buildStateBillUrl(d.state, d.billId);
    }
    case 'state-bill-action': {
      const d = event.data as StateBillActionEvent;
      return buildStateBillUrl(d.state, d.billId);
    }
    default:
      // executive-order, comment-period, hearing, state-vote have no dedicated
      // indexable detail page — skip rather than emit a URL that 404s.
      return null;
  }
}

/** Outcome of an IndexNow submission attempt. */
export interface IndexNowResult {
  submitted: number;
  skipped: boolean;
  reason?: string;
}

/**
 * Submit absolute URLs to IndexNow. Non-fatal: any failure is logged and
 * swallowed so it never blocks publishing. No-ops (skipped) when the key is
 * unset or the resolved host is not the verified production domain.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return { submitted: 0, skipped: true, reason: 'no_key' };
  }

  const baseUrl = getServerBaseUrl();
  // Only submit for the verified canonical domain. Preview/dev hosts are not
  // registered with IndexNow, so their URLs would be rejected or wasted.
  if (baseUrl.includes('localhost') || baseUrl.includes('.vercel.app')) {
    return { submitted: 0, skipped: true, reason: 'non_canonical_host' };
  }

  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return { submitted: 0, skipped: true, reason: 'bad_base_url' };
  }

  // Dedupe, keep only same-origin absolute URLs, cap at the per-request limit.
  const urlList = Array.from(new Set(urls))
    .filter(u => u.startsWith(baseUrl))
    .slice(0, MAX_URLS_PER_REQUEST);

  if (urlList.length === 0) {
    return { submitted: 0, skipped: true, reason: 'no_urls' };
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${baseUrl}/${key}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    // 200 = accepted, 202 = accepted/queued. Anything else is a soft failure.
    if (!response.ok && response.status !== 202) {
      logger.warn('IndexNow submission rejected', {
        status: response.status,
        count: urlList.length,
        operation: 'indexnow_publisher',
      });
      return { submitted: 0, skipped: false, reason: `http_${response.status}` };
    }

    logger.info('IndexNow submission accepted', {
      count: urlList.length,
      operation: 'indexnow_publisher',
    });
    return { submitted: urlList.length, skipped: false };
  } catch (error) {
    logger.warn('IndexNow submission error', {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'indexnow_publisher',
    });
    return { submitted: 0, skipped: false, reason: 'exception' };
  }
}
