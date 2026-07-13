/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Question Page — server component that fetches data and renders
 * template-specific answer pods.
 *
 * Default branch: legacy QuestionLayout (unchanged).
 * `?v=new` (or NEXT_PUBLIC_CIVIQ_V === 'new' in non-prod): AskResultPage
 * chassis that wraps the SAME typed pod with the redesign question echo,
 * citation rail, methodology, confidence band, and limitations.
 *
 * Route: /ask/[slug]/[entityId]
 */

import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getCachedRepresentative } from '@/lib/questions/get-representative';
import { getCachedCommittee } from '@/lib/questions/get-committee';
import { getTemplate, fillPattern } from '@/lib/questions/question-registry';
import { computeRelatedQuestions } from '@/lib/questions/related-questions';
import {
  fetchCampaignContributionsData,
  fetchVotingRecordData,
  fetchBillsSponsoredData,
  fetchDonorVotingAlignmentData,
  fetchTopicBillsData,
  fetchCommitteeActivityData,
  fetchCommitteeLobbyingData,
  type CampaignContributionsData,
  type VotingRecordTemplateData,
  type BillsSponsoredData,
  type TopicBillsData,
  type CommitteeMembersData,
  type CommitteeActivityData,
  type CommitteeLobbyingData,
} from '@/lib/questions/template-data-fetchers';
import { resolvePolicyAreaSlug } from '@/lib/services/policy-area-search.service';
import { displaySector } from '@/lib/mesh/sector-display';
import { FAQPageSchema } from '@/components/seo/JsonLd';
import { QuestionLayout } from '@/components/questions/QuestionLayout';
import { RelatedQuestions } from '@/components/questions/RelatedQuestions';
import { CampaignContributionsAnswer } from '@/components/questions/CampaignContributionsAnswer';
import { VotingRecordAnswer } from '@/components/questions/VotingRecordAnswer';
import { BillsSponsoredAnswer } from '@/components/questions/BillsSponsoredAnswer';
import { ContactInfoAnswer } from '@/components/questions/ContactInfoAnswer';
import {
  DonorVotingAlignmentAnswer,
  DonorVotingAlignmentSkeleton,
} from '@/components/questions/DonorVotingAlignmentAnswer';
import { TopicBillsAnswer } from '@/components/questions/TopicBillsAnswer';
import { CommitteeMembersAnswer } from '@/components/questions/CommitteeMembersAnswer';
import { CommitteeActivityAnswer } from '@/components/questions/CommitteeActivityAnswer';
import { CommitteeLobbyingAnswer } from '@/components/questions/CommitteeLobbyingAnswer';
import { AskResultPage, type AskEntity } from '@/components/ask/AskResultPage';

export const revalidate = 3600;

// donor-voting-alignment streams its pod via Suspense and can spend up to
// ~120s on a cold analyzer compute. All other question templates finish in
// seconds; this ceiling is only load-bearing for the cold path.
export const maxDuration = 150;

// Empty generateStaticParams activates on-demand ISR — without it a
// dynamic-segment route renders per-request and `revalidate` is ignored.
export async function generateStaticParams(): Promise<Array<{ slug: string; entityId: string }>> {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string; entityId: string }>;
}

/**
 * Build the FAQ schema answer sentence from typed template data.
 */
