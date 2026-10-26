/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/** Accent- and case-insensitive form for matching names. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

const ROMAN = /^(II|III|IV|V|VI)$/;

/** "MCDONALD" → "McDonald", "O'NEIL" → "O'Neil", "SMITH-JONES" → "Smith-Jones". */
function titleWord(word: string): string {
  if (ROMAN.test(word)) return word;
  if (/^[A-Z]\.$/.test(word)) return word;
  return word
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/(^|[-'’])Mc(\p{L})/gu, (_, sep: string, ch: string) => `${sep}Mc${ch.toUpperCase()}`);
}

/**
 * How a 2024 candidate is named on the page. Election data (MEDSL) lists
 * names in capitals ("DEBBIE DINGELL"). The district's current member is
 * named as the site names them everywhere else ("Eleanor Holmes Norton");
 * other candidates, who have no site record, get ordinary capitalization.
 */
export function candidateDisplayName(
  candidate: string,
  member?: { name: string; lastName?: string } | null
): string {
  const last = member?.lastName?.trim() || member?.name.trim().split(/\s+/).pop();
  // Surname on word boundaries, so "WASSERMAN SCHULTZ" and "NORTON" match.
  if (member && last && ` ${fold(candidate).replace(/,/g, ' ')} `.includes(` ${fold(last)} `)) {
    return member.name;
  }
  if (candidate !== candidate.toUpperCase()) return candidate;
  return candidate.split(/\s+/).filter(Boolean).map(titleWord).join(' ');
}
