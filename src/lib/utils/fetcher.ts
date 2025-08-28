/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Simple fetcher for useSWR
 * Handles JSON responses and basic error cases
 */
export const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) {
      throw new Error(`API call failed: ${res.status}`);
    }
    return res.json();
  });
