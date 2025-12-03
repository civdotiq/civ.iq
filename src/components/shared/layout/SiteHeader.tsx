/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * SiteHeader - Systematic logo placement following Ulm School principles
 * - Fixed 64px height (8px grid multiple)
 * - 2px black border bottom (Aicher's Lufthansa approach)
 * - Logo positioned with 16px padding (grid-aligned)
 * - Functions as navigation home link
 * - Includes Federal/State/Local dropdown navigation
 */

import { Header } from '@/shared/components/navigation/Header';

export function SiteHeader() {
  return <Header />;
}
