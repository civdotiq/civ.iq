'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Hook for streaming bill summaries
 *
 * Calls the streaming summary endpoint. If the response is JSON (cached),
 * sets the summary directly. If SSE, accumulates streaming text and sets
 * the full summary on completion.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BillSummary } from '@/features/legislation/services/ai/bill-summarizer';

interface UseBillSummaryStreamResult {
  summary: BillSummary | null;
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
}

export function useBillSummaryStream(
  billId: string | null,
  enabled: boolean = true
): UseBillSummaryStreamResult {
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStream = useCallback(async (id: string, signal: AbortSignal) => {
    setError(null);
    setSummary(null);
    setStreamingText('');
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/bill/${id}/summary/stream`, { signal });

      if (!response.ok) {
        setError('AI summary unavailable');
        setIsStreaming(false);
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      // Cached response comes back as JSON
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.summary) {
          setSummary(data.summary);
        }
        setIsStreaming(false);
        return;
      }

      // SSE response — read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        setError('AI summary unavailable');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by double newlines)
        const events = buffer.split('\n\n');
        // Keep the last incomplete chunk in the buffer
        buffer = events.pop() || '';

        for (const event of events) {
          const dataLine = event.trim();
          if (!dataLine.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(dataLine.slice(6));

            if (payload.type === 'text') {
              setStreamingText(prev => prev + payload.content);
            } else if (payload.type === 'complete') {
              setSummary(payload.summary);
              setIsStreaming(false);
            } else if (payload.type === 'error') {
              setError(payload.message || 'Summary generation failed');
              setIsStreaming(false);
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

      // If stream ended without a complete event, stop streaming
      setIsStreaming(false);
    } catch {
      if (signal.aborted) return;
      setError('AI summary unavailable');
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (!billId || !enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchStream(billId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [billId, enabled, fetchStream]);

  return { summary, streamingText, isStreaming, error };
}
