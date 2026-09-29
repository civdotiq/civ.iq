/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * What a Senate roll call voted on. senate.gov's vote menu titles amendment
 * votes "<Sponsor> Amdt. No. N; <purpose>", and the menu reader used the
 * tail as the bill title — so every amendment to S. 4668 showed up as a
 * different "title" for S. 4668. Fixtures are the real 119th/2nd-session
 * menu entries and roll-call XML headers (rolls 241-250, 2026-09-23..28).
 */

import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import {
  compactRoll,
  expandRoll,
  measureTitlesFromMenu,
  senateVoteFromMenu,
  type SenateMenuEntry,
  type SenateVoteMenu,
} from '@/features/representatives/services/roll-call-corpus';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const NIL_BILL_TITLE =
  'A bill to protect the name, image, and likeness rights of, and provide protections for, student athletes and to promote fair competition among intercollegiate athletics, and for other purposes.';

// Verbatim from vote_menu_119_2.xml (question keeps its <measure> markup,
// as the sync script mirrors it).
const MENU_ENTRIES: SenateMenuEntry[] = [
  {
    n: 250,
    d: '2026-09-28',
    q: 'On Passage of the Bill',
    r: 'Passed',
    i: 'S. 4668',
    t: `S. 4668, as amended; ${NIL_BILL_TITLE}`,
  },
  {
    n: 249,
    d: '2026-09-28',
    q: 'On the Amendment <measure>S.Amdt. 6835</measure>',
    r: 'Rejected',
    i: 'S. 4668',
    t: 'Booker Amdt. No. 6835; To establish certain standards with respect to coaches of varsity sports teams.',
  },
  {
    n: 246,
    d: '2026-09-28',
    q: 'On the Amendment <measure>S.Amdt. 6758</measure>',
    r: 'Rejected',
    i: 'S. 4668',
    t: 'Paul Amdt. No. 6758; To improve the bill.',
  },
  {
    n: 242,
    d: '2026-09-24',
    q: 'On the Amendment <measure>S.Amdt. 6776</measure>',
    r: 'Agreed to',
    i: 'S. 4668',
    t: 'Amdt. No. 6776; In the nature of a substitute.',
  },
  {
    n: 241,
    d: '2026-09-23',
    q: 'On the Nomination',
    r: 'Confirmed',
    i: 'PN999-1',
    t: 'Confirmation: Angela Veronica Colmenero, of T.X., to be U.S. District Judge for the Southern District of Texas',
  },
  {
    n: 227,
    d: '2026-08-08',
    q: 'On the Motion to Table <measure>S.Amdt. 6747</measure>',
    r: 'Agreed to',
    i: 'H.R. 6500',
    t: 'Motion to Table Budd Amdt. No. 6747; To strike section 2019.',
  },
];

const MENU: SenateVoteMenu = {
  congress: 119,
  sessions: { '2': MENU_ENTRIES },
  updatedAt: '2026-09-29T00:00:00.000Z',
};

function entry(n: number): SenateMenuEntry {
  const found = MENU_ENTRIES.find(e => e.n === n);
  if (!found) throw new Error(`no fixture for roll ${n}`);
  return found;
}

