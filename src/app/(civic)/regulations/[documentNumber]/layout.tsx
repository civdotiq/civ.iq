import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { isValidFederalRegisterDocumentNumber } from '@/lib/data/route-slugs';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ documentNumber: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { documentNumber } = await params;
  if (!isValidFederalRegisterDocumentNumber(documentNumber)) {
    return {};
  }

  return {
    title: `Regulation ${documentNumber}`,
    description: `Federal Register document ${documentNumber}. View full text, agency details, and comment period information.`,
    openGraph: {
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
