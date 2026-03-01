'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const LiteModeContext = createContext(false);

/**
 * Provides lite mode state to the component tree.
 * Reads from the data-lite attribute on <html>, which is set
 * by an inline script in the root layout (before paint, no flash).
 */
export function LiteModeProvider({ children }: { children: ReactNode }) {
  const [isLite, setIsLite] = useState(false);

  useEffect(() => {
    setIsLite(document.documentElement.hasAttribute('data-lite'));
  }, []);

  return <LiteModeContext.Provider value={isLite}>{children}</LiteModeContext.Provider>;
}

/**
 * Returns true when lite/text-only mode is active.
 * Heavy components should check this and render simpler fallbacks.
 */
export function useLiteMode(): boolean {
  return useContext(LiteModeContext);
}
