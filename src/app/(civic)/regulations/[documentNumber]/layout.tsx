import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { cache } from 'react';
import { isValidFederalRegisterDocumentNumber } from '@/lib/data/route-slugs';
import { lookupFederalRegisterDocument } from '@/lib/data-sources/federal-register-service';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ documentNumber: string }>;
}

/** Once per request for metadata and layout. */
const getDocumentLookup = cache(lookupFederalRegisterDocument);

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { documentNumber } = await params;
  if (!isValidFederalRegisterDocumentNumber(documentNumber)) {
    return {};
  }
  const lookup = await getDocumentLookup(documentNumber);
  if (lookup.status === 'not_found') return { title: 'Regulation not found' };
  // The page explains the outage itself; it must not be indexed meanwhile.
  const robots = lookup.status === 'unavailable' ? { index: false, follow: true } : undefined;

  return {
    title: `Regulation ${documentNumber}`,
    ...(robots ? { robots } : {}),
    alternates: { canonical: `https://civdotiq.org/regulations/${documentNumber}` },
    description: `Federal Register document ${documentNumber}. View full text, agency details, and comment period information.`,
    openGraph: {
      images: SITE_OG_IMAGES,
      title: `Regulation ${documentNumber} | CIV.IQ`,
      description: `Federal Register document ${documentNumber}. View full text, agency details, and comment period information.`,
      url: `https://civdotiq.org/regulations/${documentNumber}`,
      siteName: 'CIV.IQ',
      type: 'article',
    },
  };
}

export default async function RegulationDetailLayout({ children, params }: LayoutProps) {
  const { documentNumber } = await params;
  if (!isValidFederalRegisterDocumentNumber(documentNumber)) {
    notFound();
  }
  // A real 404 only when the Federal Register says so; on a failed lookup the
  // page renders and shows its own "temporarily unavailable" state.
  if ((await getDocumentLookup(documentNumber)).status === 'not_found') notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Regulations', url: 'https://civdotiq.org/regulations' },
          {
            name: documentNumber,
            url: `https://civdotiq.org/regulations/${documentNumber}`,
          },
        ]}
      />
      {children}
    </>
  );
}
