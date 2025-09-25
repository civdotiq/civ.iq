/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Client-side HTML sanitization utility using DOMPurify
 *
 * This utility provides secure client-side HTML sanitization for Wikipedia
 * biography content. It uses DOMPurify with a strict allow-list configuration
 * to prevent XSS attacks while allowing basic formatting.
 */

import DOMPurify from 'dompurify';

/**
 * Strict sanitization configuration for Wikipedia HTML content
 *
 * Only allows basic formatting tags with minimal attributes to ensure
 * security while preserving the essential formatting of Wikipedia summaries.
 */
const SANITIZE_CONFIG = {
  // Allow only basic formatting tags
  ALLOWED_TAGS: ['p', 'b', 'strong', 'i', 'em', 'br', 'a'],

  // Allow only href attributes for links (with protocol restrictions)
  ALLOWED_ATTR: ['href', 'target', 'rel'],

  // Explicitly forbid potentially dangerous attributes
  FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onload', 'onmouseover'],

  // Explicitly forbid dangerous tags
  FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'svg'],

  // Disable data attributes
  ALLOW_DATA_ATTR: false,

  // Return sanitized HTML string (not DOM)
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,

  // Additional security settings
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,

  // Allowed URI schemes for links
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

/**
 * Sanitize HTML content from Wikipedia API responses
 *
 * This function uses DOMPurify with a strict configuration to clean
 * HTML content received from Wikipedia's API. It's designed specifically
 * for biography summaries that may contain basic formatting.
 *
 * @param htmlContent - Raw HTML content from Wikipedia API
 * @returns Sanitized HTML safe for use with dangerouslySetInnerHTML
 */
export function sanitizeWikipediaHtml(htmlContent: string): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  try {
    // Use DOMPurify to sanitize the HTML with our strict configuration
    const sanitized = DOMPurify.sanitize(htmlContent, SANITIZE_CONFIG);

    // Convert TrustedHTML to string for post-processing
    const sanitizedString = String(sanitized);

    // Additional post-processing to ensure all links open in new tabs
    // and have appropriate security attributes
    return sanitizedString.replace(
      /<a\s+([^>]*?)href="([^"]*?)"([^>]*?)>/gi,
      '<a $1href="$2"$3 target="_blank" rel="noopener noreferrer">'
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sanitizing HTML content:', error);

    // Return empty string on error to prevent potential security issues
    return '';
  }
}

/**
 * Validate that HTML content is safe after sanitization
 *
 * This function performs additional validation on sanitized content
 * to ensure it meets our security requirements.
 *
 * @param sanitizedHtml - HTML content that has been sanitized
 * @returns Boolean indicating if the content passes validation
 */
export function validateSanitizedHtml(sanitizedHtml: string): boolean {
  if (!sanitizedHtml || typeof sanitizedHtml !== 'string') {
    return true; // Empty content is safe
  }

  try {
    // Check for dangerous patterns that might have slipped through
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/gi,
      /<object\b/gi,
      /<embed\b/gi,
      /<form\b/gi,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(sanitizedHtml));
  } catch {
    return false; // Err on the side of caution
  }
}

/**
 * Sanitize and validate Wikipedia HTML content in one step
 *
 * This is the main function that should be used for processing
 * Wikipedia biography content. It sanitizes and validates the content.
 *
 * @param htmlContent - Raw HTML from Wikipedia API
 * @returns Clean, validated HTML or empty string if unsafe
 */
export function sanitizeAndValidateWikipediaHtml(htmlContent: string): string {
  const sanitized = sanitizeWikipediaHtml(htmlContent);

  if (!validateSanitizedHtml(sanitized)) {
    // eslint-disable-next-line no-console
    console.warn('HTML content failed validation after sanitization');
    return '';
  }

  return sanitized;
}

/**
 * Check if DOMPurify is available and working properly
 *
 * This function can be used for debugging to ensure the sanitization
 * library is properly loaded and functional.
 *
 * @returns Boolean indicating if DOMPurify is available
 */
export function isDOMPurifyAvailable(): boolean {
  try {
    return typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function';
  } catch {
    return false;
  }
}
