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
import { getTemplate, fillPattern } from '@/lib/questions/question-registry';
import { computeRelatedQuestions } from '@/lib/questions/related-questions';
import {
  fetchCampaignContributionsData,
  fetchPartyAlignmentData,
  fetchVotingRecordData,
  type CampaignContributionsData,
  type PartyAlignmentTemplateData,
  type VotingRecordTemplateData,
} from '@/lib/questions/template-data-fetchers';
import { FAQPageSchema } from '@/components/seo/JsonLd';
import { QuestionLayout } from '@/components/questions/QuestionLayout';
import { RelatedQuestions } from '@/components/questions/RelatedQuestions';
import { CampaignContributionsAnswer } from '@/components/questions/CampaignContributionsAnswer';
import { PartyAlignmentAnswer } from '@/components/questions/PartyAlignmentAnswer';
import { VotingRecordAnswer } from '@/components/questions/VotingRecordAnswer';

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
    default:
      return `Data for ${repName} is sourced from official government records.`;
  }
}

export default async function QuestionPage({ params }: PageProps) {
  const { slug, entityId } = await params;

  const template = getTemplate(slug);
  if (!template) notFound();

  // Only representative templates are implemented (committee/topic: Phase 4D/4E)
  if (template.entityType !== 'representative') notFound();

  // Deduplicated via React cache() — shared with layout.tsx
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
    default:
      notFound();
  }

  const faqAnswer = buildFaqAnswer(slug, rep.name, { campaign, alignment, voting });

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
      </QuestionLayout>
    </>
  );
}
