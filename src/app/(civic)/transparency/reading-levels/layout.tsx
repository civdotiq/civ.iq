/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reading level compliance',
  description:
    'Transparency report on CIV.IQ AI-generated text: every insight is checked against a Flesch-Kincaid grade 8 reading level target.',
  alternates: { canonical: 'https://civdotiq.org/transparency/reading-levels' },
};

export default function ReadingLevelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
