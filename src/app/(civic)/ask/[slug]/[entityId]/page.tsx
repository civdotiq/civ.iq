/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Question Page — server component that fetches data and renders
 * template-specific answer pods inside a shared QuestionLayout.
 *
 * Route: /ask/[slug]/[entityId]
 */

import { notFound } from 'next/navigation';
import { getCachedRepresentative } from '@/lib/questions/get-representative';
import { getCachedCommittee } from '@/lib/questions/get-committee';
import { getTemplate, fillPattern } from '@/lib/questions/question-registry';
import { computeRelatedQuestions } from '@/lib/questions/related-questions';
import {
  fetchCampaignContributionsData,
  fetchPartyAlignmentData,
  fetchVotingRecordData,
  fetchBillsSponsoredData,
  fetchDonorVotingAlignmentData,
  fetchTopicBillsData,
  fetchCommitteeActivityData,
  fetchCommitteeLobbyingData,
  type CampaignContributionsData,
  type PartyAlignmentTemplateData,
  type VotingRecordTemplateData,
  type BillsSponsoredData,
  type DonorVotingAlignmentData,
  type TopicBillsData,
  type CommitteeMembersData,
  type CommitteeActivityData,
  type CommitteeLobbyingData,
} from '@/lib/questions/template-data-fetchers';
import { resolvePolicyAreaSlug } from '@/lib/services/policy-area-search.service';
import { FAQPageSchema } from '@/components/seo/JsonLd';
import { QuestionLayout } from '@/components/questions/QuestionLayout';
import { RelatedQuestions } from '@/components/questions/RelatedQuestions';
import { CampaignContributionsAnswer } from '@/components/questions/CampaignContributionsAnswer';
import { PartyAlignmentAnswer } from '@/components/questions/PartyAlignmentAnswer';
import { VotingRecordAnswer } from '@/components/questions/VotingRecordAnswer';
import { BillsSponsoredAnswer } from '@/components/questions/BillsSponsoredAnswer';
import { ContactInfoAnswer } from '@/components/questions/ContactInfoAnswer';
import { PartisanshipAnswer } from '@/components/questions/PartisanshipAnswer';
import { DonorVotingAlignmentAnswer } from '@/components/questions/DonorVotingAlignmentAnswer';
import { TopicBillsAnswer } from '@/components/questions/TopicBillsAnswer';
import { CommitteeMembersAnswer } from '@/components/questions/CommitteeMembersAnswer';
import { CommitteeActivityAnswer } from '@/components/questions/CommitteeActivityAnswer';
import { CommitteeLobbyingAnswer } from '@/components/questions/CommitteeLobbyingAnswer';

export const revalidate = 3600;

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
    alignment?: PartyAlignmentTemplateData;
    voting?: VotingRecordTemplateData;
    billsSponsored?: BillsSponsoredData;
    donorAlignment?: DonorVotingAlignmentData;
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
        const topIndustry = industries?.topIndustries?.[0]?.industry ?? 'various sectors';
        const amount =
          finance.totalRaised >= 1_000_000
            ? `$${(finance.totalRaised / 1_000_000).toFixed(1)}M`
            : `$${(finance.totalRaised / 1_000).toFixed(0)}K`;
        return `${repName} has raised ${amount} in the current cycle, with ${topIndustry} as the largest contributing sector.`;
      }
      return `Campaign finance data for ${repName} is sourced from FEC filings.`;
    }
    case 'party-alignment': {
      const alignment = data.alignment?.partyAlignment;
      if (alignment?.overall_alignment && alignment.total_votes_analyzed) {
        return `${repName} votes with their party ${alignment.overall_alignment.toFixed(1)}% of the time, based on ${alignment.total_votes_analyzed} votes analyzed.`;
      }
      return `Party alignment data for ${repName} is computed from congressional voting records.`;
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
    case 'partisanship': {
      const alignment = data.alignment?.partyAlignment;
      if (alignment?.overall_alignment && alignment.comparison_to_peers) {
        const diff =
          alignment.overall_alignment - alignment.comparison_to_peers.party_avg_alignment;
        const moreOrLess = diff > 0 ? 'more' : 'less';
        return `${repName} votes with their party ${alignment.overall_alignment.toFixed(1)}% of the time, ${Math.abs(diff).toFixed(1)} points ${moreOrLess} partisan than the party average.`;
      }
      return `Partisanship analysis for ${repName} is computed from congressional voting records.`;
    }
    case 'donor-voting-alignment': {
      const vf = data.donorAlignment?.voteFinance?.data;
      if (vf?.overallCorrelation !== null && vf?.overallCorrelation !== undefined) {
        const strength = Math.abs(vf.overallCorrelation) >= 0.4 ? 'notable' : 'modest';
        return `Analysis shows a ${strength} correlation (${(vf.overallCorrelation * 100).toFixed(1)}%) between ${repName}'s donor sectors and voting patterns.`;
      }
      return `Donor-voting alignment analysis for ${repName} requires sufficient voting and contribution data.`;
    }
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
      const totalSpending = data.committeLobbying?.lobbying?.totalSpending;
      if (orgCount && totalSpending) {
        const amount =
          totalSpending >= 1_000_000
            ? `$${(totalSpending / 1_000_000).toFixed(1)}M`
            : `$${(totalSpending / 1_000).toFixed(0)}K`;
        return `${orgCount} organizations spent ${amount} on lobbying that mentions the ${repName}.`;
      }
      return `Lobbying data for the ${repName} is sourced from Senate LDA disclosures.`;
    }
    default:
      return `Data for ${repName} is sourced from official government records.`;
  }
}

