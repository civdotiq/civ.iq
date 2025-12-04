/**
 * Bill Journey Timeline - Visual timeline showing a bill's progress through Congress
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useMemo } from 'react';
import {
  FileText,
  Users,
  Vote,
  ArrowLeftRight,
  PenTool,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

// Bill journey stages in order
export type BillStage =
  | 'introduced'
  | 'committee'
  | 'floor'
  | 'passed_chamber'
  | 'other_chamber'
  | 'conference'
  | 'president'
  | 'enacted'
  | 'vetoed'
  | 'failed';

export interface BillAction {
  date: string;
  description: string;
  chamber?: string;
  actionCode?: string;
  type?: string;
}

export interface BillJourneyTimelineProps {
  actions: BillAction[];
  currentStatus?: string;
  chamber?: 'House' | 'Senate';
  introducedDate?: string;
}

interface TimelineStage {
  stage: BillStage;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'pending' | 'failed';
  date?: string;
  description?: string;
}

const STAGE_CONFIG: Record<
  BillStage,
  { label: string; shortLabel: string; icon: React.ElementType }
> = {
  introduced: { label: 'Introduced', shortLabel: 'Intro', icon: FileText },
  committee: { label: 'Committee Review', shortLabel: 'Committee', icon: Users },
  floor: { label: 'Floor Debate', shortLabel: 'Floor', icon: Vote },
  passed_chamber: { label: 'Passed Chamber', shortLabel: 'Passed', icon: CheckCircle },
  other_chamber: { label: 'Other Chamber', shortLabel: 'Other', icon: ArrowLeftRight },
  conference: { label: 'Conference Committee', shortLabel: 'Conference', icon: Users },
  president: { label: 'President', shortLabel: 'President', icon: PenTool },
  enacted: { label: 'Enacted into Law', shortLabel: 'Law', icon: CheckCircle },
  vetoed: { label: 'Vetoed', shortLabel: 'Vetoed', icon: XCircle },
  failed: { label: 'Failed', shortLabel: 'Failed', icon: XCircle },
};

// Keywords to identify stages from action descriptions
const STAGE_KEYWORDS: Record<BillStage, string[]> = {
  introduced: ['introduced', 'referred to', 'read twice'],
  committee: [
    'committee',
    'subcommittee',
    'hearing',
    'markup',
    'ordered to be reported',
    'reported by',
  ],
  floor: [
    'placed on calendar',
    'considered',
    'debate',
    'amendment',
    'cloture',
    'motion to proceed',
  ],
  passed_chamber: ['passed house', 'passed senate', 'agreed to in house', 'agreed to in senate'],
  other_chamber: ['received in', 'message on', 'held at the desk'],
  conference: ['conference', 'conferees appointed'],
  president: ['presented to president', 'signed by president', 'pocket vetoed'],
  enacted: ['became public law', 'enacted', 'public law'],
  vetoed: ['vetoed', 'returned to'],
  failed: ['failed', 'rejected', 'postponed indefinitely', 'laid on table'],
};

function classifyAction(action: BillAction): BillStage | null {
  const text = action.description.toLowerCase();
  const type = action.type?.toLowerCase() ?? '';

  // Check each stage's keywords
  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) || type.includes(keyword)) {
        return stage as BillStage;
      }
    }
  }

  return null;
}

function determineStages(
  actions: BillAction[],
  currentStatus?: string,
  introducedDate?: string
): TimelineStage[] {
  // Track which stages have been reached
  const reachedStages = new Map<BillStage, { date: string; description: string }>();

  // Sort actions by date
  const sortedActions = [...actions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Classify each action
  for (const action of sortedActions) {
    const stage = classifyAction(action);
    if (stage && !reachedStages.has(stage)) {
      reachedStages.set(stage, { date: action.date, description: action.description });
    }
  }

  // Add introduced if we have an introduced date
  if (introducedDate && !reachedStages.has('introduced')) {
    reachedStages.set('introduced', { date: introducedDate, description: 'Bill introduced' });
  }

  // Determine current stage from status
  let currentStage: BillStage = 'introduced';
  if (currentStatus) {
    const status = currentStatus.toLowerCase();
    if (status.includes('enacted') || status.includes('law')) currentStage = 'enacted';
    else if (status.includes('vetoed')) currentStage = 'vetoed';
    else if (status.includes('failed')) currentStage = 'failed';
    else if (status.includes('president')) currentStage = 'president';
    else if (status.includes('conference')) currentStage = 'conference';
    else if (status.includes('passed_house') || status.includes('passed_senate'))
      currentStage = 'passed_chamber';
    else if (reachedStages.has('committee')) currentStage = 'committee';
  }

  // Build standard timeline based on what we know
  const standardFlow: BillStage[] = [
    'introduced',
    'committee',
    'floor',
    'passed_chamber',
    'other_chamber',
    'president',
    'enacted',
  ];

  const stages: TimelineStage[] = [];
  let foundCurrent = false;
  const foundFailed = reachedStages.has('failed') || reachedStages.has('vetoed');

  for (const stage of standardFlow) {
    const config = STAGE_CONFIG[stage];
    const reached = reachedStages.get(stage);

    let status: TimelineStage['status'] = 'pending';

    if (reached) {
      if (stage === currentStage && !foundFailed) {
        status = 'current';
        foundCurrent = true;
      } else if (!foundCurrent) {
        status = 'completed';
      }
    } else if (foundCurrent || foundFailed) {
      status = 'pending';
    }

    // Handle terminal states
    if (stage === 'enacted' && foundFailed) {
      continue; // Don't show enacted if bill failed
    }

    stages.push({
      stage,
      label: config.label,
      shortLabel: config.shortLabel,
      icon: config.icon,
      status,
      date: reached?.date,
      description: reached?.description,
    });

    // If we hit a terminal state, stop
    if (stage === 'enacted' && reached) break;
  }

  // Add failed/vetoed if applicable
  if (reachedStages.has('vetoed')) {
    const vetoed = reachedStages.get('vetoed')!;
    // Replace or add after president
    const presidentIndex = stages.findIndex(s => s.stage === 'president');
    if (presidentIndex >= 0) {
      stages.splice(presidentIndex + 1, stages.length, {
        stage: 'vetoed',
        ...STAGE_CONFIG.vetoed,
        status: 'failed',
        date: vetoed.date,
        description: vetoed.description,
      });
    }
  } else if (reachedStages.has('failed')) {
    const failed = reachedStages.get('failed')!;
    stages.push({
      stage: 'failed',
      ...STAGE_CONFIG.failed,
      status: 'failed',
      date: failed.date,
      description: failed.description,
    });
  }

  return stages;
}

export function BillJourneyTimeline({
  actions,
  currentStatus,
  chamber,
  introducedDate,
}: BillJourneyTimelineProps) {
  const stages = useMemo(
    () => determineStages(actions, currentStatus, introducedDate),
    [actions, currentStatus, introducedDate]
  );

  if (actions.length === 0 && !introducedDate) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Journey</h3>
        <div className="text-center py-4 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>Timeline information not yet available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill Journey</h3>
      {chamber && <p className="text-sm text-gray-500 mb-4">Originated in the {chamber}</p>}

      {/* Horizontal Timeline for Desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-civiq-blue transition-all duration-500"
              style={{
                width: `${(stages.filter(s => s.status === 'completed' || s.status === 'current').length / stages.length) * 100}%`,
              }}
            />
          </div>

          {/* Stages */}
          <div className="relative flex justify-between">
            {stages.map(stage => {
              const Icon = stage.icon;
              const isCompleted = stage.status === 'completed';
              const isCurrent = stage.status === 'current';
              const isFailed = stage.status === 'failed';

              return (
                <div
                  key={stage.stage}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / stages.length}%` }}
                >
                  {/* Icon Circle */}
                  <div
                    className={`
                      relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                      border-2 transition-all duration-300
                      ${
                        isCompleted
                          ? 'bg-civiq-blue border-civiq-blue text-white'
                          : isCurrent
                            ? 'bg-white border-civiq-blue text-civiq-blue ring-4 ring-civiq-blue/20'
                            : isFailed
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                    title={stage.description}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label */}
                  <div className="mt-3 text-center">
                    <p
                      className={`text-xs font-medium ${
                        isCompleted || isCurrent
                          ? 'text-gray-900'
                          : isFailed
                            ? 'text-red-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {stage.shortLabel}
                    </p>
                    {stage.date && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(stage.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vertical Timeline for Mobile */}
      <div className="md:hidden">
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {stages.map(stage => {
              const Icon = stage.icon;
              const isCompleted = stage.status === 'completed';
              const isCurrent = stage.status === 'current';
              const isFailed = stage.status === 'failed';

              return (
                <div key={stage.stage} className="relative flex items-start">
                  {/* Icon */}
                  <div
                    className={`
                      relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      border-2 transition-all duration-300
                      ${
                        isCompleted
                          ? 'bg-civiq-blue border-civiq-blue text-white'
                          : isCurrent
                            ? 'bg-white border-civiq-blue text-civiq-blue ring-4 ring-civiq-blue/20'
                            : isFailed
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="ml-4 flex-1 pb-2">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted || isCurrent
                          ? 'text-gray-900'
                          : isFailed
                            ? 'text-red-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {stage.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(stage.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                    {stage.description && isCurrent && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{stage.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
