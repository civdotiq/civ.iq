/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Wording for the "Who is my state representative in [State]?" hub.
 *
 * People search for "state representative" whatever their state calls the
 * office, so the title and h1 keep that phrase. The lede then names the real
 * offices: Assemblymember in California, Delegate in Maryland, a one-house
 * Legislature of senators in Nebraska, a council in DC.
 */

import { getLegislatorRoleTitle } from '@/types/state-legislature';

export interface HubCopy {
  /** Page <title> before the "| CIV.IQ" template. */
  title: string;
  h1: string;
  lede: string;
  /** Meta description and FAQ answer. */
  description: string;
}

export interface HubCopyInput {
  stateCode: string;
  stateName: string;
  /** "Michigan Legislature", "Council of the District of Columbia". */
  legislatureName: string;
  /** Members listed across both chambers. */
  memberCount: number;
  /** Chambers where at least one district elects more than one member. */
  multiMember?: { upper: boolean; lower: boolean };
}

export function getHubCopy({
  stateCode,
  stateName,
  legislatureName,
  memberCount,
  multiMember,
}: HubCopyInput): HubCopy {
  const code = stateCode.toUpperCase();
  const lookupLine = 'Enter your home address to find yours.';
  const contactLine = `Phone numbers and email for all ${memberCount} members of the ${legislatureName}.`;

  if (code === 'DC') {
    return {
      title: 'Who Is My DC Councilmember?',
      h1: 'Who is my councilmember in the District of Columbia?',
      lede:
        'DC has a council instead of a state legislature. Every resident is represented by the councilmember for their ward and by the at-large members, including the Chairman. ' +
        lookupLine,
      description: `Find your DC councilmember by address. ${contactLine}`,
    };
  }

  if (code === 'NE') {
    return {
      title: 'Who Is My Nebraska State Senator?',
      h1: 'Who is my state senator in Nebraska?',
      lede:
        'Nebraska has a one-house, officially nonpartisan Legislature. Each district elects one State Senator, and there is no state house of representatives. ' +
        lookupLine,
      description: `Find your Nebraska State Senator by address. ${contactLine}`,
    };
  }

  if (code === 'PR') {
    return {
      title: 'Who Is My Puerto Rico Legislator?',
      h1: 'Who is my legislator in Puerto Rico?',
      lede:
        'Puerto Rico’s Legislative Assembly has a Senate and a House of Representatives. Each voter is represented by district members and by at-large members of both chambers. ' +
        lookupLine,
      description: `Find your Puerto Rico senators and representatives by address. ${contactLine}`,
    };
  }

  const upper = getLegislatorRoleTitle(code, 'upper');
  const lower = getLegislatorRoleTitle(code, 'lower');
  // Arizona, New Jersey and Washington elect two House members per district;
  // Vermont and West Virginia elect several senators per district.
  const yourUpper = multiMember?.upper ? `${upper}s` : upper;
  const yourLower = multiMember?.lower ? `${lower}s` : lower;
  return {
    title: `Who Is My ${stateName} State Representative?`,
    h1: `Who is my state representative in ${stateName}?`,
    lede: `In ${stateName}, your state legislators are your ${yourUpper} and your ${yourLower}, who serve in the ${legislatureName}. ${lookupLine}`,
    description: `Find your ${stateName} ${upper} and ${lower} by address. ${contactLine}`,
  };
}

/**
 * Party as shown on the roster. OpenStates records fusion tickets
 * ("Democratic/Working Families", "Democratic-Farmer-Labor") as distinct
 * names; they read as the major party they caucus with. Anything else —
 * Nebraska's "Nonpartisan", Puerto Rico's parties — is shown as recorded.
 */
export function rosterPartyLabel(party: string): string {
  if (/^Democratic/i.test(party)) return 'Democratic';
  if (/^Republican/i.test(party)) return 'Republican';
  return party || 'Unknown';
}

/**
 * Party as a label on one member's card: "Democrat", matching the federal
 * roster, where the chamber roll-up keeps the adjective ("12 Democratic").
 */
export function memberPartyLabel(party: string): string {
  const label = rosterPartyLabel(party);
  return label === 'Democratic' ? 'Democrat' : label;
}

/** Natural district order: 2 before 10, 62A before 62B, then named seats. */
export function compareDistricts(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Seats that represent everyone in the jurisdiction for their chamber: DC's
 * at-large members and Chairman, Puerto Rico's at-large senators and
 * representatives. A lookup adds them to every address's result.
 */
export function isAtLargeDistrict(district: string): boolean {
  return /^(at-large|chairman)$/i.test(district.trim());
}
