import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

export default async function IndustrySectorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  const sectorName = sector
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

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
        description={`Federal legislation, congressional committees, and government agencies connected to the ${sectorName.toLowerCase()} industry sector.`}
        url={`https://civdotiq.org/industry/${sector}`}
      />
      {children}
    </>
  );
}
