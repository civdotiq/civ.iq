/**
 * Education Client Component - Interactive grade-level curriculum browser
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Target,
  Users,
  MessageSquare,
  FileText,
  ChevronRight,
  Download,
  GraduationCap,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import {
  EDUCATION_CURRICULUM,
  GRADE_LEVEL_INFO,
  LESSON_TOPICS,
  TEACHER_RESOURCES,
  type GradeLevel,
  type Lesson,
  type LessonTopic,
} from '@/lib/data/education-curriculum';

const GRADE_LEVEL_COLORS: Record<GradeLevel, { bg: string; text: string; border: string }> = {
  elementary: {
    bg: 'bg-civiq-green/10',
    text: 'text-civiq-green',
    border: 'border-civiq-green/30',
  },
  middle: {
    bg: 'bg-civiq-blue/10',
    text: 'text-civiq-blue',
    border: 'border-civiq-blue/30',
  },
  high: {
    bg: 'bg-civiq-red/10',
    text: 'text-civiq-red',
    border: 'border-civiq-red/30',
  },
};

export function EducationClient() {
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>('elementary');
  const [selectedTopic, setSelectedTopic] = useState<LessonTopic | 'all'>('all');
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const filteredLessons = useMemo(() => {
    let lessons = EDUCATION_CURRICULUM.filter(lesson => lesson.gradeLevel === selectedGradeLevel);

    if (selectedTopic !== 'all') {
      lessons = lessons.filter(lesson => lesson.topic === selectedTopic);
    }

    return lessons;
  }, [selectedGradeLevel, selectedTopic]);

  const topicsForGradeLevel = useMemo(() => {
    const topics = new Set<LessonTopic>();
    EDUCATION_CURRICULUM.filter(lesson => lesson.gradeLevel === selectedGradeLevel).forEach(
      lesson => topics.add(lesson.topic)
    );
    return Array.from(topics);
  }, [selectedGradeLevel]);

  const handleLessonToggle = (lessonId: string) => {
    setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
  };

  return (
    <div className="space-y-8">
      {/* Grade Level Tabs */}
      <div className="bg-white border-2 border-black">
        <div className="flex flex-col sm:flex-row">
          {(Object.keys(GRADE_LEVEL_INFO) as GradeLevel[]).map(level => {
            const info = GRADE_LEVEL_INFO[level];
            const colors = GRADE_LEVEL_COLORS[level];
            const isSelected = selectedGradeLevel === level;

            return (
              <button
                key={level}
                onClick={() => {
                  setSelectedGradeLevel(level);
                  setSelectedTopic('all');
                  setExpandedLesson(null);
                }}
                className={`flex-1 p-4 text-left transition-colors border-b-2 sm:border-b-0 sm:border-r-2 last:border-r-0 last:border-b-0 ${
                  isSelected
                    ? `${colors.bg} border-black`
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap
                    className={`w-5 h-5 ${isSelected ? colors.text : 'text-gray-400'}`}
                  />
                  <span className={`font-semibold ${isSelected ? colors.text : 'text-gray-700'}`}>
                    {info.label}
                  </span>
                  <span
                    className={`text-sm px-2 py-0.5 ${
                      isSelected
                        ? `${colors.bg} ${colors.text} border ${colors.border}`
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {info.grades}
                  </span>
                </div>
                <p className="text-sm text-gray-600 hidden sm:block">{info.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTopic('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedTopic === 'all'
              ? 'bg-black text-white'
              : 'bg-white border-2 border-black text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Topics ({filteredLessons.length})
        </button>
        {topicsForGradeLevel.map(topic => {
          const count = EDUCATION_CURRICULUM.filter(
            l => l.gradeLevel === selectedGradeLevel && l.topic === topic
          ).length;
          return (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedTopic === topic
                  ? 'bg-black text-white'
                  : 'bg-white border-2 border-black text-gray-700 hover:bg-gray-50'
              }`}
            >
              {LESSON_TOPICS[topic]} ({count})
            </button>
          );
        })}
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        {filteredLessons.length === 0 ? (
          <div className="bg-white border-2 border-black p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No lessons found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try selecting a different topic or grade level
            </p>
          </div>
        ) : (
          filteredLessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              isExpanded={expandedLesson === lesson.id}
              onToggle={() => handleLessonToggle(lesson.id)}
            />
          ))
        )}
      </div>

      {/* Teacher Resources Section */}
      <TeacherResourcesSection gradeLevel={selectedGradeLevel} />
    </div>
  );
}

interface LessonCardProps {
  lesson: Lesson;
  isExpanded: boolean;
  onToggle: () => void;
}

function LessonCard({ lesson, isExpanded, onToggle }: LessonCardProps) {
  const colors = GRADE_LEVEL_COLORS[lesson.gradeLevel];

  return (
    <div className="bg-white border-2 border-black">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {LESSON_TOPICS[lesson.topic]}
            </span>
          </div>
          <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>{lesson.overview}</p>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {lesson.duration}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {lesson.objectives.length} objectives
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {lesson.activities.length} activities
            </span>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Learning Objectives */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <Target className="w-5 h-5 text-civiq-blue" />
              Learning Objectives
            </h4>
            <ul className="space-y-2">
              {lesson.objectives.map(obj => (
                <li key={obj.id} className="flex items-start gap-2">
                  <span className="text-civiq-green font-bold">+</span>
                  <span className="text-gray-700">{obj.text}</span>
                  {obj.standard && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5">
                      {obj.standard}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Vocabulary */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <BookOpen className="w-5 h-5 text-civiq-blue" />
              Key Vocabulary
            </h4>
            <div className="flex flex-wrap gap-2">
              {lesson.vocabulary.map(word => (
                <Link
                  key={word}
                  href={`/glossary?search=${encodeURIComponent(word)}`}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm hover:bg-civiq-blue/10 hover:text-civiq-blue transition-colors"
                >
                  {word}
                </Link>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <Lightbulb className="w-5 h-5 text-civiq-blue" />
              Activities
            </h4>
            <div className="space-y-3">
              {lesson.activities.map((activity, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className="font-medium text-gray-900">{activity.title}</h5>
                    <span className="text-xs bg-white border border-gray-300 px-2 py-0.5 text-gray-600">
                      {activity.duration}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  {activity.civiqPath && (
                    <Link
                      href={activity.civiqPath}
                      className="inline-flex items-center gap-1 text-sm text-civiq-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Use {activity.civiqFeature} on CIV.IQ
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Discussion Questions */}
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
              <MessageSquare className="w-5 h-5 text-civiq-blue" />
              Discussion Questions
            </h4>
            <ul className="space-y-3">
              {lesson.discussionQuestions.map((dq, index) => (
                <li key={index} className="pl-4 border-l-4 border-civiq-blue/30">
                  <p className="text-gray-700 font-medium">{dq.question}</p>
                  {dq.followUp && (
                    <p className="text-sm text-gray-500 mt-1 italic">Follow-up: {dq.followUp}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Assessment */}
          {lesson.assessment && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <FileText className="w-5 h-5 text-civiq-blue" />
                Assessment
              </h4>
              <p className="text-gray-700 p-3 bg-civiq-blue/5 border-l-4 border-civiq-blue">
                {lesson.assessment}
              </p>
            </div>
          )}

          {/* Extensions */}
          {lesson.extensions && lesson.extensions.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <GraduationCap className="w-5 h-5 text-civiq-blue" />
                Extensions
              </h4>
              <ul className="space-y-1">
                {lesson.extensions.map((ext, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600">
                    <span className="text-civiq-blue">+</span>
                    {ext}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Download Button */}
          {lesson.printableId && (
            <div className="pt-4 border-t border-gray-200">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                onClick={() => {
                  // This will be implemented with actual PDF generation
                  window.print();
                }}
              >
                <Download className="w-4 h-4" />
                Print Lesson Plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TeacherResourcesSectionProps {
  gradeLevel: GradeLevel;
}

function TeacherResourcesSection({ gradeLevel }: TeacherResourcesSectionProps) {
  const resources = TEACHER_RESOURCES.filter(
    r => r.gradeLevel === 'all' || r.gradeLevel === gradeLevel
  );

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Teacher Resources</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {resources.map(resource => (
          <div
            key={resource.id}
            className="bg-white border-2 border-black p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-civiq-blue/10">
                {resource.type === 'guide' && <BookOpen className="w-5 h-5 text-civiq-blue" />}
                {resource.type === 'standards' && <Target className="w-5 h-5 text-civiq-blue" />}
                {resource.type === 'worksheet' && <FileText className="w-5 h-5 text-civiq-blue" />}
                {resource.type === 'rubric' && (
                  <GraduationCap className="w-5 h-5 text-civiq-blue" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                <button
                  className="mt-2 inline-flex items-center gap-1 text-sm text-civiq-blue hover:underline"
                  onClick={() => window.print()}
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