export default async function QuestionPage({ params }: PageProps) {
  const { slug, entityId } = await params;

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

    return (
      <>
        <FAQPageSchema question={question} answer={faqAnswer} />
        <QuestionLayout
          question={question}
          category={template.category}
          relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
        >
          {slug === 'committee-members' && committeeMembers && (
            <CommitteeMembersAnswer committee={committeeMembers.committee} />
          )}
          {slug === 'committee-activity' && committeeActivity && (
            <CommitteeActivityAnswer
              meetings={committeeActivity.meetings}
              bills={committeeActivity.bills}
              jurisdiction={committeeActivity.jurisdiction}
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

  // Fetch template-specific data via direct service calls (no self-fetch)
  let campaign: CampaignContributionsData | undefined;
  let alignment: PartyAlignmentTemplateData | undefined;
  let voting: VotingRecordTemplateData | undefined;
  let billsSponsored: BillsSponsoredData | undefined;
  let donorAlignment: DonorVotingAlignmentData | undefined;

  switch (slug) {
    case 'campaign-contributions':
      campaign = await fetchCampaignContributionsData(id, rep.state);
      break;
    case 'party-alignment':
      alignment = await fetchPartyAlignmentData(id, rep.party, rep.chamber);
      break;
    case 'voting-record':
      voting = await fetchVotingRecordData(id, rep.chamber);
      break;
    case 'bills-sponsored':
      billsSponsored = await fetchBillsSponsoredData(id);
      break;
    case 'contact-info':
      break;
    case 'partisanship':
      alignment = await fetchPartyAlignmentData(id, rep.party, rep.chamber);
      break;
    case 'donor-voting-alignment':
      donorAlignment = await fetchDonorVotingAlignmentData(id);
      break;
    default:
      notFound();
  }

  const faqAnswer = buildFaqAnswer(slug, rep.name, {
    campaign,
    alignment,
    voting,
    billsSponsored,
    donorAlignment,
  });

  return (
    <>
      <FAQPageSchema question={question} answer={faqAnswer} />
      <QuestionLayout
        question={question}
        category={template.category}
        relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
      >
        {slug === 'campaign-contributions' && campaign && (
          <CampaignContributionsAnswer
            finance={campaign.finance}
            industries={campaign.industries}
            voteFinanceInsight={campaign.voteFinance}
          />
        )}
        {slug === 'party-alignment' && alignment && (
          <PartyAlignmentAnswer
            profile={entity}
            partyAlignment={alignment.partyAlignment}
            temporalInsight={alignment.temporal}
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
        {slug === 'partisanship' && alignment && (
          <PartisanshipAnswer
            profile={entity}
            partyAlignment={alignment.partyAlignment}
            temporalInsight={alignment.temporal}
          />
        )}
        {slug === 'donor-voting-alignment' && donorAlignment && (
          <DonorVotingAlignmentAnswer voteFinance={donorAlignment.voteFinance} />
        )}
      </QuestionLayout>
    </>
  );
}
