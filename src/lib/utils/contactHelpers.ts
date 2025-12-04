/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import DOMPurify from 'isomorphic-dompurify';
import type { RepresentativeSummary } from '@/types/representative';
import { getMemberContactInfo, getMemberContactFormUrl } from '@/data/member-contact-info';

/**
 * Format a constituent message with professional formatting
 */
export function formatConstituentMessage(params: {
  representativeName: string;
  representativeTitle: string;
  name: string;
  zipCode: string;
  subject: string;
  message: string;
}): string {
  const { representativeName, representativeTitle, name, zipCode, subject, message } = params;

  return `Dear ${representativeTitle} ${representativeName},

I am writing as your constituent from ${zipCode} regarding ${subject}.

${message.trim()}

Thank you for your attention to this important matter and for your service to our community.

Sincerely,
${name}`;
}

/**
 * Copy text to clipboard using the Clipboard API
 * @returns Promise<boolean> indicating success
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Validate US ZIP code format (5 digits or 5+4 format)
 */
export function validateZipCode(zip: string): boolean {
  if (!zip || typeof zip !== 'string') {
    return false;
  }

  // Remove spaces and trim
  const cleaned = zip.trim().replace(/\s/g, '');

  // Accept 5-digit ZIP or 5+4 format (12345 or 12345-6789)
  const zipRegex = /^\d{5}(-\d{4})?$/;

  return zipRegex.test(cleaned);
}

/**
 * Normalize ZIP code to 5-digit format
 */
export function normalizeZipCode(zip: string): string {
  if (!zip) return '';

  // Remove spaces and get first 5 digits
  const cleaned = zip.trim().replace(/\s/g, '');
  return cleaned.split('-')[0]?.slice(0, 5) || '';
}

/**
 * Sanitize user message to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 * Note: Does NOT trim - preserves spaces and newlines for textarea input
 */
export function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Configure DOMPurify to strip all HTML tags but preserve whitespace
  const clean = DOMPurify.sanitize(message, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });

  return clean; // Don't trim - preserve spaces and newlines during typing
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex - matches most valid email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email.trim());
}

/**
 * Fetch representatives for a given ZIP code
 * Calls the existing /api/representatives?zip= endpoint
 */
export async function findUserRepresentatives(zipCode: string): Promise<RepresentativeSummary[]> {
  const normalized = normalizeZipCode(zipCode);

  if (!validateZipCode(normalized)) {
    throw new Error('Invalid ZIP code format');
  }

  try {
    const response = await fetch(`/api/representatives?zip=${normalized}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      representatives?: RepresentativeSummary[];
      error?: string;
    };

    if (data.error) {
      throw new Error(data.error);
    }

    return data.representatives || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching representatives:', error);
    throw error;
  }
}

/**
 * Get contact method availability for a representative
 * Uses static data from unitedstates/congress-legislators when bioguideId is available
 * Falls back to representative object data for non-federal legislators
 */
export function getContactMethods(representative: {
  bioguideId?: string;
  email?: string;
  currentTerm?: {
    contactForm?: string;
    website?: string;
  };
  contact?: {
    contactForm?: string;
  };
  officialWebsiteUrl?: string;
}): {
  hasEmail: boolean;
  hasContactForm: boolean;
  contactFormUrl?: string;
  officialWebsite?: string;
  phone?: string;
  email?: string;
} {
  // First, try to get data from static member contact info (most reliable)
  if (representative.bioguideId) {
    const staticInfo = getMemberContactInfo(representative.bioguideId);
    if (staticInfo) {
      const contactFormUrl = getMemberContactFormUrl(representative.bioguideId);
      return {
        hasEmail: !!representative.email,
        hasContactForm: !!contactFormUrl,
        contactFormUrl,
        officialWebsite: staticInfo.url,
        phone: staticInfo.phone || undefined,
        email: representative.email,
      };
    }
  }

  // Fallback: Try explicit contact form from representative object
  let contactFormUrl =
    representative.currentTerm?.contactForm || representative.contact?.contactForm;

  // Get official website from various sources
  const officialWebsite = representative.officialWebsiteUrl || representative.currentTerm?.website;

  // If no explicit contact form but we have official website, derive contact URL
  if (!contactFormUrl && officialWebsite) {
    const baseUrl = officialWebsite.endsWith('/') ? officialWebsite.slice(0, -1) : officialWebsite;
    contactFormUrl = `${baseUrl}/contact`;
  }

  return {
    hasEmail: !!representative.email,
    hasContactForm: !!contactFormUrl,
    contactFormUrl,
    officialWebsite,
    email: representative.email,
  };
}

/**
 * Generate mailto URL with pre-filled content
 */
export function generateMailtoLink(params: {
  email: string;
  subject: string;
  body: string;
}): string {
  const { email, subject, body } = params;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Truncate message to fit within character limit
 */
export function truncateMessage(message: string, maxLength: number): string {
  if (!message || message.length <= maxLength) {
    return message;
  }

  // Find the last space before the limit to avoid cutting words
  const truncated = message.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    // If we found a space reasonably close to the limit
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Get character count for message (excluding whitespace at ends)
 */
export function getMessageCharacterCount(message: string): number {
  return message.trim().length;
}
