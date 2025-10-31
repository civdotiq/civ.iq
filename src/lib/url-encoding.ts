/**
 * URL-safe Base64 encoding utilities
 * Works in both Node.js (server) and browser (client) environments
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Encode a string to URL-safe Base64
 * Replaces + with -, / with _, and removes padding =
 */
export function encodeBase64Url(str: string): string {
  if (typeof window === 'undefined') {
    // Server-side (Node.js)
    return Buffer.from(str).toString('base64url');
  } else {
    // Client-side (browser)
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

/**
 * Decode a URL-safe Base64 string
 * Reverses the URL-safe replacements before decoding
 */
export function decodeBase64Url(str: string): string {
  if (typeof window === 'undefined') {
    // Server-side (Node.js)
    return Buffer.from(str, 'base64url').toString();
  } else {
    // Client-side (browser)
    // Reverse URL-safe replacements
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }
}
