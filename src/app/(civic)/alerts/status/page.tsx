/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/alerts/status' },
  title: 'Alert Status - CIV.IQ',
  robots: { index: false, follow: false },
};

const STATUS_MESSAGES: Record<string, { heading: string; body: string }> = {
  confirmed: {
    heading: 'Subscription confirmed',
    body: 'You will receive email alerts when there is new activity for your watched representatives.',
  },
  unsubscribed: {
    heading: 'Unsubscribed',
    body: 'You have been unsubscribed and will no longer receive alerts from CIV.IQ.',
  },
  'invalid-or-expired': {
    heading: 'Link expired',
    body: 'This link is no longer valid. Please subscribe again to receive a new confirmation email.',
  },
  'missing-token': {
    heading: 'Invalid link',
    body: 'This link appears to be incomplete. Please check the link in your email.',
  },
  'not-found': {
    heading: 'Subscription not found',
    body: 'No pending subscription was found. It may have already been confirmed or expired.',
  },
  error: {
    heading: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again later.',
  },
};

export default async function AlertStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  const fallback = {
    heading: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again later.',
  };
  const status = STATUS_MESSAGES[result ?? ''] ?? fallback;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="border-2 border-black p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{status.heading}</h1>
          <p className="type-sm text-gray-600 mb-6">{status.body}</p>
          <Link
            href="/"
            className="inline-flex items-center border-2 border-black text-black px-4 py-2 type-sm font-bold hover:bg-black hover:text-white transition-colors min-h-[44px]"
          >
            Back to CIV.IQ
          </Link>
        </div>
      </div>
    </div>
  );
}
