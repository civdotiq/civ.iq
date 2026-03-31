/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ReactNode } from 'react';

export interface SectionStat {
  label: string;
  value: string | number | undefined; // undefined renders "—"
}

export interface SectionCardConfig {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  stats: SectionStat[];
  loading?: boolean;
}

export interface SectionDashboardProps {
  sections: SectionCardConfig[];
  activeSection: string | null;
  onSectionSelect: (id: string) => void;
  onBack: () => void;
  renderSection: (id: string) => ReactNode;
}
