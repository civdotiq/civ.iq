/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';

interface AlertSubscribeFormProps {
  entities: Array<{
    type: 'representative';
    id: string;
    name: string;
    chamber?: 'House' | 'Senate';
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const ALERT_TYPE_OPTIONS = [
  { value: 'votes', label: 'New votes' },
  { value: 'finance', label: 'Campaign finance filings' },
  { value: 'legislation', label: 'Bills sponsored' },
] as const;

/**
 * Inline form for subscribing to email alerts.
 * Collects email + alert type preferences, posts to /api/alerts/subscribe.
 */
export function AlertSubscribeForm({ entities, onSuccess, onCancel }: AlertSubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [alertTypes, setAlertTypes] = useState<string[]>(['votes', 'legislation']);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const toggleAlertType = (type: string) => {
    setAlertTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || alertTypes.length === 0) return;

    setFormState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), entities, alertTypes }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState('error');
        setErrorMessage(data.error || 'Something went wrong');
        return;
      }

      setFormState('success');
      onSuccess?.();
    } catch {
      setFormState('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (formState === 'success') {
    return (
      <div className="border-2 border-black p-4" data-testid="alert-subscribe-success">
        <p className="type-sm font-bold text-gray-900 mb-1">Check your email</p>
        <p className="type-xs text-gray-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your alerts.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-2 border-black p-4"
      data-testid="alert-subscribe-form"
    >
      <p className="type-sm font-bold text-gray-900 mb-3">
        Get email alerts for{' '}
        {entities.length === 1 ? entities[0]!.name : `${entities.length} representatives`}
      </p>

      {/* Email input */}
      <div className="mb-3">
        <label htmlFor="alert-email" className="sr-only">
          Email address
        </label>
        <input
          id="alert-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full border-2 border-gray-300 px-3 py-2 type-sm focus:border-black focus:outline-none"
          disabled={formState === 'submitting'}
          autoComplete="email"
        />
      </div>

      {/* Alert type checkboxes */}
      <fieldset className="mb-3">
        <legend className="aicher-heading-wide text-xs text-gray-500 mb-2">ALERT TYPES</legend>
        <div className="flex flex-wrap gap-3">
          {ALERT_TYPE_OPTIONS.map(option => (
            <label key={option.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={alertTypes.includes(option.value)}
                onChange={() => toggleAlertType(option.value)}
                className="accent-black w-4 h-4"
                disabled={formState === 'submitting'}
              />
              <span className="type-xs text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Error message */}
      {formState === 'error' && (
        <p className="type-xs text-amber-700 mb-3" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={formState === 'submitting' || !email.trim() || alertTypes.length === 0}
          className="border-2 border-black bg-black text-white px-4 py-2 type-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {formState === 'submitting' ? 'Subscribing...' : 'Subscribe'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-gray-300 text-gray-600 px-4 py-2 type-sm hover:border-black hover:text-black transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="type-xs text-gray-400 mt-3">
        No account required. Unsubscribe anytime with one click.
      </p>
    </form>
  );
}
