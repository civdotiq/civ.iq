/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * AskQuestionSection — 2x2 grid of example question cards for the homepage.
 * Links to real question pages with representative bioguide IDs.
 */

import Link from 'next/link';

const EXAMPLE_QUESTIONS = [
  {
    slug: 'campaign-contributions',
    entityId: 'P000197',
    name: 'Nancy Pelosi',
    category: 'WHERE',
    question: "Where do Nancy Pelosi's campaign contributions come from?",
  },
  {
    slug: 'voting-record',
    entityId: 'J000302',
    name: 'Jim Jordan',
    category: 'HOW',
    question: 'How does Jim Jordan vote?',
  },
  {
    slug: 'donor-voting-alignment',
    entityId: 'M001153',
    name: 'Lisa Murkowski',
    category: 'WHY',
    question: "Does Lisa Murkowski's voting align with her donors?",
  },
  {
    slug: 'topic-bills',
    entityId: 'health',
    name: 'Health',
    category: 'WHAT',
    question: 'What bills are about Health?',
  },
] as const;

export function AskQuestionSection() {
  return (
    <section className="px-grid-2 sm:px-grid-3 lg:px-grid-4 py-grid-3 sm:py-grid-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between mb-grid-2">
          <h2 className="type-lg font-semibold text-black">Ask a question</h2>
          <Link href="/ask" className="type-sm text-[#3ea2d4] hover:underline">
            See all questions
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXAMPLE_QUESTIONS.map(q => (
            <Link
              key={q.slug + q.entityId}
              href={`/ask/${q.slug}/${q.entityId}`}
              className="border-2 border-black bg-white p-4 hover:bg-gray-50 transition-colors"
            >
              <p className="type-xs aicher-heading-wide text-gray-500 mb-1">{q.category}</p>
              <p className="type-sm font-medium text-[#3ea2d4]">{q.question}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
