/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publishing Layer Types
 * Type definitions for civic event detection, signing, and relay publishing
 */

/** Civic event types the system can detect */
export type CivicEventType = 'bill-action' | 'bill-introduced' | 'vote-record';

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
  data: BillActionEvent | BillIntroducedEvent | VoteRecordEvent;
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
