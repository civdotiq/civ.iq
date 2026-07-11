/**
 * Individual Lesson Page - SEO-optimized pages for K-12 civics lessons
 *
 * SEO Strategy: Creates dedicated pages for each lesson in the education curriculum,
 * targeting educator searches for civic education resources with real government data.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema, LearningResourceSchema } from '@/components/seo/JsonLd';
import {
  EDUCATION_CURRICULUM,
  LESSON_TOPICS,
  GRADE_LEVEL_INFO,
  getLessonBySlug,
  getAdjacentLessons,
  getC3StandardsByLesson,
  type GradeLevel,
} from '@/lib/data/education-curriculum';
import { getTermByName } from '@/lib/data/civic-glossary';
import { PrintButton } from './PrintButton';

// Grade-level color utilities — non-partisan palette (amber / interactive blue /
// gray-black). Party colors and retired green are never used for grade bands.
const GRADE_COLORS: Record<
  GradeLevel,
  { bg: string; text: string; border: string; accent: string }
> = {
  elementary: {
    bg: 'bg-[#d97706]/10',
    text: 'text-[#d97706]',
    border: 'border-[#d97706]',
    accent: '#d97706',
  },
  middle: {
    bg: 'bg-[#3ea2d4]/10',
    text: 'text-[#3ea2d4]',
    border: 'border-[#3ea2d4]',
    accent: '#3ea2d4',
  },
  high: {
    bg: 'bg-[#171717]/10',
    text: 'text-[#171717]',
    border: 'border-[#171717]',
    accent: '#171717',
  },
};

// Convert duration string like "30-40 minutes" to ISO 8601 (e.g. "PT40M")
function durationToISO(duration: string): string {
  const match = duration.match(/(\d+)(?:\s*-\s*(\d+))?\s*min/i);
  if (!match) return 'PT45M';
  const minutes = match[2] ? parseInt(match[2]) : parseInt(match[1] ?? '45');
  return `PT${minutes}M`;
}

// Generate static params for all lessons
export async function generateStaticParams() {
  return EDUCATION_CURRICULUM.map(lesson => ({
    lessonId: lesson.id.toLowerCase(),
  }));
}

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = getLessonBySlug(lessonId);

  if (!lesson) {
    return { title: 'Lesson Not Found' };
  }

  const gradeInfo = GRADE_LEVEL_INFO[lesson.gradeLevel];
  const topicLabel = LESSON_TOPICS[lesson.topic];
  const title = `${lesson.title} - ${gradeInfo.label} Civics Lesson`;
  const description = `${lesson.overview.slice(0, 150)}... Grade ${gradeInfo.grades} | ${lesson.duration}`;

  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/education/${lesson.id.toLowerCase()}` },
    keywords: [
      lesson.title,
      `${gradeInfo.label.toLowerCase()} civics lesson`,
      `${topicLabel.toLowerCase()} lesson plan`,
      'civic education',
      'government lesson plan',
      'real government data',
      ...lesson.vocabulary.slice(0, 5),
      ...lesson.c3Standards.slice(0, 3),
    ],
    openGraph: {
      title: `${lesson.title} - ${gradeInfo.label} Lesson Plan`,
      description,
      type: 'article',
    },
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { lessonId } = await params;
  const lesson = getLessonBySlug(lessonId);

  if (!lesson) {
    notFound();
  }

  const gradeInfo = GRADE_LEVEL_INFO[lesson.gradeLevel];
  const topicLabel = LESSON_TOPICS[lesson.topic];
  const colors = GRADE_COLORS[lesson.gradeLevel];
  const c3Standards = getC3StandardsByLesson(lesson.id);
  const { prev, next } = getAdjacentLessons(lesson.id);

  // Build FAQ from discussion questions for schema
  const faqItems = lesson.discussionQuestions.map(dq => ({
    question: dq.question,
    answer:
      dq.followUp ?? `This discussion question is explored in the ${lesson.title} lesson plan.`,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Education', url: 'https://civdotiq.org/education' },
          {
            name: lesson.title,
            url: `https://civdotiq.org/education/${lesson.id.toLowerCase()}`,
          },
        ]}
      />
      <LearningResourceSchema
        name={lesson.title}
        description={lesson.overview}
        url={`https://civdotiq.org/education/${lesson.id.toLowerCase()}`}
        educationalLevel={`${gradeInfo.label} (${gradeInfo.grades})`}
        teaches={lesson.objectives.map(o => o.text)}
        timeRequired={durationToISO(lesson.duration)}
        keywords={lesson.vocabulary}
        educationalAlignment={c3Standards.map(s => ({
          alignmentType: 'teaches',
          educationalFramework: 'NCSS C3 Framework',
          targetName: `${s.code}: ${s.description}`,
        }))}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/education" className="hover:text-civiq-blue">
            Education
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">{lesson.title}</span>
        </nav>

        <article>
          {/* Grade Badge + Topic Badge + Duration */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className="px-3 py-1 text-sm font-medium border-2"
                style={{
                  color: colors.accent,
                  borderColor: colors.accent,
                  backgroundColor: `${colors.accent}15`,
                }}
              >
                {gradeInfo.label} ({gradeInfo.grades})
              </span>
              <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 border-2 border-gray-200">
                {topicLabel}
              </span>
              <span className="text-sm text-gray-500">{lesson.duration}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{lesson.title}</h1>

            {/* Essential Question Callout */}
            <div
              className="p-4 border-l-4"
              style={{ borderColor: colors.accent, backgroundColor: `${colors.accent}08` }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Essential Question
              </p>
              <p className="text-lg font-medium text-gray-800">{lesson.essentialQuestion}</p>
            </div>
          </header>

          {/* Overview */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Overview
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">{lesson.overview}</p>
          </section>

          {/* C3 Standards */}
          {c3Standards.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                C3 Standards Alignment
              </h2>
              <div className="flex flex-wrap gap-2">
                {c3Standards.map(standard => (
                  <span
                    key={standard.code}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 border-2 border-gray-200"
                    title={`${standard.dimension}: ${standard.description}`}
                  >
                    {standard.code}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Learning Objectives */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Learning Objectives
            </h2>
            <ul className="space-y-2">
              {lesson.objectives.map(obj => (
                <li key={obj.id} className="flex items-start gap-3">
                  <span
                    className="mt-1 w-2 h-2 flex-shrink-0"
                    style={{ backgroundColor: colors.accent }}
                  />
                  <div>
                    <span className="text-gray-700">{obj.text}</span>
                    {obj.standard && (
                      <span className="ml-2 text-xs text-gray-400">({obj.standard})</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Materials + Vocabulary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Materials */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Materials
              </h2>
              <ul className="space-y-1">
                {lesson.materials.map((material, i) => (
                  <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">--</span>
                    {material}
                  </li>
                ))}
              </ul>
            </section>

            {/* Vocabulary */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Vocabulary
              </h2>
              <div className="flex flex-wrap gap-2">
                {lesson.vocabulary.map(term => {
                  // Only link terms that actually exist in the glossary (case-insensitive)
                  const glossaryTerm = getTermByName(term);
                  return glossaryTerm ? (
                    <Link
                      key={term}
                      href={`/glossary/${glossaryTerm.term.toLowerCase().replace(/\s+/g, '-')}`}
                      className="px-3 py-1 text-sm border-2 border-gray-200 bg-white hover:border-[#3ea2d4] hover:text-[#3ea2d4] transition-colors"
                    >
                      {term}
                    </Link>
                  ) : (
                    <span
                      key={term}
                      className="px-3 py-1 text-sm border-2 border-gray-200 bg-white text-gray-700"
                    >
                      {term}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Procedure Steps */}
          {lesson.procedure && lesson.procedure.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Procedure
              </h2>
              <div className="space-y-6">
                {lesson.procedure.map((step, i) => (
                  <div key={i} className="border-2 border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 text-sm text-white mr-2"
                          style={{ backgroundColor: colors.accent }}
                        >
                          {i + 1}
                        </span>
                        {step.phase}
                      </h3>
                      <span className="text-sm text-gray-500">{step.duration}</span>
                    </div>
                    <ol className="space-y-2 ml-8">
                      {step.instructions.map((instruction, j) => (
                        <li key={j} className="text-gray-700 text-sm list-decimal">
                          {instruction}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activities */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Activities
            </h2>
            <div className="space-y-4">
              {lesson.activities.map((activity, i) => (
                <div key={i} className="border-2 border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{activity.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200">
                        {activity.type}
                      </span>
                      <span className="text-sm text-gray-500">{activity.duration}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{activity.description}</p>
                  {activity.civiqPath && (
                    <Link
                      href={activity.civiqPath}
                      className="text-sm text-[#3ea2d4] hover:underline"
                    >
                      Open on CIV.IQ: {activity.civiqFeature ?? activity.civiqPath} &rarr;
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Discussion Questions */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Discussion Questions
            </h2>
            <ol className="space-y-4">
              {lesson.discussionQuestions.map((dq, i) => (
                <li key={i} className="border-l-4 pl-4" style={{ borderColor: colors.accent }}>
                  <p className="font-medium text-gray-800">{dq.question}</p>
                  {dq.followUp && (
                    <p className="text-sm text-gray-500 mt-1">Follow-up: {dq.followUp}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Assessment */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Assessment
            </h2>
            <p className="text-gray-700">{lesson.assessment}</p>
          </section>

          {/* Extensions */}
          {lesson.extensions && lesson.extensions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Extensions
              </h2>
              <ul className="space-y-2">
                {lesson.extensions.map((ext, i) => (
                  <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">--</span>
                    {ext}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Teacher Notes */}
          {lesson.teacherNotes && lesson.teacherNotes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Teacher Notes
              </h2>
              <div className="bg-gray-100 border-2 border-gray-200 p-4">
                <ul className="space-y-2">
                  {lesson.teacherNotes.map((note, i) => (
                    <li key={i} className="text-gray-700 text-sm">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Print Button */}
          <div className="mb-8">
            <PrintButton />
          </div>

          {/* Prev/Next Navigation */}
          <nav className="border-t-2 border-gray-200 pt-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                {prev && (
                  <Link
                    href={`/education/${prev.id.toLowerCase()}`}
                    className="text-sm text-[#3ea2d4] hover:underline"
                  >
                    &larr; Previous: {prev.title}
                  </Link>
                )}
              </div>
              <div>
                {next && (
                  <Link
                    href={`/education/${next.id.toLowerCase()}`}
                    className="text-sm text-[#3ea2d4] hover:underline"
                  >
                    Next: {next.title} &rarr;
                  </Link>
                )}
              </div>
            </div>
          </nav>

          {/* FAQ Section from Discussion Questions */}
          <FAQSection faqs={faqItems} title="Common Questions" />
        </article>

        {/* Contextual Footer */}
        <ExploreFooter
          currentSection="Education"
          relatedLinks={[
            { href: '/education', label: 'All Lessons' },
            { href: '/glossary', label: 'Civic Glossary' },
            { href: '/congress', label: 'U.S. Congress' },
            { href: '/topics', label: 'Policy Topics' },
          ]}
          dataSource="CIV.IQ Education Curriculum"
        />
      </main>
    </div>
  );
}
