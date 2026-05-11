/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Shared types for the SearchVariants chassis (PR 21).
 *
 * The chassis renders five listing routes (districts / states / industry /
 * regulations / topics). Each variant binds a row component and a server
 * fetcher; the wrapper, header, sidebar, facet card, and pagination are
 * shared.
 */

import type { ReactNode } from 'react';

export type VariantKind = 'districts' | 'states' | 'industry' | 'regulations' | 'topics';

export interface VariantFacetOption {
  readonly label: string;
  readonly count: number | null;
  readonly href?: string;
  readonly active?: boolean;
}

export interface VariantFacetGroup {
  readonly title: string;
  readonly options: ReadonlyArray<VariantFacetOption>;
}

export interface VariantSidebarItem {
  readonly key: string;
  readonly label: string;
  readonly count: number | null;
  readonly href?: string;
  readonly active?: boolean;
}

/**
 * District row payload — fields kept after PR 21 cuts (Correction 1):
 * code, state, seated rep, population. PVI / seat type / median income cut.
 */
export interface DistrictRow {
  readonly id: string;
  readonly code: string; // e.g. "NY-08"
  readonly state: string;
  readonly number: string;
  readonly rep: {
    readonly name: string;
    readonly initials: string;
    readonly bioguideId: string;
  };
  readonly population: number;
  readonly href: string;
}

/**
 * State row payload — fields kept after PR 21 cuts (Correction 2):
 * code + name, House delegation D/R counts, 2 senators by surname.
 * Partisan lean / top industry / governor stripe all cut.
 *
 * The HouseSplitBar is the ONE place in this chassis where party tokens
 * (red/green) render — documented in HouseSplitBar.tsx.
 */
export interface StateRow {
  readonly code: string; // "NY"
  readonly name: string; // "New York"
  readonly region: string; // "Northeast" etc.
  readonly house: {
    readonly democrats: number;
    readonly republicans: number;
    readonly independents: number;
    readonly total: number;
  };
  readonly senators: ReadonlyArray<{
    readonly bioguideId: string;
    readonly lastName: string;
    readonly fullName: string;
  }>;
  readonly href: string;
}

/**
 * Sector row payload — sector name + link only (Correction 3).
 *
 * Cycle-to-date total + top recipient are documented as living on the
 * detail page; rendering them here would require 13 leaderboard calls
 * per page load. Per the prompt, "—" is the honest fallback.
 */
export interface SectorRow {
  readonly slug: string;
  readonly name: string;
  readonly href: string;
}

/**
 * Regulation row payload — fields kept after PR 21 cuts (Correction 4):
 * doc number, title, agency, comment status, posted date. "Stage" cut.
 */
export interface RegulationRow {
  readonly id: string;
  readonly title: string;
  readonly agency: string;
  readonly docNumber: string;
  readonly publishedDate: string;
  readonly commentsCloseOn: string | null;
  readonly isOpenForComment: boolean;
  readonly href: string;
}

/**
 * Topic row payload — name + subtitle only (Correction 5).
 *
 * Bill / rep counts come from per-topic aggregation that we don't run
 * at listing scale (12 calls would be needed). Disclaimer documents
 * where to find counts.
 */
export interface TopicRow {
  readonly slug: string;
  readonly name: string;
  readonly subtitle: string;
  readonly href: string;
}

export interface VariantHeaderProps {
  readonly label: string;
  readonly title: string;
  readonly count: number;
  readonly countNoun: string;
  readonly subChip?: string;
  readonly hint?: ReactNode;
}

export interface VariantPaginationProps {
  readonly start: number;
  readonly end: number;
  readonly total: number;
  readonly elapsedMs: number;
}
