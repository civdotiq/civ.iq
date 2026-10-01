/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Contact helpers for the Congress profile header. congress-legislators keeps
 * phone, address and contact_form on the current term; contact_form is filled
 * for most senators but almost no House members, and some values are
 * malformed (e.g. "hhttps://"), so every URL is checked before it is linked.
 */

/** Returns the URL if it parses as http(s), else undefined. */
export function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** "202-225-5126" → "+12022255126"; undefined when it isn't a 10-digit US number. */
export function telHref(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, '') ?? '';
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return national.length === 10 ? `tel:+1${national}` : undefined;
}

/**
 * "2438 Rayburn House Office Building Washington DC 20515-2212" →
 * ["2438 Rayburn House Office Building", "Washington, DC 20515-2212"].
 * Anything that doesn't end in a Washington DC ZIP is returned as one line.
 */
export function dcOfficeLines(address: string | undefined): string[] {
  const trimmed = address?.trim();
  if (!trimmed) return [];
  const match = trimmed.match(/^(.*?),?\s+Washington,?\s+DC\s+(\d{5}(?:-\d{4})?)$/i);
  if (!match?.[1]) return [trimmed];
  return [match[1], `Washington, DC ${match[2]}`];
}
