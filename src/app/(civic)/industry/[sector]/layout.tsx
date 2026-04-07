import type { Metadata } from 'next';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ sector: string }>;
}

function formatSectorName(sector: string): string {
  return sector
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { sector } = await params;
  const sectorName = formatSectorName(sector);

  return {
    title: `${sectorName} — Industry Sector`,
    description: `Federal legislation, congressional committees, lobbying organizations, and campaign finance activity connected to the ${sectorName.toLowerCase()} industry sector.`,
    openGraph: {
      title: `${sectorName} — Industry Sector | CIV.IQ`,
      description: `Federal legislation, congressional committees, lobbying organizations, and campaign finance activity connected to the ${sectorName.toLowerCase()} industry sector.`,
      url: `https://civdotiq.org/industry/${sector}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default async function IndustrySectorLayout({ children, params }: LayoutProps) {
  const { sector } = await params;
  const sectorName = formatSectorName(sector);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Industries', url: 'https://civdotiq.org/industry' },
          { name: sectorName, url: `https://civdotiq.org/industry/${sector}` },
        ]}
      />
      <CollectionPageSchema
        name={`${sectorName} - Industry Sector`}
        description={`Federal legislation, congressional committees, lobbying organizations, and enforcement activity connected to the ${sectorName.toLowerCase()} industry sector.`}
        url={`https://civdotiq.org/industry/${sector}`}
      />
      {children}
    </>
  );
}
