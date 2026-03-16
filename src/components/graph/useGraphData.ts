/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import type { GraphNeighborhood, PathResult } from '@/types/graph';

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) return null;
    return res.json();
  });

export function useGraphNeighborhood(nodeId: string | null) {
  return useSWR<GraphNeighborhood | null>(
    nodeId ? `/api/graph/neighbors/${encodeURIComponent(nodeId)}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
}

export function useGraphPath(from: string | null, to: string | null, maxDepth = 3) {
  const key =
    from && to
      ? `/api/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&maxDepth=${maxDepth}`
      : null;

  return useSWR<PathResult | null>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
