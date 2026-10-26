/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The party as a label or modifier: "Party: Democratic", "Democratic Senator".
 * "Democrat" is a noun for a person ("she is a Democrat"), so it never labels
 * anything. Federal data records "Democrat" and state data "Democratic"; both
 * display the same. Codes ("D") and fusion tickets ("Democratic-Farmer-Labor")
 * read as the major party; anything else is shown as recorded.
 */
export function partyAdjective(party: string | null | undefined): string {
  const p = (party ?? '').trim();
  if (/^(d|dem)$/i.test(p) || /^democrat/i.test(p)) return 'Democratic';
  if (/^(r|rep)$/i.test(p) || /^republican/i.test(p)) return 'Republican';
  if (/^(i|ind)$/i.test(p) || /^independent/i.test(p)) return 'Independent';
  return p;
}

/** The standard one-letter code for "(D-MI)"; other parties as recorded. */
export function partyAbbreviation(party: string | null | undefined): string {
  const label = partyAdjective(party);
  return label === 'Democratic' || label === 'Republican' || label === 'Independent'
    ? label.charAt(0)
    : label;
}