describe('senateVoteFromMenu', () => {
  const titles = measureTitlesFromMenu(MENU);

  it('keeps the bill title for an amendment vote and moves the purpose to the amendment', () => {
    const vote = senateVoteFromMenu(entry(249), 119, titles);
    expect(vote.question).toBe('On the Amendment S.Amdt. 6835');
    expect(vote.bill).toEqual({ congress: 119, type: 'S', number: '4668', title: NIL_BILL_TITLE });
    expect(vote.amendment).toEqual({
      number: 'S.Amdt. 6835',
      purpose: 'To establish certain standards with respect to coaches of varsity sports teams.',
      sponsorLabel: 'Booker Amdt. No. 6835',
    });
    expect(vote.nomination).toBeUndefined();
  });

  it('gives every amendment to the same bill the same bill title', () => {
    const billTitles = [249, 246, 242].map(n => senateVoteFromMenu(entry(n), 119, titles).bill);
    expect(new Set(billTitles.map(b => b?.title))).toEqual(new Set([NIL_BILL_TITLE]));
    expect(senateVoteFromMenu(entry(242), 119, titles).amendment).toEqual({
      number: 'S.Amdt. 6776',
      purpose: 'In the nature of a substitute.',
      sponsorLabel: 'Amdt. No. 6776',
    });
  });

  it('falls back to the bill number (never the purpose) when no sibling vote names the bill', () => {
    const vote = senateVoteFromMenu(entry(227), 119, titles);
    expect(vote.bill?.title).toBe('H.R. 6500');
    expect(vote.amendment).toEqual({ number: 'S.Amdt. 6747', purpose: 'To strike section 2019.' });
    expect(vote.question).toBe('On the Motion to Table S.Amdt. 6747');
  });

  it('keeps plain bill votes unchanged', () => {
    const vote = senateVoteFromMenu(entry(250), 119, titles);
    expect(vote.bill?.title).toBe(NIL_BILL_TITLE);
    expect(vote.amendment).toBeUndefined();
    expect(vote.question).toBe('On Passage of the Bill');
  });

  it('describes nomination votes by the nominee, with no bill', () => {
    const vote = senateVoteFromMenu(entry(241), 119, titles);
    expect(vote.bill).toBeUndefined();
    expect(vote.nomination).toEqual({
      number: 'PN999-1',
      description:
        'Angela Veronica Colmenero, of T.X., to be U.S. District Judge for the Southern District of Texas',
    });
  });
});

// ── Roll-call XML (live fallback + mirror ingest) ────────────────────

