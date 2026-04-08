/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * QuestionLayout — shared pod-grid layout for all question-template pages.
 *
 * Renders: category label → question h1 → 2-column pod grid → related questions.
 * Server component.
 */

import type { ReactNode } from 'react';

interface QuestionLayoutProps {
  question: string;
  category: string;
  children: ReactNode;
  relatedQuestions: ReactNode;
}

export function QuestionLayout({
  question,
  category,
  children,
  relatedQuestions,
}: QuestionLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-grid-3">
        <p className="type-xs aicher-heading-wide text-gray-500 mb-1">{category.toUpperCase()}</p>
        <h1 className="type-2xl font-semibold text-black mb-grid-4">{question}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>
        {relatedQuestions}
      </div>
    </div>
  );
}
