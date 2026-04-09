/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCachedRepresentative } from '@/lib/questions/get-representative';
import { getCachedCommittee } from '@/lib/questions/get-committee';
import { getTemplate, fillPattern, getCategoryLabel } from '@/lib/questions/question-registry';
import { resolvePolicyAreaSlug } from '@/lib/services/policy-area-search.service';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; entityId: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; entityId: string }>;
}): Promise<Metadata> {
  const { slug, entityId } = await params;

  const template = getTemplate(slug);
  if (!template) return { title: 'Question not found' };

  try {
    let title: string;
    let description: string;
    const url = `https://civdotiq.org/ask/${slug}/${entityId}`;

    if (template.entityType === 'topic') {
      const policyArea = resolvePolicyAreaSlug(entityId);
      if (!policyArea) return { title: 'Topic not found' };
      title = fillPattern(template.questionPattern, { name: policyArea });
      description = fillPattern(template.descriptionPattern, { name: policyArea });
    } else if (template.entityType === 'committee') {
      const committee = await getCachedCommittee(entityId);
      if (!committee?.name) return { title: 'Committee not found' };
      const vars = { name: committee.name, chamber: committee.chamber };
      title = fillPattern(template.questionPattern, vars);
      description = fillPattern(template.descriptionPattern, vars);
    } else {
      const rep = await getCachedRepresentative(entityId.toUpperCase());
      if (!rep) return { title: 'Representative not found' };
      const entity = { name: rep.name, party: rep.party, state: rep.state };
      title = fillPattern(template.questionPattern, entity);
      description = fillPattern(template.descriptionPattern, entity);
    }

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
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
  } catch {
    return { title: 'Question', description: 'Civic intelligence question page' };
  }
}

export default async function AskLayout({ children, params }: LayoutProps) {
  const { slug, entityId } = await params;

  const template = getTemplate(slug);
  if (!template) notFound();

  let entityName: string;

  if (template.entityType === 'topic') {
    entityName = resolvePolicyAreaSlug(entityId) ?? 'Topic';
  } else if (template.entityType === 'committee') {
    entityName = 'Committee';
    try {
      const committee = await getCachedCommittee(entityId);
      if (committee?.name) entityName = committee.name;
    } catch {
      // Breadcrumb falls back to generic label
    }
  } else {
    entityName = 'Representative';
    try {
      const rep = await getCachedRepresentative(entityId.toUpperCase());
      if (rep) entityName = rep.name;
    } catch {
      // Breadcrumb falls back to generic label
    }
  }

  const categoryLabel = getCategoryLabel(template.category);
  const questionTitle = template.questionPattern.replace(/\{name\}/g, entityName);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Questions', url: 'https://civdotiq.org/ask' },
          { name: categoryLabel, url: `https://civdotiq.org/ask#${template.category}` },
          { name: questionTitle, url: `https://civdotiq.org/ask/${slug}/${entityId}` },
        ]}
      />
      {children}
    </>
  );
}
