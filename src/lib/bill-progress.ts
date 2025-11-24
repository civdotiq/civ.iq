/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Progress Tracking Utility
 *
 * Analyzes bill actions and sponsorships to determine legislative progress,
 * current stage, and estimated completion percentage.
 */

import type {
  BillProgress,
  BillProgressStage,
  BillProgressMilestone,
  StateBill,
  StateBillAction,
  StateChamber,
} from '@/types/state-legislature';

/**
 * Keywords that indicate specific bill stages
 */
const STAGE_KEYWORDS = {
  introduced: ['introduced', 'filed', 'prefiled', 'read first time'],
  committee: [
    'referred to committee',
    'committee hearing',
    'in committee',
    'committee report',
    'committee recommended',
  ],
  floor: [
    'second reading',
    'third reading',
    'floor',
    'calendar',
    'placed on calendar',
    'general orders',
  ],
  'passed-chamber': ['passed', 'adopted', 'concurred'],
  'second-chamber': ['sent to', 'transmitted to', 'received from'],
  'passed-legislature': ['passed both', 'conference committee', 'enrolled'],
  executive: ['sent to governor', 'transmitted to governor', 'to governor'],
  signed: ['signed by governor', 'approved by governor', 'became law', 'chaptered'],
  vetoed: ['vetoed', 'veto'],
  failed: ['failed', 'defeated', 'rejected', 'tabled', 'indefinitely postponed'],
};

/**
 * Determine bill stage from action description
 */
function determineStageFromAction(description: string): BillProgressStage | null {
  const lowerDesc = description.toLowerCase();

  // Check each stage's keywords
  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return stage as BillProgressStage;
    }
  }

  return null;
}

/**
 * Calculate percentage complete based on stage
 */
function calculatePercentComplete(stage: BillProgressStage): number {
  const stageProgress: Record<BillProgressStage, number> = {
    introduced: 10,
    committee: 25,
    floor: 40,
    'passed-chamber': 60,
    'second-chamber': 75,
    'passed-legislature': 90,
    executive: 95,
    signed: 100,
    vetoed: 100,
    failed: 0,
  };

  return stageProgress[stage] ?? 0;
}

/**
 * Get user-friendly label for stage
 */
function getStageLabel(stage: BillProgressStage, chamber: StateChamber): string {
  const labels: Record<BillProgressStage, string> = {
    introduced: `Introduced in ${chamber === 'upper' ? 'Senate' : 'House'}`,
    committee: 'In Committee Review',
    floor: `${chamber === 'upper' ? 'Senate' : 'House'} Floor Action`,
    'passed-chamber': `Passed ${chamber === 'upper' ? 'Senate' : 'House'}`,
    'second-chamber': `Sent to ${chamber === 'upper' ? 'House' : 'Senate'}`,
    'passed-legislature': 'Passed Both Chambers',
    executive: 'Awaiting Governor Action',
    signed: 'Signed into Law',
    vetoed: 'Vetoed by Governor',
    failed: 'Failed',
  };

  return labels[stage] ?? stage;
}

/**
 * Create milestone timeline based on actions
 */
function createMilestones(
  actions: StateBillAction[],
  currentStage: BillProgressStage,
  chamber: StateChamber
): BillProgressMilestone[] {
  const milestoneStages: BillProgressStage[] = [
    'introduced',
    'committee',
    'floor',
    'passed-chamber',
    'second-chamber',
    'passed-legislature',
    'executive',
    'signed',
  ];

  const milestones: BillProgressMilestone[] = [];

  for (const stage of milestoneStages) {
    // Find if this stage has been completed
    const stageAction = actions.find(action => {
      const detectedStage = determineStageFromAction(action.description);
      return detectedStage === stage;
    });

    const isCompleted = stageAction !== undefined;
    const isCurrent = stage === currentStage;

    milestones.push({
      stage,
      label: getStageLabel(stage, chamber),
      date: stageAction?.date,
      completed: isCompleted,
      isCurrent,
      description: stageAction?.description,
    });

    // Stop at current stage for incomplete bills
    if (isCurrent && !isCompleted) {
      break;
    }
  }

  return milestones;
}

/**
 * Estimate passage probability based on sponsorship and committee factors
 */
