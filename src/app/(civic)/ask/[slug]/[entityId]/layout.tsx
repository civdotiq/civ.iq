/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getTemplate, fillPattern, getCategoryLabel } from '@/lib/questions/question-registry';
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
    const rep = await getEnhancedRepresentative(entityId.toUpperCase());
    if (!rep) return { title: 'Representative not found' };

    const entity = { name: rep.name, party: rep.party, state: rep.state };
    const title = fillPattern(template.questionPattern, entity);
    const description = fillPattern(template.descriptionPattern, entity);
    const url = `https://civdotiq.org/ask/${slug}/${entityId}`;

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

  let repName = 'Representative';
  try {
    const rep = await getEnhancedRepresentative(entityId.toUpperCase());
    if (rep) repName = rep.name;
  } catch {
    // Breadcrumb falls back to generic label
  }

  const categoryLabel = getCategoryLabel(template.category);
  const questionTitle = template.questionPattern.replace(/\{name\}/g, repName);

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
