/**
 * Education Hub Page - K-12 Civics Curriculum for Educators
 * Server component with hero, grade-band cards, and curriculum browser
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { EducationClient } from './EducationClient';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema, ItemListSchema, CollectionPageSchema } from '@/components/seo/JsonLd';
import {
  EDUCATION_CURRICULUM,
  GRADE_LEVEL_INFO,
  LESSON_TOPICS,
  type GradeLevel,
  type LessonTopic,
} from '@/lib/data/education-curriculum';

export const metadata: Metadata = {
  title: 'Civic Education | K-12 Curriculum Using Real Government Data',
  description:
    '21 standards-aligned civics lessons for K-12 educators. Teach government structure, legislation, campaign finance, and data literacy using real data from Congress.gov, the FEC, and Census Bureau.',
  keywords: [
    'civic education',
    'civics curriculum',
    'K-12 civics',
    'government lessons',
    'NCSS C3 Framework',
    'civics lesson plans',
    'teaching government',
    'data literacy',
    'campaign finance education',
    'congressional education',
  ],
  openGraph: {
    title: 'Civic Education - CIV.IQ',
    description:
      '21 standards-aligned civics lessons using real government data for K-12 classrooms.',
    type: 'website',
  },
};

const GRADE_BAND_COLORS: Record<GradeLevel, { bg: string; text: string; border: string }> = {
  elementary: {
    bg: 'bg-civiq-green/10',
    text: 'text-civiq-green',
    border: 'border-civiq-green',
  },
  middle: {
    bg: 'bg-civiq-blue/10',
    text: 'text-civiq-blue',
    border: 'border-civiq-blue',
  },
  high: {
    bg: 'bg-civiq-red/10',
    text: 'text-civiq-red',
    border: 'border-civiq-red',
  },
};

const TOPIC_COLORS: Record<string, string> = {
  'government-structure': 'bg-gray-200 text-gray-800',
  'legislative-process': 'bg-civiq-blue/10 text-civiq-blue',
  representatives: 'bg-civiq-green/10 text-civiq-green',
  'campaign-finance': 'bg-gray-100 text-gray-600',
  elections: 'bg-civiq-blue/10 text-civiq-blue',
  'civic-participation': 'bg-civiq-red/10 text-civiq-red',
  'state-government': 'bg-teal-100 text-teal-800',
  'data-literacy': 'bg-indigo-100 text-indigo-800',
  demographics: 'bg-pink-100 text-pink-800',
};

export default function EducationPage() {
  const gradeLevels: GradeLevel[] = ['elementary', 'middle', 'high'];

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Civic Education', url: 'https://civdotiq.org/education' },
        ]}
      />
      <CollectionPageSchema
        name="Civic Education Curriculum"
        description="21 standards-aligned civics lessons for K-12 educators using real government data."
        url="https://civdotiq.org/education"
        hasPart={EDUCATION_CURRICULUM.map(l => ({
          name: l.title,
          url: `https://civdotiq.org/education/${l.id.toLowerCase()}`,
        }))}
      />
      <ItemListSchema
        name="Civics Lesson Plans"
        url="https://civdotiq.org/education"
        items={EDUCATION_CURRICULUM.map(l => ({
          name: l.title,
          url: `https://civdotiq.org/education/${l.id.toLowerCase()}`,
        }))}
        itemType="LearningResource"
      />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="px-4 pt-8 pb-10 border-b-2 border-black">
          <div className="max-w-5xl mx-auto">
            <nav className="text-sm text-gray-500 mb-6">
              <Link href="/" className="hover:text-[#3ea2d4]">
                Home
              </Link>
              <span className="mx-2">&rsaquo;</span>
              <span className="font-medium text-gray-900">Education</span>
            </nav>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Civic Education</h1>

            <p className="text-xl text-gray-600 max-w-3xl mb-4">
              {EDUCATION_CURRICULUM.length} standards-aligned lessons for K-12 educators, built on
              real government data from Congress.gov, the FEC, and Census Bureau.
            </p>

            <p className="text-sm text-gray-500 max-w-2xl">
              All lessons align with NCSS C3 Framework standards. Every data point comes from
              official government APIs updated in real time.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {/* Grade-Band Cards */}
          <section className="mb-12">
            <div className="grid md:grid-cols-3 gap-6">
              {gradeLevels.map(level => {
                const info = GRADE_LEVEL_INFO[level];
                const colors = GRADE_BAND_COLORS[level];
                const lessonCount = EDUCATION_CURRICULUM.filter(l => l.gradeLevel === level).length;

                return (
                  <div key={level} className={`border-2 border-black ${colors.bg} p-6`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold border ${colors.border} ${colors.text}`}
                      >
                        {info.grades}
                      </span>
                      <span className={`text-sm font-bold ${colors.text}`}>{info.label}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{info.unitTitle}</h2>
                    <p className="text-sm text-gray-700 mb-4">{info.bigIdea}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                      </span>
                      <Link
                        href={`/education/${EDUCATION_CURRICULUM.find(l => l.gradeLevel === level)?.id.toLowerCase()}`}
                        className={`text-sm font-medium ${colors.text} hover:underline`}
                      >
                        Start here &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Curriculum Arc */}
          <section className="mb-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              Curriculum Arc
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-700">
              <div>
                <span className="font-bold text-civiq-green">K-5: Awareness</span>
                <p className="mt-1">
                  Students discover who represents them, what representatives do, and how to contact
                  them. Concrete, personal, local.
                </p>
              </div>
              <div>
                <span className="font-bold text-civiq-blue">6-8: Systems Thinking</span>
                <p className="mt-1">
                  Students analyze how Congress works as a system — committees, bills, voting
                  records, campaign finance, state vs. federal structures.
                </p>
              </div>
              <div>
                <span className="font-bold text-civiq-red">9-12: Independent Research</span>
                <p className="mt-1">
                  Students design and execute original civic research using public data. Evidence-
                  based argument, data literacy, critical evaluation.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="mb-12 border-2 border-black p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
              Quick Start
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-bold text-gray-900 block mb-1">New to civics teaching?</span>
                <Link href="/education/e1" className="text-[#3ea2d4] hover:underline">
                  Begin with &ldquo;My Representatives&rdquo; (K-5)
                </Link>
              </div>
              <div>
                <span className="font-bold text-gray-900 block mb-1">
                  Looking for data literacy?
                </span>
                <Link href="/education/h1" className="text-[#3ea2d4] hover:underline">
                  Start with &ldquo;Data-Driven Civic Analysis&rdquo; (9-12)
                </Link>
              </div>
              <div>
                <span className="font-bold text-gray-900 block mb-1">
                  Need printable worksheets?
                </span>
                <p className="text-gray-600">
                  Every lesson below includes a downloadable worksheet for classroom use.
                </p>
              </div>
            </div>
          </section>

          {/* Scope & Sequence Grid */}
          <section className="mb-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              Scope &amp; Sequence
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {gradeLevels.map(level => {
                const info = GRADE_LEVEL_INFO[level];
                const colors = GRADE_BAND_COLORS[level];
                const lessons = EDUCATION_CURRICULUM.filter(l => l.gradeLevel === level);

                return (
                  <div key={level}>
                    <h3
                      className={`text-sm font-bold ${colors.text} mb-4 pb-1 border-b-2 ${colors.border}`}
                    >
                      {info.label} ({info.grades})
                    </h3>
                    <ol className="space-y-3">
                      {lessons.map((lesson, i) => (
                        <li key={lesson.id}>
                          <Link
                            href={`/education/${lesson.id.toLowerCase()}`}
                            className="flex items-start gap-2 group"
                          >
                            <span className="text-xs font-mono text-gray-400 mt-0.5 w-4 text-right flex-shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <span className="text-sm text-gray-700 group-hover:text-[#3ea2d4] group-hover:underline">
                                {lesson.title}
                              </span>
                              <span
                                className={`ml-2 text-[10px] px-1.5 py-0.5 inline-block ${TOPIC_COLORS[lesson.topic] || 'bg-gray-100 text-gray-600'}`}
                              >
                                {LESSON_TOPICS[lesson.topic]}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>

            {/* Topic Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500 uppercase tracking-wider mr-3">Topics:</span>
              <div className="inline-flex flex-wrap gap-2 mt-1">
                {(Object.keys(LESSON_TOPICS) as LessonTopic[]).map(topic => (
                  <span
                    key={topic}
                    className={`text-[10px] px-1.5 py-0.5 ${TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {LESSON_TOPICS[topic]}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Full Lesson Browser (Client Island) */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              Browse All Lessons
            </h2>
            <EducationClient />
          </section>

          {/* Educator Note */}
          <div className="mt-12 p-4 bg-[#3ea2d4]/5 border-2 border-[#3ea2d4]/20">
            <p className="text-sm text-gray-600">
              <strong className="text-[#3ea2d4]">For Educators:</strong> These lessons are designed
              to be flexible and adaptable to your classroom needs. Each lesson includes learning
              objectives aligned to national standards, hands-on activities using CIV.IQ, discussion
              questions, and assessment guidelines. All CIV.IQ data is sourced from official
              government APIs and updated in real-time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-5xl mx-auto px-4">
          <ExploreFooter
            currentSection="Education"
            relatedLinks={[
              { href: '/glossary', label: 'Civic Glossary' },
              { href: '/congress', label: 'U.S. Congress' },
              { href: '/topics', label: 'Policy Topics' },
              { href: '/data-sources', label: 'Data Sources' },
            ]}
            dataSource="CIV.IQ Curriculum"
          />
        </div>
      </main>
    </>
  );
}