function buildFaqAnswer(
  slug: string,
  repName: string,
  data: {
    campaign?: CampaignContributionsData;
    voting?: VotingRecordTemplateData;
    billsSponsored?: BillsSponsoredData;
    topicBills?: TopicBillsData;
    committeeMembers?: CommitteeMembersData;
    committeeActivity?: CommitteeActivityData;
    committeLobbying?: CommitteeLobbyingData;
  }
): string {
  switch (slug) {
    case 'campaign-contributions': {
      const finance = data.campaign?.finance;
      const industries = data.campaign?.industries;
      if (finance?.totalRaised) {
        const topIndustry =
          industries?.topIndustries?.find(
            i =>
              i.industry !== 'Unknown' &&
              i.industry !== 'Other/Unknown' &&
              i.industry !== 'Not Employed' &&
              i.industry !== 'Unaffiliated / Non-employed'
          )?.industry ?? 'various sectors';
        const amount =
          finance.totalRaised >= 1_000_000
            ? `$${(finance.totalRaised / 1_000_000).toFixed(1)}M`
            : `$${(finance.totalRaised / 1_000).toFixed(0)}K`;
        return `${repName} has raised ${amount} in the current cycle, with ${displaySector(topIndustry)} as the largest contributing sector.`;
      }
      return `Campaign finance data for ${repName} is sourced from FEC filings.`;
    }
    case 'voting-record': {
      const votes = data.voting?.votes;
      if (votes?.totalResults) {
        return `${repName} has cast ${votes.totalResults.toLocaleString()} recorded votes in the current Congress.`;
      }
      return `Voting record data for ${repName} is sourced from Congress.gov.`;
    }
    case 'bills-sponsored': {
      const count = data.billsSponsored?.sponsoredCount;
      if (count) {
        return `${repName} has sponsored ${count} bill${count !== 1 ? 's' : ''} in the 119th Congress.`;
      }
      return `Sponsored legislation for ${repName} is sourced from Congress.gov.`;
    }
    case 'contact-info':
      return `Contact information for ${repName} is sourced from official congressional records.`;
    case 'donor-voting-alignment':
      return `${repName}'s yea-rate on bills touching top donor industries, based on FEC contributions and Congress.gov roll-call votes.`;
    case 'topic-bills': {
      const billCount = data.topicBills?.results?.bills?.length ?? 0;
      if (billCount > 0) {
        return `There are ${billCount} recent bills related to ${repName} in the current Congress.`;
      }
      return `Legislative data for ${repName} is sourced from Congress.gov and the Federal Register.`;
    }
    case 'committee-members': {
      const memberCount = data.committeeMembers?.committee?.members?.length ?? 0;
      if (memberCount > 0) {
        return `The ${repName} has ${memberCount} members in the 119th Congress.`;
      }
      return `Membership data for the ${repName} is sourced from Congress.gov.`;
    }
    case 'committee-activity': {
      const meetingCount = data.committeeActivity?.meetings?.length ?? 0;
      if (meetingCount > 0) {
        return `The ${repName} has held ${meetingCount} recent hearings or meetings.`;
      }
      return `Activity data for the ${repName} is sourced from Congress.gov.`;
    }
    case 'committee-lobbying': {
      const orgCount = data.committeLobbying?.lobbying?.organizationCount;
      if (orgCount) {
        // Dollar totals omitted: the committee analyzer aggregates a ~0.1% LDA
        // filing sample, so summed amounts are misleading (PLAN-lobbying-corpus-2026-07.md).
        return `${orgCount} organizations filed lobbying disclosures that mention the ${repName}.`;
      }
      return `Lobbying data for the ${repName} is sourced from Senate LDA disclosures.`;
    }
    default:
      return `Data for ${repName} is sourced from official government records.`;
  }
}

/**
 * Map upstream party string to the Cq chip 'd'/'r'/'i' variant.
 */
