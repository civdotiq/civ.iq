/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Coverage disclosure for tool results computed off a bounded upstream fetch.
 *
 * Several district and state profiles here summarize a list the upstream API
 * capped: EPA ECHO serves at most a 100-row responseset, CMS 200 providers, NIH
 * and FDIC whatever `limit` asked for. Counting or summing that list gives a
 * figure that describes the fetch, not the district — and these results are read
 * by agents, which quote a field called `totalAssets` as the total assets.
 *
 * A saturated fetch cannot be silently presented as a census. Attach the result
 * of `coverageFor` next to the figures it qualifies so the number arrives with
 * the one fact needed to read it correctly.
 */

export interface Coverage {
  /** False when the upstream fetch came back at its cap, so more rows exist. */
  complete: boolean;
  /** Present only when incomplete: what to treat the numbers as. */
  note?: string;
}

/**
 * Whether a fetch of `rowsReturned` rows against a `cap`-row ceiling saw
 * everything.
 *
 * A full page is treated as saturated. That is deliberately pessimistic — a
 * source with exactly `cap` rows is reported as incomplete — because claiming a
 * total that is short is the more damaging error of the two.
 *
 * @param subject what the rows are, for the note ("regulated facilities")
 */
export function coverageFor(rowsReturned: number, cap: number, subject: string): Coverage {
  if (rowsReturned < cap) return { complete: true };
  return {
    complete: false,
    note:
      `The upstream API returned its maximum of ${cap} ${subject}, so more exist. ` +
      `Counts and totals here are lower bounds, not the full picture, and rankings ` +
      `cover only the rows retrieved.`,
  };
}