function estimatePassageProbability(bill: StateBill):
  | {
      passageScore: number;
      factors: string[];
    }
  | undefined {
  const factors: string[] = [];
  let score = 50; // Base score

  // Primary sponsor impact
  const primarySponsors = bill.sponsorships?.filter(s => s.primary) ?? [];
  if (primarySponsors.length > 0) {
    score += 10;
    factors.push(`${primarySponsors.length} primary sponsor(s)`);
  }

  // Co-sponsor impact
  const coSponsors = bill.sponsorships?.filter(s => !s.primary) ?? [];
  if (coSponsors.length > 5) {
    score += 15;
    factors.push(`Strong co-sponsor support (${coSponsors.length} co-sponsors)`);
  } else if (coSponsors.length > 0) {
    score += 5;
    factors.push(`${coSponsors.length} co-sponsor(s)`);
  }

  // Bipartisan support (check if sponsors are from multiple parties if we have party data)
  // Note: OpenStates doesn't always provide party affiliation in sponsorship data
  // This would need to be enhanced with legislator party data

  // Recent activity
  const recentActions = bill.actions?.slice(0, 5) ?? [];
  const hasRecentActivity = recentActions.length > 0;
  if (hasRecentActivity) {
    const latestAction = recentActions[0];
    const daysSinceAction = latestAction?.date
      ? Math.floor((Date.now() - new Date(latestAction.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceAction < 30) {
      score += 10;
      factors.push('Recent legislative activity');
    } else if (daysSinceAction > 90) {
      score -= 10;
      factors.push('No recent activity');
    }
  }

  // Cap score between 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    passageScore: score,
    factors,
  };
}

/**
 * Analyze bill and generate progress tracking data
 */
export function analyzeBillProgress(bill: StateBill): BillProgress {
  // Sort actions by date (most recent first)
  const sortedActions = [...(bill.actions ?? [])].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Determine current stage from most recent action
  let currentStage: BillProgressStage = 'introduced';

  for (const action of sortedActions) {
    const stage = determineStageFromAction(action.description);
    if (stage) {
      currentStage = stage;
      break;
    }
  }

  // Calculate percent complete
  const percentComplete = calculatePercentComplete(currentStage);

  // Identify next action
  const nextAction = sortedActions[0]
    ? {
        description: sortedActions[0].description,
        estimatedDate: sortedActions[0].date,
        location: sortedActions[0].organization,
      }
    : undefined;

  // Create milestones
  const milestones = createMilestones(sortedActions.reverse(), currentStage, bill.chamber);

  // Recent actions (last 5)
  const recentActions = sortedActions.slice(0, 5).map(action => ({
    date: action.date,
    description: action.description,
    actor: action.organization,
  }));

  // Estimate passage probability
  const probability = estimatePassageProbability(bill);

  return {
    billId: bill.id,
    identifier: bill.identifier,
    title: bill.title,
    state: bill.state,
    chamber: bill.chamber,
    currentStage,
    percentComplete,
    nextAction,
    milestones,
    recentActions,
    probability,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get stage color for UI (using Otl Aicher color palette)
 */
export function getStageColor(stage: BillProgressStage): string {
  const colors: Record<BillProgressStage, string> = {
    introduced: '#3ea2d4', // civiq-blue
    committee: '#3ea2d4',
    floor: '#3ea2d4',
    'passed-chamber': '#0a9338', // civiq-green
    'second-chamber': '#3ea2d4',
    'passed-legislature': '#0a9338',
    executive: '#3ea2d4',
    signed: '#0a9338',
    vetoed: '#e11d07', // civiq-red
    failed: '#e11d07',
  };

  return colors[stage] ?? '#3ea2d4';
}

/**
 * Get stage icon name (for UI components)
 */
export function getStageIcon(stage: BillProgressStage): string {
  const icons: Record<BillProgressStage, string> = {
    introduced: 'file-text',
    committee: 'users',
    floor: 'message-square',
    'passed-chamber': 'check-circle',
    'second-chamber': 'arrow-right',
    'passed-legislature': 'check-circle',
    executive: 'user',
    signed: 'check',
    vetoed: 'x-circle',
    failed: 'x',
  };

  return icons[stage] ?? 'circle';
}
