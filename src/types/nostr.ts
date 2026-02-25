/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publishing Layer Types
 * Type definitions for civic event detection, signing, and relay publishing
 */

/** Civic event types the system can detect */
export type CivicEventType =
  | 'bill-action'
  | 'bill-introduced'
  | 'vote-record'
  | 'executive-order'
  | 'comment-period'
  | 'hearing';

/** Input to the Nostr event builder */
export interface CivicEvent {
  type: CivicEventType;
  id: string;
  timestamp: number;
  title: string;
  summary: string;
  tags: string[];
  source: {
    url: string;
    api: string;
  };
  data:
    | BillActionEvent
    | BillIntroducedEvent
    | VoteRecordEvent
    | ExecutiveOrderEvent
    | CommentPeriodEvent
    | HearingEvent;
}

export interface BillActionEvent {
  billId: string;
  billType: string;
  billNumber: string;
  congress: number;
  actionText: string;
  actionDate: string;
  chamber: string;
}

export interface BillIntroducedEvent {
  billId: string;
  billType: string;
  billNumber: string;
  congress: number;
  title: string;
  sponsor: string;
  chamber: string;
  introducedDate: string;
}

export interface VoteRecordEvent {
  voteId: string;
  chamber: 'House' | 'Senate';
  rollNumber: number;
  question: string;
  result: string;
  date: string;
  yeas: number;
  nays: number;
  notVoting: number;
}

export interface ExecutiveOrderEvent {
  documentNumber: string;
  title: string;
  summary: string | null;
  eoNumber?: string;
  signingDate?: string;
  agency: string;
  url: string;
}

export interface CommentPeriodEvent {
  documentNumber: string;
  title: string;
  summary: string | null;
  agency: string;
  commentUrl?: string;
  commentsCloseOn?: string;
  daysUntilClose?: number;
  url: string;
}

export interface HearingEvent {
  packageId: string;
  title: string;
  congress: number;
  chamber: 'House' | 'Senate' | 'Joint';
  committee?: string;
  dateIssued: string;
  url: string;
}

/** Relay publishing result */
export interface RelayPublishResult {
  successCount: number;
  failureCount: number;
  successes: string[];
  failures: Array<{ url: string; error: string }>;
  eventId: string;
}

/** Nostr publisher run summary */
export interface NostrPublishRun {
  eventsDetected: number;
  eventsPublished: number;
  eventsSkipped: number;
  eventsFailed: number;
  relayResults: RelayPublishResult[];
  totalTime: number;
}
