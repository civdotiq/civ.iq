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
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getTemplate, fillPattern } from '@/lib/questions/question-registry';
import { computeRelatedQuestions } from '@/lib/questions/related-questions';
import { getServerBaseUrl } from '@/lib/server-url';
import { FAQPageSchema } from '@/components/seo/JsonLd';
import { QuestionLayout } from '@/components/questions/QuestionLayout';
import { RelatedQuestions } from '@/components/questions/RelatedQuestions';
import { CampaignContributionsAnswer } from '@/components/questions/CampaignContributionsAnswer';
import { PartyAlignmentAnswer } from '@/components/questions/PartyAlignmentAnswer';
import { VotingRecordAnswer } from '@/components/questions/VotingRecordAnswer';
import type {
  InsightResponse,
  VoteFinanceInsight,
  TemporalVoteInsight,
} from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string; entityId: string }>;
}

/**
 * Fetch JSON from an internal API route, returning null on failure.
 */
async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const base = getServerBaseUrl();
    const res = await fetch(`${base}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Build the FAQ schema answer sentence from template data.
 */
function buildFaqAnswer(slug: string, repName: string, data: Record<string, unknown>): string {
  switch (slug) {
    case 'campaign-contributions': {
      const finance = data.finance as { totalRaised?: number } | null;
      const industries = data.industries as {
        topIndustries?: Array<{ industry: string }>;
      } | null;
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
      const alignment = data.partyAlignment as {
        overall_alignment?: number;
        total_votes_analyzed?: number;
      } | null;
      if (alignment?.overall_alignment && alignment.total_votes_analyzed) {
        return `${repName} votes with their party ${alignment.overall_alignment.toFixed(1)}% of the time, based on ${alignment.total_votes_analyzed} votes analyzed.`;
      }
      return `Party alignment data for ${repName} is computed from congressional voting records.`;
    }
    case 'voting-record': {
      const votes = data.votes as { totalResults?: number } | null;
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

  // Fetch representative profile (direct service call — no HTTP overhead)
  const rep = await getEnhancedRepresentative(entityId.toUpperCase()).catch(() => null);
  if (!rep) notFound();

  const entity = { name: rep.name, party: rep.party, state: rep.state };
  const question = fillPattern(template.questionPattern, entity);
  const relatedQuestions = computeRelatedQuestions(slug, entityId, rep.name);
  const id = entityId.toUpperCase();

  // Fetch template-specific data in parallel
  const templateData: Record<string, unknown> = {};

  switch (slug) {
    case 'campaign-contributions': {
      const [finance, industries, voteFinance] = await Promise.all([
        fetchApi<Record<string, unknown>>(`/api/representative/${id}/finance`),
        fetchApi<Record<string, unknown>>(`/api/representative/${id}/finance/industries`),
        fetchApi<InsightResponse<VoteFinanceInsight>>(
          `/api/intelligence/representative/${id}/vote-finance`
        ),
      ]);
      templateData.finance = finance;
      templateData.industries = industries;
      templateData.voteFinance = voteFinance;
      break;
    }
    case 'party-alignment': {
      const [partyAlignment, temporal] = await Promise.all([
        fetchApi<Record<string, unknown>>(`/api/representative/${id}/party-alignment`),
        fetchApi<InsightResponse<TemporalVoteInsight>>(
          `/api/intelligence/representative/${id}/temporal`
        ),
      ]);
      templateData.partyAlignment = partyAlignment;
      templateData.temporal = temporal;
      break;
    }
    case 'voting-record': {
      const [votes, bills] = await Promise.all([
        fetchApi<Record<string, unknown>>(`/api/representative/${id}/votes`),
        fetchApi<Record<string, unknown>>(`/api/representative/${id}/bills`),
      ]);
      templateData.votes = votes;
      templateData.bills = bills;
      break;
    }
    default:
      notFound();
  }

  const faqAnswer = buildFaqAnswer(slug, rep.name, templateData);

  return (
    <>
      <FAQPageSchema question={question} answer={faqAnswer} />
      <QuestionLayout
        question={question}
        category={template.category}
        relatedQuestions={<RelatedQuestions questions={relatedQuestions} />}
      >
        {slug === 'campaign-contributions' && (
          <CampaignContributionsAnswer
            profile={entity}
            finance={
              templateData.finance as Parameters<typeof CampaignContributionsAnswer>[0]['finance']
            }
            industries={
              templateData.industries as Parameters<
                typeof CampaignContributionsAnswer
              >[0]['industries']
            }
            voteFinanceInsight={
              templateData.voteFinance as InsightResponse<VoteFinanceInsight> | null
            }
          />
        )}
        {slug === 'party-alignment' && (
          <PartyAlignmentAnswer
            profile={entity}
            partyAlignment={
              templateData.partyAlignment as Parameters<
                typeof PartyAlignmentAnswer
              >[0]['partyAlignment']
            }
            temporalInsight={templateData.temporal as InsightResponse<TemporalVoteInsight> | null}
          />
        )}
        {slug === 'voting-record' && (
          <VotingRecordAnswer
            votes={templateData.votes as Parameters<typeof VotingRecordAnswer>[0]['votes']}
            bills={templateData.bills as Parameters<typeof VotingRecordAnswer>[0]['bills']}
          />
        )}
      </QuestionLayout>
    </>
  );
}