function partyVariant(party: string): 'd' | 'r' | 'i' {
  const p = party.trim().toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

interface ConfidenceComputation {
  score: number;
  basis: string;
}

/**
 * Per Correction 4: confidence is a heuristic over the resolved pod data.
 * - 0.91 when the primary field resolved
 * - 0.74 when partial / fallback data
 * - 0.40 when no data
 */
function computeConfidence(
  slug: string,
  data: {
    rep?: { name: string } | null;
    campaign?: CampaignContributionsData;
    voting?: VotingRecordTemplateData;
    billsSponsored?: BillsSponsoredData;
    topicBills?: TopicBillsData;
    committeeMembers?: CommitteeMembersData;
    committeeActivity?: CommitteeActivityData;
    committeLobbying?: CommitteeLobbyingData;
  }
): ConfidenceComputation {
  switch (slug) {
    case 'campaign-contributions': {
      const finance = data.campaign?.finance;
      const hasIndustries = (data.campaign?.industries?.topIndustries?.length ?? 0) > 0;
      if (finance?.totalRaised && hasIndustries) {
        return {
          score: 0.91,
          basis: 'FEC cycle totals and industry classification both resolved.',
        };
      }
      if (finance?.totalRaised || hasIndustries) {
        return {
          score: 0.74,
          basis: 'Partial FEC data; some breakdowns are not yet filed for this cycle.',
        };
      }
      return {
        score: 0.4,
        basis: 'No FEC filings resolved for this candidate ID in the current cycle.',
      };
    }
    case 'voting-record': {
      const totalVotes = data.voting?.votes?.totalResults ?? 0;
      if (totalVotes >= 50) {
        return {
          score: 0.91,
          basis: `Based on ${totalVotes.toLocaleString()} recorded floor votes in the current Congress.`,
        };
      }
      if (totalVotes > 0) {
        return {
          score: 0.74,
          basis: `Limited sample — only ${totalVotes} recorded floor votes resolved so far.`,
        };
      }
      return { score: 0.4, basis: 'No recorded floor votes resolved for this member.' };
    }
    case 'bills-sponsored': {
      const sponsored = data.billsSponsored?.sponsoredCount ?? 0;
      const cosponsored = data.billsSponsored?.cosponsoredCount ?? 0;
      if (sponsored + cosponsored > 0) {
        return {
          score: 0.91,
          basis: `Resolved ${sponsored} sponsored and ${cosponsored} cosponsored bills in the 119th Congress.`,
        };
      }
      return {
        score: 0.4,
        basis: 'No sponsored or cosponsored bills resolved in the current Congress.',
      };
    }
    case 'contact-info':
      return {
        score: 0.91,
        basis: 'Directory entry resolved from the canonical congress-legislators record.',
      };
    case 'donor-voting-alignment':
      return {
        score: 0.74,
        basis:
          'Confidence is medium by default — correlation only. The analyzer streams in; final sample size depends on bill subject tagging.',
      };
    case 'topic-bills': {
      const billCount = data.topicBills?.results?.bills?.length ?? 0;
      if (billCount > 0) {
        return {
          score: 0.91,
          basis: `Resolved ${billCount} bills tagged to this policy area in Congress.gov.`,
        };
      }
      return { score: 0.4, basis: 'No bills resolved under this policy-area tag.' };
    }
    case 'committee-members': {
      const count = data.committeeMembers?.committee?.members?.length ?? 0;
      if (count > 0) {
        return { score: 0.91, basis: `Resolved ${count} current members of the committee.` };
      }
      return { score: 0.4, basis: 'No committee member roster resolved.' };
    }
    case 'committee-activity': {
      const meetings = data.committeeActivity?.meetings?.length ?? 0;
      const bills = data.committeeActivity?.bills?.length ?? 0;
      if (meetings + bills > 0) {
        return {
          score: 0.91,
          basis: `Resolved ${meetings} recent meetings and ${bills} bills in committee.`,
        };
      }
      return { score: 0.4, basis: 'No recent committee meetings or bills resolved.' };
    }
    case 'committee-lobbying': {
      const orgs = data.committeLobbying?.lobbying?.organizationCount ?? 0;
      if (orgs > 0) {
        return {
          score: 0.91,
          basis: `Resolved lobbying disclosures from ${orgs.toLocaleString()} organizations.`,
        };
      }
      return {
        score: 0.4,
        basis: 'No Senate LDA filings naming this committee in the current period.',
      };
    }
    default:
      return { score: 0.4, basis: 'Heuristic baseline — slug not enumerated.' };
  }
}

export default async function QuestionPage({ params }: PageProps) {
  const { slug, entityId } = await params;
  // The ?v=new URL preview is retired so this route can be ISR-cached
  // (query strings are invisible to the ISR cache). The redesign remains
  // previewable in dev via NEXT_PUBLIC_CIVIQ_V=new.
  const useRedesign =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';

  const template = getTemplate(slug);
  if (!template) notFound();

  // ── Topic entity resolution ──────────────────────────────────
  if (template.entityType === 'topic') {
    const policyArea = resolvePolicyAreaSlug(entityId);
    if (!policyArea) notFound();

    const question = fillPattern(template.questionPattern, { name: policyArea });
    const relatedQuestions = computeRelatedQuestions(slug, entityId, policyArea);
    const topicBills = await fetchTopicBillsData(policyArea);

    const faqAnswer = buildFaqAnswer(slug, policyArea, { topicBills });
    const podBody: ReactNode = topicBills.results ? (
      <TopicBillsAnswer results={topicBills.results} />
    ) : (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <p className="type-sm text-gray-500">
          Data for this policy area is currently unavailable. Try again later.
        </p>
      </div>
    );

    if (useRedesign) {
      const { score, basis } = computeConfidence(slug, { topicBills });
      const entity: AskEntity = { type: 'topic', name: policyArea, slug: entityId };
      return (
        <>
          <FAQPageSchema question={question} answer={faqAnswer} />
          <AskResultPage
            slug={slug}
            category={template.category}
            question={question}
            entity={entity}
            confidence={score}
            confidenceBasis={basis}
            relatedQuestions={relatedQuestions}
          >
            {podBody}
          </AskResultPage>
        </>
      );
    }

    return (
      <>
        <FAQPageSchema question={question} answer={faqAnswer} />
        <QuestionLayout
          question={question}
          category={template.category}
          relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
        >
          {topicBills.results ? (
            <TopicBillsAnswer results={topicBills.results} />
          ) : (
            <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
              <p className="type-sm text-gray-500">
                Data for this policy area is currently unavailable. Try again later.
              </p>
            </div>
          )}
        </QuestionLayout>
      </>
    );
  }

  // ── Committee entity resolution ──────────────────────────────
  if (template.entityType === 'committee') {
    const committee = await getCachedCommittee(entityId);
    if (!committee?.name) notFound();

    const vars = { name: committee.name, chamber: committee.chamber };
    const question = fillPattern(template.questionPattern, vars);
    const relatedQuestions = computeRelatedQuestions(slug, entityId, committee.name);

    let committeeMembers: CommitteeMembersData | undefined;
    let committeeActivity: CommitteeActivityData | undefined;
    let committeLobbying: CommitteeLobbyingData | undefined;

    switch (slug) {
      case 'committee-members':
        committeeMembers = { committee };
        break;
      case 'committee-activity':
        committeeActivity = await fetchCommitteeActivityData(entityId, committee.chamber);
        break;
      case 'committee-lobbying':
        committeLobbying = await fetchCommitteeLobbyingData(entityId);
        break;
      default:
        notFound();
    }

    const faqAnswer = buildFaqAnswer(slug, committee.name, {
      committeeMembers,
      committeeActivity,
      committeLobbying,
    });

    const podBody: ReactNode = (
      <>
        {slug === 'committee-members' && committeeMembers && (
          <CommitteeMembersAnswer committee={committeeMembers.committee} />
        )}
        {slug === 'committee-activity' && committeeActivity && (
          <CommitteeActivityAnswer
            meetings={committeeActivity.meetings}
            bills={committeeActivity.bills}
            jurisdiction={committeeActivity.jurisdiction}
            fetchedAt={committeeActivity.fetchedAt}
          />
        )}
        {slug === 'committee-lobbying' && (
          <CommitteeLobbyingAnswer
            lobbying={committeLobbying?.lobbying ?? null}
            committeeId={entityId}
            committeeName={committee.name}
            chamber={committee.chamber}
            jurisdiction={committee.jurisdiction}
          />
        )}
      </>
    );

    if (useRedesign) {
      const { score, basis } = computeConfidence(slug, {
        committeeMembers,
        committeeActivity,
        committeLobbying,
      });
      const entity: AskEntity = {
        type: 'committee',
        name: committee.name,
        committeeId: entityId.toUpperCase(),
        chamber: committee.chamber,
        jurisdiction: committee.jurisdiction,
      };
      return (
        <>
          <FAQPageSchema question={question} answer={faqAnswer} />
          <AskResultPage
            slug={slug}
            category={template.category}
            question={question}
            entity={entity}
            confidence={score}
            confidenceBasis={basis}
            relatedQuestions={relatedQuestions}
          >
            {podBody}
          </AskResultPage>
        </>
      );
    }

    return (
      <>
        <FAQPageSchema question={question} answer={faqAnswer} />
        <QuestionLayout
          question={question}
          category={template.category}
          relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
        >
          {podBody}
        </QuestionLayout>
      </>
    );
  }

  // ── Representative entity resolution ─────────────────────────
  if (template.entityType !== 'representative') notFound();

  const rep = await getCachedRepresentative(entityId.toUpperCase());
  if (!rep) notFound();

  const entity = { name: rep.name, party: rep.party, state: rep.state };
  const question = fillPattern(template.questionPattern, entity);
  const relatedQuestions = computeRelatedQuestions(slug, entityId, rep.name);
  const id = entityId.toUpperCase();

  // Fetch template-specific data via direct service calls (no self-fetch).
  // donor-voting-alignment is intentionally NOT awaited here — its analyzer
  // can take 40–55 seconds cold, so the pod streams in via Suspense below.
  let campaign: CampaignContributionsData | undefined;
  let voting: VotingRecordTemplateData | undefined;
  let billsSponsored: BillsSponsoredData | undefined;

  switch (slug) {
    case 'campaign-contributions':
      campaign = await fetchCampaignContributionsData(id, rep.state);
      break;
    case 'voting-record':
      voting = await fetchVotingRecordData(id, rep.chamber);
      break;
    case 'bills-sponsored':
      billsSponsored = await fetchBillsSponsoredData(id);
      break;
    case 'contact-info':
    case 'donor-voting-alignment':
      break;
    default:
      notFound();
  }

  const faqAnswer = buildFaqAnswer(slug, rep.name, {
    campaign,
    voting,
    billsSponsored,
  });

  const podBody: ReactNode = (
    <>
      {slug === 'campaign-contributions' && campaign && (
        <CampaignContributionsAnswer
          finance={campaign.finance}
          industries={campaign.industries}
          voteFinanceInsight={campaign.voteFinance}
        />
      )}
      {slug === 'voting-record' && voting && (
        <VotingRecordAnswer votes={voting.votes} bills={voting.bills} />
      )}
      {slug === 'bills-sponsored' && billsSponsored && (
        <BillsSponsoredAnswer
          bills={billsSponsored.bills}
          sponsoredCount={billsSponsored.sponsoredCount}
          cosponsoredCount={billsSponsored.cosponsoredCount}
        />
      )}
      {slug === 'contact-info' && (
        <ContactInfoAnswer
          phone={rep.currentTerm?.phone ?? rep.phone}
          address={rep.currentTerm?.address ?? rep.contact?.dcOffice?.address}
          office={rep.currentTerm?.office}
          contactForm={rep.currentTerm?.contactForm ?? rep.contact?.contactForm}
          website={rep.currentTerm?.website ?? rep.website}
          email={rep.email}
          socialMedia={rep.socialMedia}
          committees={rep.committees}
          districtOffices={rep.contact?.districtOffices}
        />
      )}
      {slug === 'donor-voting-alignment' && (
        <Suspense fallback={<DonorVotingAlignmentSkeleton />}>
          <StreamedDonorVotingAlignment bioguideId={id} />
        </Suspense>
      )}
    </>
  );

  if (useRedesign) {
    const { score, basis } = computeConfidence(slug, {
      rep,
      campaign,
      voting,
      billsSponsored,
    });
    const earliestTerm = rep.terms?.[0]?.startYear;
    const tenureCaption = earliestTerm ? `In office since ${earliestTerm}` : undefined;
    const repEntity: AskEntity = {
      type: 'representative',
      name: rep.name,
      bioguideId: id,
      party: partyVariant(rep.party),
      chamber: rep.chamber,
      state: rep.state,
      district: rep.district,
      portraitSrc: rep.imageUrl,
      tenureCaption,
    };
    return (
      <>
        <FAQPageSchema question={question} answer={faqAnswer} />
        <AskResultPage
          slug={slug}
          category={template.category}
          question={question}
          entity={repEntity}
          confidence={score}
          confidenceBasis={basis}
          relatedQuestions={relatedQuestions}
        >
          {podBody}
        </AskResultPage>
      </>
    );
  }

  return (
    <>
      <FAQPageSchema question={question} answer={faqAnswer} />
      <QuestionLayout
        question={question}
        category={template.category}
        relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
      >
        {podBody}
      </QuestionLayout>
    </>
  );
}

/**
 * Streams the donor-voting-alignment pods via Suspense so the page shell
 * and skeleton render immediately — the underlying analyzer takes 40–55s
 * on a cold cache for newly-visited representatives.
 */
async function StreamedDonorVotingAlignment({ bioguideId }: { bioguideId: string }) {
  const data = await fetchDonorVotingAlignmentData(bioguideId);
  return <DonorVotingAlignmentAnswer voteFinance={data.voteFinance} />;
}
