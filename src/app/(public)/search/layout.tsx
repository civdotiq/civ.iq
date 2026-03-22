import { GovernmentServiceSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Search', url: 'https://civdotiq.org/search' },
        ]}
      />
      <GovernmentServiceSchema
        name="Representative Search"
        description="Search for U.S. representatives by name, state, party, committee, and voting pattern."
        url="https://civdotiq.org/search"
        serviceType="Search"
      />
      {children}
    </>
  );
}
