/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Dynamic route for topic pages. Resolves a topic slug to a Congress.gov
 * policy area and renders the issue file. The twelve hub topics have
 * their own static routes beside this one; this route serves the alias
 * and long-form policy-area slugs the static set does not cover
 * (housing, taxation, energy, ...). Unmapped slugs are a real 404.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { IssueTopicPage } from '@/components/topics/IssueTopicPage';
import {
  policyAreaDisplayName,
  resolveSlugToPolicyArea,
  sectorToIndustrySlug,
} from '@/components/topics/IssueTopicPage/data';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { slugifyPolicyArea } from '@/lib/questions/question-registry';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TopicPageRoute({ params }: PageProps) {
  const { slug } = await params;

  const policyArea = resolveSlugToPolicyArea(slug);
  if (!policyArea) {
    notFound();
  }

  const mapping = getPolicyAreaMapping(policyArea);
  const firstSector = mapping?.industrySectors[0] ?? null;
  const industrySectorSlug = firstSector ? sectorToIndustrySlug(firstSector) : null;
  const industrySectorLabel = firstSector ?? null;
  const displayName = policyAreaDisplayName(policyArea);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: displayName, url: `https://civdotiq.org/topics/${slug}` },
        ]}
      />
      <IssueTopicPage
        slug={slug}
        policyArea={policyArea}
        displayName={displayName}
        industrySectorSlug={industrySectorSlug}
        industrySectorLabel={industrySectorLabel}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const policyArea = resolveSlugToPolicyArea(slug);
  if (!policyArea) {
    return {
      title: 'Topic not found',
      description: 'Browse policy topics across federal legislation, regulation, and finance.',
      robots: { index: false, follow: false },
    };
  }
  const title = `${policyArea} — Federal policy file`;
  const description = `Bills, regulations, oversight committees, and industry contributions tied to ${policyArea} in the current Congress.`;
  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/topics/${slugifyPolicyArea(policyArea)}` },
    openGraph: {
      images: SITE_OG_IMAGES,
      title,
      description,
      url: `https://civdotiq.org/topics/${slug}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@civdotiq',
    },
  };
}
