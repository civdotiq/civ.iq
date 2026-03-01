'use client';

import { useLiteMode } from '@/lib/lite-mode/context';
import type { ReactNode } from 'react';

interface LiteFallbackProps {
  children: ReactNode;
  fallback: ReactNode;
}

/**
 * Renders children in normal mode, fallback in lite mode.
 * Use this to wrap heavy components (maps, charts, interactive widgets)
 * with simpler text/table alternatives.
 */
export function LiteFallback({ children, fallback }: LiteFallbackProps) {
  const isLite = useLiteMode();
  return <>{isLite ? fallback : children}</>;
}
