/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Industry Taxonomy & Categorization System
 *
 * Categorizes FEC contributor employers and occupations into standardized industry sectors.
 * Based on OpenSecrets' 13-sector classification model with keyword-based categorization.
 *
 * Sectors (inspired by OpenSecrets):
 * 1. Agribusiness
 * 2. Communications/Electronics
 * 3. Construction
 * 4. Defense
 * 5. Energy/Natural Resources
 * 6. Finance/Insurance/Real Estate
 * 7. Health
 * 8. Lawyers & Lobbyists
 * 9. Transportation
 * 10. Misc Business
 * 11. Labor
 * 12. Ideology/Single-Issue
 * 13. Other/Unknown
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Industry sector enumeration
 */
export enum IndustrySector {
  AGRIBUSINESS = 'Agribusiness',
  COMMUNICATIONS_ELECTRONICS = 'Communications/Electronics',
  CONSTRUCTION = 'Construction',
  DEFENSE = 'Defense',
  ENERGY_NATURAL_RESOURCES = 'Energy/Natural Resources',
  FINANCE_INSURANCE_REAL_ESTATE = 'Finance/Insurance/Real Estate',
  HEALTH = 'Health',
  LAWYERS_LOBBYISTS = 'Lawyers & Lobbyists',
  TRANSPORTATION = 'Transportation',
  MISC_BUSINESS = 'Misc Business',
  LABOR = 'Labor',
  IDEOLOGY_SINGLE_ISSUE = 'Ideology/Single-Issue',
  OTHER = 'Other',
}

/**
 * Detailed industry category under each sector
 */
export interface IndustryCategory {
  sector: IndustrySector;
  category: string;
  keywords: string[];
  occupationKeywords?: string[];
}

/**
 * Categorized contribution with industry classification
 */
export interface CategorizedContribution {
  sector: IndustrySector;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
  matchSource: 'employer' | 'occupation' | 'inferred';
}

/**
 * Industry taxonomy database
 * Comprehensive keyword matching for employer and occupation classification
 */
