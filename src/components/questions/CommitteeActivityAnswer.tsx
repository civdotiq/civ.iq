/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CommitteeActivityAnswer — pod renderer for the committee-activity question.
 *
 * Pods: Recent hearings, Bills in committee, Jurisdiction, Sources.
 * Server component. Data from committee-activity.service + committee.service.
 */

import Link from 'next/link';
import type {
  CommitteeActivityMeeting,
  CommitteeActivityBill,
} from '@/lib/services/committee-activity.service';

interface CommitteeActivityAnswerProps {
  meetings: CommitteeActivityMeeting[];
  bills: CommitteeActivityBill[];
  jurisdiction: string;
  // ISO timestamp of when the data was fetched. Displayed as an
  // "As of {date}" caveat so citizens know coverage is bounded and can
  // judge whether sparse results reflect a quiet week or a lagging fetch.
  fetchedAt?: string;
}

// Markup meeting titles from Congress.gov often concatenate several bills
// with "; " (occasionally " and "), e.g. "H.R. 8352, the Criminal History
// Access Act; H.R. ____, the Monitor Accountability Act of 2026; and
// Ratification of Subcommittee Assignments". A single clamped line hides
// most of the subject; splitting on the separator makes the markup's
// actual scope legible.
export function splitMarkupTitle(title: string): string[] {
  if (!title) return [];
  return title
    .split(';')
    .flatMap(part => part.split(/\s+and\s+/i))
    .map(part => part.trim().replace(/[,;]\s*$/, ''))
    .filter(Boolean);
}

// Congress.gov returns sponsor names in the bracketed form
// "Rep. Carter, Earl L. 'Buddy' [R-GA-1]". That shape is optimized for
// government databases, not citizens reading a committee page. Reformat
// to "Buddy Carter (R-GA-1)" — nickname preferred over legal first name,
// middle initial dropped. Unparseable strings fall through unchanged so
// we never display empty-looking output.
export function formatSponsor(raw: string): string {
  if (!raw) return 'Unknown';
  const match = raw.match(/^(?:Rep\.|Sen\.|Del\.|Res\. Comm\.)\s+(.+?)\s+\[([^\]]+)\]\s*$/);
  if (!match) return raw;
  const nameBlock = match[1] ?? '';
  const bracket = match[2] ?? '';
  const [lastName, givenRaw = ''] = nameBlock.split(',').map(s => s.trim());
  if (!lastName) return raw;
  const nickMatch = givenRaw.match(
    /['"\u2018\u2019\u201C\u201D]([^'"\u2018\u2019\u201C\u201D]+)['"\u2018\u2019\u201C\u201D]/
  );
  const nickname = nickMatch?.[1];
  const withoutNick = givenRaw
    .replace(
      /['"\u2018\u2019\u201C\u201D][^'"\u2018\u2019\u201C\u201D]+['"\u2018\u2019\u201C\u201D]/g,
      ''
    )
    .trim();
  const firstName = withoutNick.split(/\s+/)[0]?.replace(/\.$/, '') ?? '';
  const displayFirst = nickname || firstName;
  if (!displayFirst) return raw;
  return `${displayFirst} ${lastName} (${bracket})`;
}

function formatFetchedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MeetingTitle({ meeting }: { meeting: CommitteeActivityMeeting }) {
  const isMarkup = meeting.type?.toLowerCase() === 'markup';
  if (isMarkup) {
    const parts = splitMarkupTitle(meeting.title);
    if (parts.length > 1) {
      return (
        <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
          {parts.map((p, i) => (
            <li key={i} className="type-sm text-black">
              {p}
            </li>
          ))}
        </ul>
      );
    }
  }
  return <p className="type-sm text-black line-clamp-2">{meeting.title}</p>;
}

function RecentHearingsPod({
  meetings,
  fetchedAt,
}: {
  meetings: CommitteeActivityMeeting[];
  fetchedAt?: string;
}) {
  const asOf = formatFetchedAt(fetchedAt);
  if (!meetings.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Recent hearings</h2>
        <p className="type-sm text-gray-500">
          No recent hearings or meetings found for this committee. Data may be temporarily
          unavailable from Congress.gov.
        </p>
        {asOf && <p className="type-xs text-gray-500 mt-3">As of {asOf}.</p>}
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Recent hearings</h2>
      <ul className="divide-y divide-gray-200">
        {meetings.map(meeting => (
          <li key={meeting.eventId} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <MeetingTitle meeting={meeting} />
                <p className="type-xs text-gray-500 mt-0.5">
                  {meeting.date
                    ? new Date(meeting.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date unavailable'}
                </p>
              </div>
              <span className="type-xs text-gray-500 shrink-0">{meeting.type}</span>
            </div>
          </li>
        ))}
      </ul>
      {asOf && (
        <p className="type-xs text-gray-500 mt-3">
          As of {asOf}. Sparse coverage can reflect a quiet recess period or a filter gap; the full
          schedule lives on Congress.gov.
        </p>
      )}
    </div>
  );
}

function BillsInCommitteePod({ bills }: { bills: CommitteeActivityBill[] }) {
  if (!bills.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Bills in committee</h2>
        <p className="type-sm text-gray-500">
          No bills currently available. Committee bill data may be temporarily unavailable from
          Congress.gov.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Bills in committee</h2>
      <ul className="divide-y divide-gray-200">
        {bills.slice(0, 10).map(bill => (
          <li key={bill.billId} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/bill/${bill.billId}`}
                  className="type-sm text-[#3ea2d4] hover:underline line-clamp-1"
                >
                  {bill.billNumber}: {bill.title}
                </Link>
                <p className="type-xs text-gray-500 mt-0.5">
                  {formatSponsor(bill.sponsor)}
                  {bill.introducedDate && (
                    <>
                      {' · '}
                      {new Date(bill.introducedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </p>
              </div>
              <span
                className="type-xs text-gray-500 shrink-0"
                title={bill.latestActionText || undefined}
              >
                {bill.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="type-xs text-gray-500 mt-3">
        Status reflects the bill&rsquo;s latest action on Congress.gov, which may be past this
        committee (e.g. a bill &ldquo;Passed House, in Senate&rdquo; has cleared this committee and
        chamber).
      </p>
    </div>
  );
}

function JurisdictionPod({ jurisdiction }: { jurisdiction: string }) {
  if (!jurisdiction) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Jurisdiction</h2>
        <p className="type-sm text-gray-500">Jurisdiction information is not available.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Jurisdiction</h2>
      <p className="type-sm text-gray-700 leading-relaxed">{jurisdiction}</p>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Committee activity data from{' '}
        <a
          href="https://www.congress.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress.gov
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function CommitteeActivityAnswer({
  meetings,
  bills,
  jurisdiction,
  fetchedAt,
}: CommitteeActivityAnswerProps) {
  return (
    <>
      <RecentHearingsPod meetings={meetings} fetchedAt={fetchedAt} />
      <BillsInCommitteePod bills={bills} />
      <JurisdictionPod jurisdiction={jurisdiction} />
      <SourcesPod />
    </>
  );
}
