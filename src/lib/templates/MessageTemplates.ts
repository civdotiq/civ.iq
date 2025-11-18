/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { MessageTemplate } from '@/types/representative';

/**
 * Pre-defined message templates for common constituent issues
 * Templates support variable interpolation: {name}, {zipCode}, {representativeName}, {representativeTitle}
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'healthcare-access',
    category: 'Healthcare',
    title: 'Healthcare Access & Affordability',
    description: 'Express concerns about healthcare access, insurance costs, or Medicare/Medicaid',
    template: `I am writing to urge you to prioritize healthcare access and affordability for constituents in {zipCode}.

As your constituent, I am concerned about [specific issue: rising insurance premiums, prescription drug costs, Medicare coverage, etc.]. Many families in our community are struggling to afford necessary medical care.

I encourage you to support legislation that:
- [Your specific policy request]
- [Additional policy request]

Healthcare is a fundamental need, and I hope you will champion policies that make quality care accessible and affordable for all Americans.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'climate-environment',
    category: 'Environment',
    title: 'Climate Change & Environmental Protection',
    description: 'Advocate for climate action, clean energy, or environmental conservation',
    template: `I am writing to express my strong support for bold climate action and environmental protection.

As a constituent in {zipCode}, I am deeply concerned about the impact of climate change on our community and future generations. We are already seeing [local impacts: extreme weather, drought, flooding, wildfires, etc.].

I urge you to:
- Support renewable energy development and clean energy jobs
- Strengthen environmental protections for our air, water, and public lands
- Vote for legislation that addresses climate change with the urgency it demands

The science is clear, and the time to act is now. I hope I can count on you to be a leader on this critical issue.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'education-funding',
    category: 'Education',
    title: 'Education Funding & Student Support',
    description: 'Advocate for education funding, teacher support, or student loan relief',
    template: `I am writing to urge you to prioritize education funding and support for students and teachers in our community.

As your constituent in {zipCode}, I am concerned about [specific issue: underfunded schools, large class sizes, outdated facilities, student loan debt, etc.]. Quality education is the foundation of a strong democracy and economy.

I encourage you to support:
- Increased federal funding for public schools
- Support for teachers and education professionals
- [Student loan relief / college affordability initiatives]

Our children deserve the best possible education, and I hope you will champion policies that invest in their future.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'economy-jobs',
    category: 'Economy',
    title: 'Economic Policy & Job Creation',
    description: 'Discuss job creation, wages, workforce development, or economic opportunity',
    template: `I am writing to share my concerns about economic opportunity and job creation in {zipCode}.

Many families in our community are struggling with [specific issue: unemployment, low wages, lack of opportunity, rising costs, etc.]. We need policies that create good-paying jobs and build a stronger middle class.

I urge you to support:
- Infrastructure investments that create jobs
- Workforce development and job training programs
- Policies that raise wages and strengthen workers' rights
- Support for small businesses and entrepreneurs

A strong economy works for everyone, not just those at the top. I hope you will fight for policies that create opportunity for all Americans.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'infrastructure',
    category: 'Infrastructure',
    title: 'Infrastructure Investment',
    description: 'Advocate for roads, bridges, broadband, public transit, or water systems',
    template: `I am writing to urge you to support robust infrastructure investment in our community and across the country.

As a constituent in {zipCode}, I see daily the need for [specific infrastructure: road repairs, bridge maintenance, public transit, broadband access, clean water systems, etc.]. Our aging infrastructure is holding back economic growth and quality of life.

I encourage you to support legislation that:
- Invests in roads, bridges, and transportation systems
- Expands broadband internet access to rural and underserved areas
- Modernizes our water and wastewater infrastructure
- Creates good-paying jobs through infrastructure projects

Infrastructure investment is critical for our economy and communities. I hope you will make this a priority.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'voting-rights',
    category: 'Democracy',
    title: 'Voting Rights & Election Security',
    description: 'Support voting access, election security, or campaign finance reform',
    template: `I am writing to urge you to protect and expand voting rights for all Americans.

As your constituent in {zipCode}, I am deeply concerned about [specific issue: voter suppression, election security, gerrymandering, campaign finance, etc.]. The right to vote is the foundation of our democracy.

I encourage you to:
- Protect and expand access to voting for all eligible citizens
- Strengthen election security while ensuring accessibility
- Support campaign finance reform to reduce the influence of money in politics
- [Additional specific policy request]

Democracy works best when everyone can participate. I hope you will stand up for the fundamental right to vote.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'immigration',
    category: 'Immigration',
    title: 'Immigration Reform',
    description: 'Advocate for immigration policy, border security, or DACA/Dreamers',
    template: `I am writing to share my views on immigration policy and urge you to support comprehensive immigration reform.

As a constituent in {zipCode}, I believe we need [specific policy: pathway to citizenship, protection for Dreamers, border security, refugee support, etc.]. Our immigration system is broken and needs thoughtful, humane solutions.

I encourage you to support legislation that:
- [Your specific policy request]
- Provides a pathway to citizenship for undocumented immigrants
- Protects Dreamers and their families
- Creates a fair, efficient immigration process

Immigration has always been part of America's strength. I hope you will work toward solutions that reflect our values and needs.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'gun-safety',
    category: 'Public Safety',
    title: 'Gun Safety & Violence Prevention',
    description: 'Advocate for gun safety measures, background checks, or violence prevention',
    template: `I am writing to urge you to take action on gun safety and violence prevention.

As your constituent in {zipCode}, I am deeply concerned about gun violence in our community and across the country. [Personal connection or local incident, if applicable].

I encourage you to support:
- Universal background checks for all gun purchases
- Red flag laws to prevent violence before it occurs
- [Additional measures: assault weapons ban, high-capacity magazine restrictions, etc.]
- Community violence intervention programs

We can respect Second Amendment rights while also taking common-sense steps to keep our communities safe. I hope you will be a leader on this critical issue.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'social-security-medicare',
    category: 'Social Programs',
    title: 'Social Security & Medicare Protection',
    description: 'Protect Social Security, Medicare, or other safety net programs',
    template: `I am writing to urge you to protect and strengthen Social Security and Medicare.

As a constituent in {zipCode}, I am concerned about proposals to cut or privatize these vital programs. [Millions of Americans / I] depend on Social Security and Medicare for retirement security and healthcare.

I urge you to:
- Oppose any cuts to Social Security or Medicare benefits
- Strengthen these programs for current and future generations
- Explore revenue solutions that don't burden middle-class families
- Protect the Medicare trust fund

These programs represent a promise to American workers. I hope you will stand strong against any attempts to weaken them.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'housing-affordability',
    category: 'Housing',
    title: 'Housing Affordability & Homelessness',
    description: 'Address housing costs, homelessness, or affordable housing development',
    template: `I am writing to urge you to address the housing affordability crisis in our community.

As a constituent in {zipCode}, I am concerned about [specific issue: rising rents, lack of affordable housing, homelessness, etc.]. Too many families are being priced out of safe, stable housing.

I encourage you to support:
- Investments in affordable housing development
- Rental assistance for low-income families
- Homelessness prevention and support services
- Policies that make homeownership more accessible

Housing is a basic human need. I hope you will champion policies that ensure everyone has access to safe, affordable housing.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
  {
    id: 'custom',
    category: 'Other',
    title: 'Custom Message',
    description: 'Write your own message from scratch',
    template: `I am writing as your constituent in {zipCode} to share my views on an important issue.

[Write your message here]

Thank you for your attention to this matter.`,
    variables: ['name', 'zipCode', 'representativeName', 'representativeTitle'],
  },
];

/**
 * Format a message template with provided values
 */
export function formatTemplate(
  template: MessageTemplate,
  values: {
    name: string;
    zipCode: string;
    representativeName?: string;
    representativeTitle?: string;
  }
): string {
  let formatted = template.template;

  // Replace template variables
  formatted = formatted.replace(/{name}/g, values.name);
  formatted = formatted.replace(/{zipCode}/g, values.zipCode);
  formatted = formatted.replace(
    /{representativeName}/g,
    values.representativeName || 'Representative'
  );
  formatted = formatted.replace(
    /{representativeTitle}/g,
    values.representativeTitle || 'Representative'
  );

  return formatted;
}

/**
 * Get all templates grouped by category
 */
export function getTemplatesByCategory(): Record<string, MessageTemplate[]> {
  const grouped: Record<string, MessageTemplate[]> = {};

  MESSAGE_TEMPLATES.forEach(template => {
    const category = template.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category]!.push(template);
  });

  return grouped;
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(MESSAGE_TEMPLATES.map(t => t.category)));
}
