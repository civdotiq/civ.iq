/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
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
  /** Answer-first opening under the question, in the server HTML. */
  lede?: string | null;
  children: ReactNode;
  relatedQuestions: ReactNode;
}

export function QuestionLayout({
  question,
  category,
  lede,
  children,
  relatedQuestions,
}: QuestionLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-grid-3">
        <p className="type-xs aicher-heading-wide text-gray-500 mb-1">{category.toUpperCase()}</p>
        <h1 className="type-2xl font-semibold text-black mb-grid-4">{question}</h1>
        {lede && (
          <p className="-mt-grid-2 mb-grid-4 max-w-3xl text-base text-gray-700 leading-relaxed">
            {lede}
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>
        {relatedQuestions}
      </div>
    </div>
  );
}
