/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Type definitions for XML vote data parsed from House and Senate roll call feeds.
 * These match the structure returned by fast-xml-parser for Congress.gov XML.
 */

// --- House XML Vote Types ---

export interface HouseXmlLegislator {
  '@_unaccented-name'?: string;
  '@_name-id'?: string;
  '@_party'?: string;
  '@_state'?: string;
  '@_name'?: string;
}

export interface HouseXmlRecordedVote {
  legislator?: HouseXmlLegislator;
  vote?: string;
}

export interface HouseXmlVoteData {
  'rollcall-vote'?: {
    'vote-metadata'?: {
      'vote-question'?: string;
      'vote-desc'?: string;
      'vote-result'?: string;
      'action-date'?: string;
      'action-time'?: { '#text'?: string };
      congress?: string;
      session?: string;
      rollcall_num?: string;
      legis_num?: string;
      vote_question?: string;
      vote_desc?: string;
      vote_result?: string;
      'vote-totals'?: {
        'totals-by-vote'?: {
          'yea-total'?: string;
          'nay-total'?: string;
          'present-total'?: string;
          'not-voting-total'?: string;
        };
      };
    };
    'vote-data'?: {
      'recorded-vote'?: HouseXmlRecordedVote | HouseXmlRecordedVote[];
    };
  };
}

// --- Senate XML Vote Types ---

export interface SenateXmlMember {
  first_name?: string;
  last_name?: string;
  party?: string;
  state?: string;
  vote_cast?: string;
  lis_member_id?: string;
  member_full?: string;
}

export interface SenateXmlVoteData {
  roll_call_vote?: {
    congress?: string;
    session?: string;
    vote_number?: string;
    vote_date?: string;
    question?: string;
    vote_question_text?: string;
    vote_result?: string;
    vote_result_text?: string;
    vote_document_text?: string;
    title?: string;
    document?: {
      document_name?: string;
      document_title?: string;
    };
    members?: {
      member?: SenateXmlMember | SenateXmlMember[];
    };
    count?: {
      yeas?: string;
      nays?: string;
      present?: string;
      absent?: string;
    };
  };
}