function rollXml(header: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><roll_call_vote>
  <congress>119</congress><session>2</session><congress_year>2026</congress_year>
  ${header}
  <members><member><member_full>Mullin (R-OK)</member_full><last_name>Mullin</last_name><party>R</party><state>OK</state><vote_cast>Nay</vote_cast><lis_member_id>S419</lis_member_id></member></members>
</roll_call_vote>`;
}

const XML_248 = rollXml(`<vote_number>248</vote_number>
  <vote_date>September 28, 2026,  08:41 PM</vote_date>
  <vote_question_text>On the Amendment S.Amdt. 6805 to S.Amdt. 6776 to S. 4668 (No short title on file)</vote_question_text>
  <vote_document_text>To increase the limitation on funding for post-eligibility insurance and catastrophic injury for student athletes.</vote_document_text>
  <question>On the Amendment</question>
  <vote_title>Booker Amdt. No. 6805</vote_title>
  <majority_requirement>1/2</majority_requirement>
  <vote_result>Amendment Rejected</vote_result>
  <document><document_congress>119</document_congress><document_type>S.Amdt.</document_type><document_number/><document_name/><document_title/><document_short_title/></document>
  <amendment><amendment_number>S.Amdt. 6805</amendment_number><amendment_to_amendment_number>S.Amdt. 6776</amendment_to_amendment_number><amendment_to_amendment_to_amendment_number/><amendment_to_document_number>S. 4668</amendment_to_document_number><amendment_to_document_short_title>No short title on file</amendment_to_document_short_title><amendment_purpose>To increase the limitation on funding for post-eligibility insurance and catastrophic injury for student athletes.</amendment_purpose></amendment>`);

const XML_241 = rollXml(`<vote_number>241</vote_number>
  <vote_date>September 23, 2026,  02:16 PM</vote_date>
  <vote_question_text>On the Nomination PN999-1</vote_question_text>
  <question>On the Nomination</question>
  <vote_title>Confirmation: Angela Veronica Colmenero, of T.X., to be U.S. District Judge for the Southern District of Texas</vote_title>
  <majority_requirement>1/2</majority_requirement>
  <vote_result>Nomination Confirmed</vote_result>
  <document><document_congress>119</document_congress><document_type>PN</document_type><document_number>999-1</document_number><document_name>PN999-1</document_name><document_title>Angela Veronica Colmenero, of Texas, to be United States District Judge for the Southern District of Texas</document_title><document_short_title/></document>
  <amendment><amendment_number/><amendment_to_amendment_number/><amendment_to_amendment_to_amendment_number/><amendment_to_document_number/><amendment_to_document_short_title/><amendment_purpose>No Statement of Purpose on File.</amendment_purpose></amendment>`);

const XML_243 = rollXml(`<vote_number>243</vote_number>
  <vote_date>September 24, 2026,  11:40 AM</vote_date>
  <vote_question_text>On the Cloture Motion S. 4668</vote_question_text>
  <question>On the Cloture Motion</question>
  <vote_title>Motion to Invoke Cloture: S. 4668, as Amended</vote_title>
  <majority_requirement>3/5</majority_requirement>
  <vote_result>Cloture Motion Agreed to</vote_result>
  <document><document_congress>119</document_congress><document_type>S.</document_type><document_number>4668</document_number><document_name>S. 4668</document_name><document_title>${NIL_BILL_TITLE}</document_title><document_short_title/></document>
  <amendment><amendment_number/><amendment_to_amendment_number/><amendment_to_amendment_to_amendment_number/><amendment_to_document_number/><amendment_to_document_short_title/><amendment_purpose>No Statement of Purpose on File.</amendment_purpose></amendment>`);

describe('parseSenateRollCallXML measure fields', () => {
  it('parses an amendment vote: bill = the amended measure, purpose on the amendment', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML_248, 119, 2, 248);
    expect(roll?.bill).toEqual({ congress: 119, type: 'S', number: '4668', title: 'S. 4668' });
    expect(roll?.amendment).toEqual({
      number: 'S.Amdt. 6805',
      purpose:
        'To increase the limitation on funding for post-eligibility insurance and catastrophic injury for student athletes.',
      sponsorLabel: 'Booker Amdt. No. 6805',
    });
    expect(roll?.majorityRequirement).toBe('1/2');
    expect(roll?.nomination).toBeUndefined();
  });

  it('parses a nomination vote with the nominee description and no bill', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML_241, 119, 2, 241);
    expect(roll?.bill).toBeUndefined();
    expect(roll?.amendment).toBeUndefined();
    expect(roll?.nomination).toEqual({
      number: 'PN999-1',
      description:
        'Angela Veronica Colmenero, of Texas, to be United States District Judge for the Southern District of Texas',
    });
  });

  it('parses a plain bill vote with its document title and 3/5 requirement', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML_243, 119, 2, 243);
    expect(roll?.bill).toEqual({ congress: 119, type: 'S', number: '4668', title: NIL_BILL_TITLE });
    expect(roll?.amendment).toBeUndefined();
    expect(roll?.majorityRequirement).toBe('3/5');
    expect(roll?.question).toBe('On the Cloture Motion S. 4668');
  });

  it('round-trips measure fields through the compact corpus form', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML_248, 119, 2, 248);
    if (!roll) throw new Error('parse failed');
    const expanded = expandRoll(compactRoll(roll), 119, 'Senate');
    expect(expanded.amendment).toEqual(roll.amendment);
    expect(expanded.majorityRequirement).toBe('1/2');
  });

  it('adds no meta for rolls without measure fields (old corpus entries stay readable)', () => {
    const compact = { rollCallNumber: 1, session: 2, date: '2026-01-05', votes: [] };
    const expanded = expandRoll(compact, 119, 'Senate');
    expect(expanded.amendment).toBeUndefined();
    expect(expanded.nomination).toBeUndefined();
    expect(expanded.majorityRequirement).toBeUndefined();
  });
});
