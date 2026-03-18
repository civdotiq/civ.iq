/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Type Definitions
 *
 * W3C ActivityPub / ActivityStreams 2.0 types for federation.
 * Nostr reaches individuals; ActivityPub reaches institutions
 * (libraries, newsrooms, civic orgs).
 */

/** ActivityPub Actor (Service type for bot/automated accounts) */
export interface APActor {
  '@context': (string | Record<string, string>)[];
  type: 'Service';
  id: string;
  name: string;
  preferredUsername: string;
  summary: string;
  url: string;
  inbox: string;
  outbox: string;
  followers: string;
  following: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
  icon?: {
    type: 'Image';
    mediaType: string;
    url: string;
  };
}

/** ActivityPub Note (civic event as a social post) */
export interface APNote {
  type: 'Note';
  id: string;
  attributedTo: string;
  published: string;
  content: string;
  url: string;
  to: string[];
  cc: string[];
  tag: APHashtag[];
  source?: {
    content: string;
    mediaType: 'text/plain';
  };
}

/** ActivityPub Article (for longer civic events) */
export interface APArticle {
  type: 'Article';
  id: string;
  attributedTo: string;
  published: string;
  name: string;
  content: string;
  url: string;
  to: string[];
  cc: string[];
  tag: APHashtag[];
}

/** Hashtag attachment */
export interface APHashtag {
  type: 'Hashtag';
  name: string;
  href?: string;
}

/** Create Activity wrapper */
export interface APCreateActivity {
  '@context': string;
  type: 'Create';
  id: string;
  actor: string;
  published: string;
  to: string[];
  cc: string[];
  object: APNote | APArticle;
}

/** Update Activity (for corrected civic events) */
export interface APUpdateActivity {
  '@context': string;
  type: 'Update';
  id: string;
  actor: string;
  published: string;
  to: string[];
  cc: string[];
  object: APNote | APArticle;
}

/** Delete Activity (tombstone) */
export interface APDeleteActivity {
  '@context': string;
  type: 'Delete';
  id: string;
  actor: string;
  to: string[];
  object: { type: 'Tombstone'; id: string };
}

/** Accept Activity (for Follow requests) */
export interface APAcceptActivity {
  '@context': string;
  type: 'Accept';
  id: string;
  actor: string;
  object: APFollowActivity;
  to?: string[];
}

/** Follow Activity (incoming from remote actors) */
export interface APFollowActivity {
  type: 'Follow';
  id: string;
  actor: string;
  object: string;
}

/** Undo Activity (for Unfollow) */
export interface APUndoActivity {
  type: 'Undo';
  id: string;
  actor: string;
  object: APFollowActivity;
}

/** Ordered Collection (for outbox/followers) */
export interface APOrderedCollection {
  '@context': string;
  type: 'OrderedCollection';
  id: string;
  totalItems: number;
  first?: string;
  last?: string;
  orderedItems?: APCollectionItem[];
}

/** Ordered Collection Page */
export interface APOrderedCollectionPage {
  '@context': string;
  type: 'OrderedCollectionPage';
  id: string;
  partOf: string;
  totalItems: number;
  next?: string;
  prev?: string;
  orderedItems: APCollectionItem[];
}

/** Items in an OrderedCollection (activities, objects, or actor IRIs) */
export type APCollectionItem = APCreateActivity | APUpdateActivity | APNote | APArticle | string;

/** Incoming activity (union of types we handle) */
export type APIncomingActivity =
  | APFollowActivity
  | APUndoActivity
  | APUpdateActivity
  | APDeleteActivity;
