/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';

/**
 * Weekly digest signup — email only, double opt-in via /api/digest/subscribe.
 */
export function DigestSubscribeForm({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch('/api/digest/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (response.ok) {
        setStatus('sent');
        setMessage(body.message ?? 'Check your email to confirm your subscription.');
      } else {
        setStatus('error');
        setMessage(body.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className={`border-2 border-black bg-white p-grid-3 ${className ?? ''}`}>
        <p className="text-[15px] font-medium">{message}</p>
        <p className="mt-grid-1 text-sm text-gray-600">
          The confirmation link expires in 48 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-2 border-black bg-white p-grid-3 ${className ?? ''}`}
    >
      <label htmlFor="digest-email" className="text-xs font-bold uppercase tracking-[0.08em]">
        Weekly email
      </label>
      <p className="mt-grid-1 text-sm text-gray-600">
        One email every Monday. Votes, bills, and money filings — public records with citations,
        nothing else.
      </p>
      <div className="mt-grid-2 flex flex-col gap-grid-1 sm:flex-row">
        <input
          id="digest-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 border-2 border-gray-300 px-3 py-2 text-[15px] focus:border-[#3ea2d4] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="border-2 border-black bg-black px-5 py-2 text-[15px] font-semibold text-white hover:bg-white hover:text-black disabled:opacity-50"
        >
          {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && <p className="mt-grid-1 text-sm text-[#d97706]">{message}</p>}
    </form>
  );
}
