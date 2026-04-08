/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Resend } from 'resend';
import logger from '@/lib/logging/simple-logger';

const FROM_ADDRESS = 'CIV.IQ Alerts <alerts@civdotiq.org>';

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** If provided, adds RFC 8058 List-Unsubscribe headers for one-click unsubscribe in Gmail/Yahoo */
  unsubscribeUrl?: string;
}

/**
 * Send a single email via Resend.
 * Returns true on success, false on failure (logged but not thrown).
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const client = getClient();

    const headers: Record<string, string> = {};
    if (params.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${params.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (result.error) {
      logger.error('[Alerts] Email send failed', new Error(result.error.message), {
        to: params.to.substring(0, 3) + '***',
        subject: params.subject,
      });
      return false;
    }

    logger.info('[Alerts] Email sent', {
      id: result.data?.id,
      subject: params.subject,
    });
    return true;
  } catch (error) {
    logger.error('[Alerts] Email send error', error as Error, {
      subject: params.subject,
    });
    return false;
  }
}

/**
 * Send emails in batches with delays to respect Resend rate limits.
 * Free tier: 2 emails/second, 100 emails/day.
 */
export async function sendEmailBatch(
  emails: SendEmailParams[],
  batchSize: number = 2,
  delayMs: number = 1100
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(sendEmail));

    for (const success of results) {
      if (success) sent++;
      else failed++;
    }

    // Delay between batches (skip after last batch)
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  logger.info('[Alerts] Batch send complete', { sent, failed, total: emails.length });
  return { sent, failed };
}