const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  // AGRIBUSINESS
  {
    sector: IndustrySector.AGRIBUSINESS,
    category: 'Crop Production',
    keywords: ['farm', 'farming', 'agriculture', 'crop', 'grain', 'wheat', 'corn', 'soybean'],
    occupationKeywords: ['farmer', 'agricultural', 'agronomist'],
  },
  {
    sector: IndustrySector.AGRIBUSINESS,
    category: 'Livestock',
    keywords: ['ranch', 'cattle', 'dairy', 'livestock', 'poultry', 'beef', 'pork'],
    occupationKeywords: ['rancher', 'veterinarian'],
  },
  {
    sector: IndustrySector.AGRIBUSINESS,
    category: 'Food Processing',
    keywords: ['food processing', 'food service', 'restaurant', 'catering', 'grocery'],
    occupationKeywords: ['chef', 'cook', 'food service'],
  },

  // COMMUNICATIONS/ELECTRONICS
  {
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    category: 'Telecommunications',
    keywords: [
      'telecom',
      'verizon',
      'at&t',
      'comcast',
      'spectrum',
      'phone',
      'wireless',
      'cellular',
    ],
    occupationKeywords: ['telecommunications'],
  },
  {
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    category: 'Internet/Tech',
    keywords: [
      'google',
      'amazon',
      'microsoft',
      'apple',
      'facebook',
      'meta',
      'twitter',
      'software',
      'tech',
      'technology',
      'internet',
      'web',
      'digital',
    ],
    occupationKeywords: ['software engineer', 'developer', 'programmer', 'data scientist', 'tech'],
  },
  {
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    category: 'TV/Movies/Music',
    keywords: [
      'television',
      'movie',
      'film',
      'music',
      'entertainment',
      'media',
      'broadcasting',
      'netflix',
      'disney',
    ],
    occupationKeywords: ['actor', 'producer', 'musician', 'artist'],
  },
  {
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    category: 'Electronics Manufacturing',
    keywords: ['electronics', 'semiconductor', 'chip', 'circuit', 'intel', 'nvidia', 'amd'],
    occupationKeywords: ['electrical engineer', 'electronics'],
  },

  // CONSTRUCTION
  {
    sector: IndustrySector.CONSTRUCTION,
    category: 'General Contractors',
    keywords: ['construction', 'contractor', 'builder', 'building', 'developer', 'remodeling'],
    occupationKeywords: ['contractor', 'construction', 'builder'],
  },
  {
    sector: IndustrySector.CONSTRUCTION,
    category: 'Home Builders',
    keywords: ['home builder', 'homebuilder', 'residential construction', 'housing'],
  },
  {
    sector: IndustrySector.CONSTRUCTION,
    category: 'Construction Services',
    keywords: ['plumbing', 'electrical', 'hvac', 'roofing', 'carpentry'],
    occupationKeywords: ['plumber', 'electrician', 'carpenter', 'roofer'],
  },

  // DEFENSE
  {
    sector: IndustrySector.DEFENSE,
    category: 'Defense Aerospace',
    keywords: [
      'boeing',
      'lockheed',
      'raytheon',
      'northrop grumman',
      'general dynamics',
      'defense',
      'aerospace',
      'military',
    ],
    occupationKeywords: ['defense', 'military'],
  },
  {
    sector: IndustrySector.DEFENSE,
    category: 'Defense Electronics',
    keywords: ['defense electronics', 'missile', 'weapons systems'],
  },

  // ENERGY/NATURAL RESOURCES
  {
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    category: 'Oil & Gas',
    keywords: ['oil', 'gas', 'petroleum', 'exxon', 'chevron', 'shell', 'bp', 'energy', 'drilling'],
    occupationKeywords: ['petroleum engineer', 'oil', 'gas'],
  },
  {
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    category: 'Electric Utilities',
    keywords: ['electric', 'utility', 'power', 'electricity', 'grid'],
    occupationKeywords: ['power plant', 'utility'],
  },
  {
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    category: 'Renewable Energy',
    keywords: ['solar', 'wind', 'renewable', 'clean energy', 'green energy'],
  },
  {
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    category: 'Mining',
    keywords: ['mining', 'coal', 'mineral', 'extraction'],
    occupationKeywords: ['miner', 'mining'],
  },

  // FINANCE/INSURANCE/REAL ESTATE
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    category: 'Commercial Banks',
    keywords: [
      'bank',
      'banking',
      'chase',
      'wells fargo',
      'bank of america',
      'citibank',
      'financial services',
    ],
    occupationKeywords: ['banker', 'banking'],
  },
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    category: 'Insurance',
    keywords: [
      'insurance',
      'allstate',
      'state farm',
      'geico',
      'progressive',
      'life insurance',
      'health insurance',
    ],
    occupationKeywords: ['insurance', 'actuary'],
  },
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    category: 'Real Estate',
    keywords: ['real estate', 'realty', 'property management', 'realtor'],
    occupationKeywords: ['realtor', 'real estate agent', 'property manager'],
  },
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    category: 'Securities & Investment',
    keywords: [
      'investment',
      'securities',
      'hedge fund',
      'private equity',
      'venture capital',
      'asset management',
      'goldman sachs',
      'morgan stanley',
    ],
    occupationKeywords: ['financial advisor', 'investment', 'trader', 'analyst'],
  },
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    category: 'Accounting',
    keywords: ['accounting', 'accountant', 'cpa', 'kpmg', 'deloitte', 'pwc', 'ernst & young'],
    occupationKeywords: ['accountant', 'cpa', 'auditor'],
  },

  // HEALTH
  {
    sector: IndustrySector.HEALTH,
    category: 'Health Professionals',
    keywords: ['hospital', 'clinic', 'medical center', 'health system'],
    occupationKeywords: [
      'physician',
      'doctor',
      'nurse',
      'surgeon',
      'medical',
      'healthcare',
      'dentist',
    ],
  },
  {
    sector: IndustrySector.HEALTH,
    category: 'Pharmaceuticals',
    keywords: ['pharmaceutical', 'pharma', 'pfizer', 'merck', 'johnson & johnson', 'drug'],
    occupationKeywords: ['pharmacist', 'pharmaceutical'],
  },
  {
    sector: IndustrySector.HEALTH,
    category: 'Health Insurance',
    keywords: ['health insurance', 'uhc', 'aetna', 'cigna', 'anthem', 'humana'],
  },
  {
    sector: IndustrySector.HEALTH,
    category: 'Medical Devices',
    keywords: ['medical device', 'medtronic', 'abbott'],
  },

  // LAWYERS & LOBBYISTS
  {
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    category: 'Law Firms',
    keywords: ['law firm', 'legal', 'attorney', 'esquire'],
    occupationKeywords: ['attorney', 'lawyer', 'legal', 'counsel', 'paralegal'],
  },
  {
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    category: 'Lobbyists',
    keywords: ['lobbying', 'government relations', 'public affairs'],
    occupationKeywords: ['lobbyist', 'government relations'],
  },

  // TRANSPORTATION
  {
    sector: IndustrySector.TRANSPORTATION,
    category: 'Air Transport',
    keywords: ['airline', 'aviation', 'american airlines', 'delta', 'united airlines'],
    occupationKeywords: ['pilot', 'flight attendant', 'aviation'],
  },
  {
    sector: IndustrySector.TRANSPORTATION,
    category: 'Automotive',
    keywords: ['automotive', 'auto', 'ford', 'gm', 'toyota', 'honda', 'car', 'vehicle'],
    occupationKeywords: ['automotive', 'mechanic'],
  },
  {
    sector: IndustrySector.TRANSPORTATION,
    category: 'Railroads',
    keywords: ['railroad', 'rail', 'amtrak', 'freight rail'],
  },
  {
    sector: IndustrySector.TRANSPORTATION,
    category: 'Trucking',
    keywords: ['trucking', 'freight', 'logistics', 'shipping', 'ups', 'fedex'],
    occupationKeywords: ['truck driver', 'driver'],
  },

  // MISC BUSINESS
  {
    sector: IndustrySector.MISC_BUSINESS,
    category: 'Retail',
    keywords: ['retail', 'walmart', 'target', 'costco', 'store', 'shop'],
    occupationKeywords: ['retail', 'sales', 'cashier'],
  },
  {
    sector: IndustrySector.MISC_BUSINESS,
    category: 'Manufacturing',
    keywords: ['manufacturing', 'factory', 'production', 'industrial'],
    occupationKeywords: ['engineer', 'manufacturing'],
  },
  {
    sector: IndustrySector.MISC_BUSINESS,
    category: 'Business Services',
    keywords: ['consulting', 'consultant', 'business services', 'management'],
    occupationKeywords: ['consultant', 'business analyst'],
  },
  {
    sector: IndustrySector.MISC_BUSINESS,
    category: 'Chemical',
    keywords: ['chemical', 'dow', 'dupont'],
    occupationKeywords: ['chemical engineer', 'chemist'],
  },
  {
    sector: IndustrySector.MISC_BUSINESS,
    category: 'Lodging/Tourism',
    keywords: ['hotel', 'resort', 'hospitality', 'tourism', 'marriott', 'hilton'],
    occupationKeywords: ['hotel', 'hospitality'],
  },

  // LABOR
  {
    sector: IndustrySector.LABOR,
    category: 'Labor Unions',
    keywords: [
      'union',
      'afl-cio',
      'teamsters',
      'seiu',
      'uaw',
      'afscme',
      'laborers',
      'steelworkers',
    ],
    occupationKeywords: ['union'],
  },

  // IDEOLOGY/SINGLE-ISSUE
  {
    sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    category: 'Non-Profit/Advocacy',
    keywords: [
      'non-profit',
      'nonprofit',
      'foundation',
      'charity',
      'advocacy',
      'association',
      'organization',
    ],
    occupationKeywords: ['nonprofit', 'advocacy'],
  },
  {
    sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    category: 'Education',
    keywords: ['school', 'university', 'college', 'education', 'academic'],
    occupationKeywords: ['teacher', 'professor', 'educator', 'principal'],
  },
  {
    sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    category: 'Religious Organizations',
    keywords: ['church', 'religious', 'ministry', 'faith'],
    occupationKeywords: ['minister', 'pastor', 'clergy'],
  },

  // OTHER
  {
    sector: IndustrySector.OTHER,
    category: 'Government',
    keywords: ['government', 'federal', 'state', 'city', 'county', 'municipal', 'public sector'],
    occupationKeywords: ['government', 'public'],
  },
  {
    sector: IndustrySector.OTHER,
    category: 'Retired',
    keywords: ['retired', 'retirement'],
    occupationKeywords: ['retired'],
  },
  {
    sector: IndustrySector.OTHER,
    category: 'Self-Employed',
    keywords: ['self employed', 'self-employed', 'freelance', 'independent'],
    occupationKeywords: ['self employed', 'self-employed', 'freelance'],
  },
  {
    sector: IndustrySector.OTHER,
    category: 'Not Employed',
    keywords: ['not employed', 'unemployed', 'homemaker'],
    occupationKeywords: ['not employed', 'homemaker', 'student'],
  },
];

