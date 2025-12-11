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
  ChevronDown,
  Download,
  GraduationCap,
  Lightbulb,
  ExternalLink,
  Package,
  ClipboardList,
  Award,
  HelpCircle,
  Bookmark,
  CheckSquare,
} from 'lucide-react';
import {
  EDUCATION_CURRICULUM,
  GRADE_LEVEL_INFO,
  LESSON_TOPICS,
  TEACHER_RESOURCES,
  WORKSHEETS,
  ASSESSMENT_RUBRICS,
  C3_STANDARDS,
  getWorksheetByLessonId,
  getC3StandardsByLesson,
  type GradeLevel,
  type Lesson,
  type LessonTopic,
  type Worksheet,
  type AssessmentRubric,
  type C3Standard,
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
  const [activeTab, setActiveTab] = useState<'lessons' | 'worksheets' | 'rubrics' | 'standards'>(
    'lessons'
  );

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

  const worksheetsForGradeLevel = useMemo(() => {
    return WORKSHEETS.filter(w => w.gradeLevel === selectedGradeLevel);
  }, [selectedGradeLevel]);

  const rubricForGradeLevel = useMemo(() => {
    return ASSESSMENT_RUBRICS.find(r => r.gradeLevel === selectedGradeLevel);
  }, [selectedGradeLevel]);

  const standardsForGradeLevel = useMemo(() => {
    const lessonIds = EDUCATION_CURRICULUM.filter(l => l.gradeLevel === selectedGradeLevel).map(
      l => l.id
    );
    return C3_STANDARDS.filter(s => s.lessons.some(l => lessonIds.includes(l)));
  }, [selectedGradeLevel]);

  const handleLessonToggle = (lessonId: string) => {
    setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
  };

  const gradeLevelInfo = GRADE_LEVEL_INFO[selectedGradeLevel];

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

      {/* Unit Overview Box */}
      <div className={`p-4 border-2 border-black ${GRADE_LEVEL_COLORS[selectedGradeLevel].bg}`}>
        <div className="flex items-start gap-3">
          <Bookmark
            className={`w-6 h-6 ${GRADE_LEVEL_COLORS[selectedGradeLevel].text} flex-shrink-0 mt-0.5`}
          />
          <div>
            <h2 className={`text-lg font-bold ${GRADE_LEVEL_COLORS[selectedGradeLevel].text}`}>
              Unit: {gradeLevelInfo.unitTitle}
            </h2>
            <p className="text-gray-700 mt-1">{gradeLevelInfo.bigIdea}</p>
          </div>
        </div>
      </div>

      {/* Content Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-gray-200 pb-2">
        {[
          { id: 'lessons', label: 'Lessons', icon: BookOpen, count: filteredLessons.length },
          {
            id: 'worksheets',
            label: 'Worksheets',
            icon: FileText,
            count: worksheetsForGradeLevel.length,
          },
          { id: 'rubrics', label: 'Rubric', icon: Award, count: rubricForGradeLevel ? 1 : 0 },
          {
            id: 'standards',
            label: 'C3 Standards',
            icon: CheckSquare,
            count: standardsForGradeLevel.length,
          },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lessons Tab Content */}
      {activeTab === 'lessons' && (
        <>
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
        </>
      )}

      {/* Worksheets Tab Content */}
      {activeTab === 'worksheets' && (
        <WorksheetsSection worksheets={worksheetsForGradeLevel} gradeLevel={selectedGradeLevel} />
      )}

      {/* Rubrics Tab Content */}
      {activeTab === 'rubrics' && rubricForGradeLevel && (
        <RubricSection rubric={rubricForGradeLevel} />
      )}

      {/* Standards Tab Content */}
      {activeTab === 'standards' && <StandardsSection standards={standardsForGradeLevel} />}

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
  const worksheet = getWorksheetByLessonId(lesson.id);
  const c3Standards = getC3StandardsByLesson(lesson.id);

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
            <span className={`text-sm font-mono ${colors.text}`}>{lesson.id}</span>
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
            {c3Standards.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="w-4 h-4" />
                {c3Standards.length} C3 standards
              </span>
            )}
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
          {/* Essential Question */}
          <div className={`p-4 ${colors.bg} border-l-4 ${colors.border.replace('/30', '')}`}>
            <div className="flex items-start gap-2">
              <HelpCircle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
              <div>
                <h4 className={`font-semibold ${colors.text}`}>Essential Question</h4>
                <p className="text-gray-800 mt-1 text-lg italic">{lesson.essentialQuestion}</p>
              </div>
            </div>
          </div>

          {/* C3 Standards Badges */}
          {c3Standards.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <CheckSquare className="w-5 h-5 text-civiq-blue" />
                C3 Framework Standards
              </h4>
              <div className="flex flex-wrap gap-2">
                {c3Standards.map(std => (
                  <span
                    key={std.code}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs border border-gray-300"
                    title={std.description}
                  >
                    <span className="font-mono font-medium">{std.code}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">{std.dimension}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

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
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 font-mono">
                      {obj.standard}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Materials */}
          {lesson.materials.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Package className="w-5 h-5 text-civiq-blue" />
                Materials Needed
              </h4>
              <ul className="grid sm:grid-cols-2 gap-2">
                {lesson.materials.map((material, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600">
                    <span className="text-gray-400">•</span>
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {/* Procedure (if available) */}
          {lesson.procedure && lesson.procedure.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <ClipboardList className="w-5 h-5 text-civiq-blue" />
                Procedure
              </h4>
              <div className="space-y-4">
                {lesson.procedure.map((step, index) => (
                  <div key={index} className="border-l-2 border-gray-300 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-black text-white text-xs font-bold px-2 py-1">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{step.phase}</span>
                      <span className="text-sm text-gray-500">({step.duration})</span>
                    </div>
                    <ul className="space-y-1">
                      {step.instructions.map((instruction, i) => (
                        <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-gray-300">→</span>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-white border border-gray-300 px-2 py-0.5 text-gray-600 capitalize">
                        {activity.type.replace('-', ' ')}
                      </span>
                      <span className="text-xs bg-white border border-gray-300 px-2 py-0.5 text-gray-600">
                        {activity.duration}
                      </span>
                    </div>
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

          {/* Teacher Notes */}
          {lesson.teacherNotes && lesson.teacherNotes.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200">
              <h4 className="flex items-center gap-2 font-semibold text-yellow-800 mb-2">
                <Lightbulb className="w-5 h-5" />
                Teacher Notes
              </h4>
              <ul className="space-y-1">
                {lesson.teacherNotes.map((note, index) => (
                  <li key={index} className="text-yellow-900 text-sm flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    {note}
                  </li>
                ))}
              </ul>
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

          {/* Download Buttons */}
          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              onClick={() => {
                window.print();
              }}
            >
              <Download className="w-4 h-4" />
              Print Lesson Plan
            </button>
            {worksheet && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                onClick={() => {
                  // Navigate to worksheet tab or scroll to worksheet
                  const element = document.getElementById(`worksheet-${worksheet.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <FileText className="w-4 h-4" />
                View Worksheet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface WorksheetsSectionProps {
  worksheets: Worksheet[];
  gradeLevel: GradeLevel;
}

function WorksheetsSection({ worksheets, gradeLevel }: WorksheetsSectionProps) {
  const colors = GRADE_LEVEL_COLORS[gradeLevel];

  if (worksheets.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-8 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No worksheets available for this grade level</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Printable worksheets for classroom use. Each worksheet corresponds to a lesson and can be
        printed or filled out digitally.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {worksheets.map(worksheet => (
          <div
            key={worksheet.id}
            id={`worksheet-${worksheet.id}`}
            className="bg-white border-2 border-black p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`text-sm font-mono ${colors.text}`}>{worksheet.lessonId}</span>
                <h3 className="font-semibold text-gray-900">{worksheet.title}</h3>
              </div>
              <FileText className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div className="space-y-2 mb-4">
              {worksheet.fields.slice(0, 3).map((field, index) => (
                <div key={index} className="text-sm text-gray-600">
                  <span className="font-medium">{field.label}</span>
                  {field.type === 'checkbox' && field.options && (
                    <span className="text-gray-400 ml-1">({field.options.length} options)</span>
                  )}
                </div>
              ))}
              {worksheet.fields.length > 3 && (
                <p className="text-sm text-gray-400">+{worksheet.fields.length - 3} more fields</p>
              )}
            </div>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              onClick={() => window.print()}
            >
              <Download className="w-3 h-3" />
              Print Worksheet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RubricSectionProps {
  rubric: AssessmentRubric;
}

function RubricSection({ rubric }: RubricSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{rubric.title}</h3>
          <p className="text-gray-600 mt-1">
            Use this rubric to assess student understanding and skills
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          Print Rubric
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left font-semibold">Criterion</th>
              <th className="p-3 text-left font-semibold">Exemplary (4)</th>
              <th className="p-3 text-left font-semibold">Proficient (3)</th>
              <th className="p-3 text-left font-semibold">Developing (2)</th>
              <th className="p-3 text-left font-semibold">Beginning (1)</th>
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((criterion, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 border border-gray-200 font-medium text-gray-900">
                  {criterion.criterion}
                </td>
                <td className="p-3 border border-gray-200 text-sm text-gray-600">
                  {criterion.levels.exemplary}
                </td>
                <td className="p-3 border border-gray-200 text-sm text-gray-600">
                  {criterion.levels.proficient}
                </td>
                <td className="p-3 border border-gray-200 text-sm text-gray-600">
                  {criterion.levels.developing}
                </td>
                <td className="p-3 border border-gray-200 text-sm text-gray-600">
                  {criterion.levels.beginning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StandardsSectionProps {
  standards: C3Standard[];
}

function StandardsSection({ standards }: StandardsSectionProps) {
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null);

  // Group standards by dimension
  const groupedStandards = useMemo(() => {
    const groups: Record<string, C3Standard[]> = {};
    standards.forEach(std => {
      const dimension = std.dimension;
      if (!groups[dimension]) {
        groups[dimension] = [];
      }
      const dimensionGroup = groups[dimension];
      if (dimensionGroup) {
        dimensionGroup.push(std);
      }
    });
    return groups;
  }, [standards]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900">C3 Framework Standards Alignment</h3>
        <p className="text-gray-600 mt-1">
          These lessons align with the College, Career, and Civic Life (C3) Framework for Social
          Studies State Standards.
        </p>
      </div>

      {Object.entries(groupedStandards).map(([dimension, dimensionStandards]) => (
        <div key={dimension} className="border-2 border-black">
          <h4 className="p-3 bg-gray-100 font-semibold text-gray-900 border-b border-gray-200">
            {dimension}
          </h4>
          <div className="divide-y divide-gray-200">
            {dimensionStandards.map(std => (
              <div key={std.code} className="p-3">
                <button
                  onClick={() =>
                    setExpandedStandard(expandedStandard === std.code ? null : std.code)
                  }
                  className="w-full text-left flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="font-mono text-sm text-civiq-blue">{std.code}</span>
                    <p className="text-gray-700 mt-1">{std.description}</p>
                  </div>
                  {expandedStandard === std.code ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedStandard === std.code && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Addressed in lessons:</p>
                    <div className="flex flex-wrap gap-1">
                      {std.lessons.map(lessonId => (
                        <span
                          key={lessonId}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono"
                        >
                          {lessonId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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
                {resource.type === 'quick-reference' && (
                  <FileText className="w-5 h-5 text-civiq-blue" />
                )}
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
