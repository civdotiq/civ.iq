/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { FC } from 'react';
import { SectionDashboardProps } from './types';
import { SectionCard } from './SectionCard';
import { DrillDownPanel } from './DrillDownPanel';

export const SectionDashboard: FC<SectionDashboardProps> = ({
  sections,
  activeSection,
  onSectionSelect,
  onBack,
  renderSection,
}) => {
  if (activeSection) {
    const sectionConfig = sections.find(s => s.id === activeSection);
    const sectionTitle = sectionConfig?.title ?? activeSection;

    return (
      <DrillDownPanel sectionTitle={sectionTitle} onBack={onBack}>
        {renderSection(activeSection)}
      </DrillDownPanel>
    );
  }

  return (
    <div
      role="region"
      aria-label="Section overview"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6"
    >
      {sections.map(section => (
        <SectionCard key={section.id} section={section} onSelect={onSectionSelect} />
      ))}
    </div>
  );
};

SectionDashboard.displayName = 'SectionDashboard';