/**
 * Categorize a contribution based on employer and occupation
 */
export function categorizeContribution(
  employer?: string,
  occupation?: string
): CategorizedContribution {
  if (!employer && !occupation) {
    return {
      sector: IndustrySector.OTHER,
      category: 'Unknown',
      confidence: 'low',
      matchSource: 'inferred',
    };
  }

  const employerLower = employer?.toLowerCase() || '';
  const occupationLower = occupation?.toLowerCase() || '';

  // Try employer match first (higher confidence)
  for (const industry of INDUSTRY_CATEGORIES) {
    for (const keyword of industry.keywords) {
      if (employerLower.includes(keyword.toLowerCase())) {
        return {
          sector: industry.sector,
          category: industry.category,
          confidence: 'high',
          matchedKeyword: keyword,
          matchSource: 'employer',
        };
      }
    }
  }

  // Try occupation match (medium confidence)
  if (occupationLower) {
    for (const industry of INDUSTRY_CATEGORIES) {
      if (industry.occupationKeywords) {
        for (const keyword of industry.occupationKeywords) {
          if (occupationLower.includes(keyword.toLowerCase())) {
            return {
              sector: industry.sector,
              category: industry.category,
              confidence: 'medium',
              matchedKeyword: keyword,
              matchSource: 'occupation',
            };
          }
        }
      }
    }
  }

  // No match found
  return {
    sector: IndustrySector.OTHER,
    category: 'Other/Unknown',
    confidence: 'low',
    matchSource: 'inferred',
  };
}

