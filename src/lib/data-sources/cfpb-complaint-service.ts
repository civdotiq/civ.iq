/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CFPB Consumer Complaint Database Service
 *
 * Queries the Consumer Financial Protection Bureau complaint database.
 * No API key required.
 *
 * API: https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  CfpbComplaint,
  CfpbComplaintAggregates,
  CfpbSearchParams,
  CfpbRawComplaint,
  CfpbSearchResponse,
} from '@/types/cfpb';

const BASE_URL =
  'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 43200; // 12 hours

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'CIV.IQ (civdotiq.org)' },
    signal: AbortSignal.timeout(30_000),
  });
}

function transformComplaint(raw: CfpbRawComplaint): CfpbComplaint {
  return {
    complaintId: raw.complaint_id,
    dateReceived: raw.date_received,
    product: raw.product,
    subProduct: raw.sub_product,
    issue: raw.issue,
    subIssue: raw.sub_issue,
    company: raw.company,
    state: raw.state,
    zipCode: raw.zip_code,
    submittedVia: raw.submitted_via,
    companyResponse: raw.company_response,
    timely: raw.timely === 'Yes',
    consumerDisputed: raw.consumer_disputed,
    dateSentToCompany: raw.date_sent_to_company,
    hasNarrative: raw.has_narrative,
  };
}

export class CfpbComplaintService {
  /**
   * Search consumer complaints with optional filters.
   */
  async searchComplaints(
    params?: CfpbSearchParams
  ): Promise<{ complaints: CfpbComplaint[]; total: number }> {
    const qp = new URLSearchParams();
    if (params?.company) qp.set('company', params.company);
    if (params?.product) qp.set('product', params.product);
    if (params?.state) qp.set('state', params.state);
    if (params?.dateReceivedMin) qp.set('date_received_min', params.dateReceivedMin);
    if (params?.dateReceivedMax) qp.set('date_received_max', params.dateReceivedMax);
    if (params?.issue) qp.set('issue', params.issue);
    qp.set('size', String(params?.size ?? 25));
    if (params?.from) qp.set('from', String(params.from));
    if (params?.sort) qp.set('sort', params.sort);
    qp.set('no_aggs', 'true');

    const cacheKey = `cfpb-search:${qp.toString()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}?${qp.toString()}`;
          logger.info('CFPB complaint search', { params });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`CFPB API returned ${response.status}`);
          }

          const data: CfpbSearchResponse = await response.json();
          const complaints = (data.hits?.hits ?? []).map(h => transformComplaint(h._source));

          return {
            complaints,
            total: data.hits?.total?.value ?? complaints.length,
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CfpbComplaintService.searchComplaints failed', error as Error);
      return { complaints: [], total: 0 };
    }
  }

  /**
   * Get complaint aggregates for a state (top products, companies, issues).
   * Uses the API's built-in aggregations.
   */
  async getComplaintAggregates(state: string): Promise<CfpbComplaintAggregates | null> {
    const cacheKey = `cfpb-aggs:${state.toUpperCase()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams({
            state: state.toUpperCase(),
            size: '0', // No individual hits — just aggregations
          });

          const url = `${BASE_URL}?${qp.toString()}`;
          logger.info('CFPB complaint aggregates', { state });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`CFPB API returned ${response.status}`);
          }

          const data: CfpbSearchResponse = await response.json();
          const aggs = data.aggregations ?? {};

          const buckets = (key: string) =>
            aggs[key]?.buckets ?? [];

          const productBuckets = buckets('product');
          const companyBuckets = buckets('company');
          const issueBuckets = buckets('issue');
          const timelyBuckets = buckets('timely');
          const submittedViaBuckets = buckets('submitted_via');

          const timelyYes = timelyBuckets.find(b => b.key === 'Yes')?.doc_count ?? 0;
          const timelyNo = timelyBuckets.find(b => b.key === 'No')?.doc_count ?? 0;

          return {
            total: data.hits?.total?.value ?? 0,
            byProduct: productBuckets.map(b => ({ product: b.key, count: b.doc_count })),
            byCompany: companyBuckets.map(b => ({ company: b.key, count: b.doc_count })),
            byIssue: issueBuckets.map(b => ({ issue: b.key, count: b.doc_count })),
            byTimely: { yes: timelyYes, no: timelyNo },
            bySubmittedVia: submittedViaBuckets.map(b => ({
              channel: b.key,
              count: b.doc_count,
            })),
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CfpbComplaintService.getComplaintAggregates failed', error as Error);
      return null;
    }
  }
}

export const cfpbComplaintService = new CfpbComplaintService();
