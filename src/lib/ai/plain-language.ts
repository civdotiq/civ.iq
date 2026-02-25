/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Plain Language Guidelines
 *
 * Shared constants for all AI-generated content in CIV.IQ.
 * All AI output follows the federal Plain Language Guidelines (plainlanguage.gov)
 * and the Plain Writing Act of 2010 (Public Law 111-274) to ensure civic
 * information is accessible to every reader.
 *
 * Target: Flesch-Kincaid Grade Level <= 8, Flesch Reading Ease >= 60
 */

/**
 * Attribution URL for the federal Plain Language Guidelines.
 * Include in API response metadata whenever AI-generated content is returned.
 */
export const PLAIN_LANGUAGE_URL = 'https://www.plainlanguage.gov';

/**
 * Attribution object to include in all AI-powered API responses.
 */
export const PLAIN_LANGUAGE_ATTRIBUTION = {
  name: 'Federal Plain Language Guidelines',
  url: PLAIN_LANGUAGE_URL,
  description:
    'All AI-generated content follows the federal Plain Language Guidelines to ensure clarity and accessibility.',
};

/**
 * Core system prompt fragment grounding AI output in the Plain Language Guidelines.
 * Prepend domain-specific context, then append this.
 *
 * Usage:
 *   const systemPrompt = `You explain legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;
 */
export const PLAIN_LANGUAGE_SYSTEM_PROMPT =
  'Follow the federal Plain Language Guidelines (plainlanguage.gov). ' +
  'Use ONLY the data provided. Be strictly nonpartisan and factual. ' +
  'Never editorialize, use analogies, or speculate. Output valid JSON only.';

/**
 * User-prompt rules block derived from plainlanguage.gov best practices.
 * Append to any user prompt that requests AI-generated prose.
 *
 * These map directly to plainlanguage.gov guidelines:
 * - "Write for your audience" → Use "you" and "your"
 * - "Organize" → Major point first
 * - "Use active voice"
 * - "Use short sentences" → Under 20 words
 * - "Use simple words" → Everyday words, explain terms
 * - "Be concise" → Omit unneeded words
 * - "Be nonpartisan" → Facts only (CIV.IQ addition)
 * - "No figurative language" → No analogies/metaphors (CIV.IQ addition)
 * - "Use real numbers" → Specific dates, dollars, counts
 */
export const PLAIN_LANGUAGE_RULES = `Follow the federal Plain Language Guidelines (plainlanguage.gov) and the Plain Writing Act of 2010:
- Write for the reader. Use "you" and "your" to address them directly.
- State the major point first, then provide details.
- Write in active voice. Make it clear who does what. Avoid passive voice.
- Keep sentences under 20 words. Average 15 words per sentence. One idea per sentence.
- Use everyday words. If you must use a technical or legal term, explain it immediately in parentheses.
- Use "must" instead of "shall". Use "may" instead of "is authorized to".
- Avoid nominalizations: use verbs instead of noun forms (say "decide" not "make a determination", "require" not "impose a requirement").
- Replace jargon: "commence" → "begin", "utilize" → "use", "in order to" → "to", "prior to" → "before", "subsequent to" → "after", "notwithstanding" → "despite", "promulgate" → "issue".
- Omit unneeded words. Be direct and concise.
- Be strictly nonpartisan. State facts, not opinions.
- Do not use analogies, metaphors, or hypothetical scenarios.
- Use specific numbers, dates, and dollar amounts from the data when available.
- Use short paragraphs. One topic per paragraph.`;