/**
 * Aggregate contributions by industry sector
 */
export function aggregateByIndustrySector(
  contributions: Array<{
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
  }>
): Array<{
  sector: IndustrySector;
  totalAmount: number;
  contributionCount: number;
  percentage: number;
  categories: Map<string, { amount: number; count: number }>;
}> {
  const sectorMap = new Map<
    IndustrySector,
    {
      totalAmount: number;
      contributionCount: number;
      categories: Map<string, { amount: number; count: number }>;
    }
  >();

  let totalContributions = 0;

  for (const contrib of contributions) {
    const categorization = categorizeContribution(
      contrib.contributor_employer,
      contrib.contributor_occupation
    );

    const amount = contrib.contribution_receipt_amount;
    totalContributions += amount;

    const existing = sectorMap.get(categorization.sector) || {
      totalAmount: 0,
      contributionCount: 0,
      categories: new Map(),
    };

    existing.totalAmount += amount;
    existing.contributionCount++;

    const categoryData = existing.categories.get(categorization.category) || {
      amount: 0,
      count: 0,
    };
    categoryData.amount += amount;
    categoryData.count++;
    existing.categories.set(categorization.category, categoryData);

    sectorMap.set(categorization.sector, existing);
  }

  const result = Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    totalAmount: data.totalAmount,
    contributionCount: data.contributionCount,
    percentage: totalContributions > 0 ? (data.totalAmount / totalContributions) * 100 : 0,
    categories: data.categories,
  }));

  logger.debug(
    `[Industry Taxonomy] Categorized ${contributions.length} contributions into ${result.length} sectors`
  );

  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Get top categories across all sectors
 */
export function getTopCategories(
  contributions: Array<{
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
  }>,
  limit: number = 10
): Array<{
  sector: IndustrySector;
  category: string;
  totalAmount: number;
  contributionCount: number;
  percentage: number;
}> {
  const categoryMap = new Map<
    string,
    { sector: IndustrySector; totalAmount: number; contributionCount: number }
  >();

  let totalContributions = 0;

  for (const contrib of contributions) {
    const categorization = categorizeContribution(
      contrib.contributor_employer,
      contrib.contributor_occupation
    );

    const amount = contrib.contribution_receipt_amount;
    totalContributions += amount;

    const key = `${categorization.sector}:${categorization.category}`;
    const existing = categoryMap.get(key) || {
      sector: categorization.sector,
      totalAmount: 0,
      contributionCount: 0,
    };

    existing.totalAmount += amount;
    existing.contributionCount++;

    categoryMap.set(key, existing);
  }

  const result = Array.from(categoryMap.entries())
    .map(([key, data]) => ({
      sector: data.sector,
      category: key.split(':')[1]!,
      totalAmount: data.totalAmount,
      contributionCount: data.contributionCount,
      percentage: totalContributions > 0 ? (data.totalAmount / totalContributions) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);

  return result;
}
