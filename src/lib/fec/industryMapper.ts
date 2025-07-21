/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ContributionDetail, IndustryCategory } from '@/types/fec';

// Comprehensive industry mapping with keywords for pattern matching
export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    keywords: [
      'hospital', 'physician', 'doctor', 'nurse', 'medical', 'pharmacy', 'pharmaceutical',
      'health', 'clinic', 'dentist', 'surgeon', 'therapist', 'healthcare', 'medicare',
      'medicaid', 'pfizer', 'johnson', 'merck', 'abbott', 'bristol', 'eli lilly',
      'novartis', 'roche', 'gsk', 'glaxosmithkline', 'astrazeneca', 'biogen',
      'biotech', 'biotechnology', 'drugs', 'medicine'
    ],
    color: '#ef4444',
    icon: '🏥'
  },
  {
    id: 'finance',
    name: 'Finance & Banking',
    keywords: [
      'bank', 'banking', 'investment', 'securities', 'hedge fund', 'private equity',
      'goldman sachs', 'morgan stanley', 'jpmorgan', 'chase', 'wells fargo',
      'bank of america', 'citigroup', 'credit', 'loan', 'mortgage', 'finance',
      'financial', 'capital', 'fund', 'asset management', 'wealth management',
      'broker', 'trading', 'wall street', 'blackrock', 'vanguard', 'fidelity',
      'insurance', 'mutual fund', 'pension'
    ],
    color: '#10b981',
    icon: '🏦'
  },
  {
    id: 'technology',
    name: 'Technology',
    keywords: [
      'tech', 'technology', 'software', 'computer', 'internet', 'digital',
      'microsoft', 'apple', 'google', 'amazon', 'facebook', 'meta', 'twitter',
      'tesla', 'netflix', 'oracle', 'salesforce', 'adobe', 'intel', 'nvidia',
      'cisco', 'ibm', 'dell', 'hp', 'semiconductor', 'chip', 'ai', 'artificial intelligence',
      'data', 'cloud', 'cybersecurity', 'startup', 'venture capital', 'programmer',
      'developer', 'engineer', 'coding', 'blockchain', 'cryptocurrency'
    ],
    color: '#3b82f6',
    icon: '💻'
  },
  {
    id: 'energy',
    name: 'Energy & Utilities',
    keywords: [
      'oil', 'gas', 'electric', 'electricity', 'utility', 'power', 'energy',
      'solar', 'wind', 'renewable', 'coal', 'petroleum', 'natural gas',
      'exxon', 'chevron', 'conocophillips', 'shell', 'bp', 'total', 'enron',
      'duke energy', 'southern company', 'nextera', 'dominion', 'exelon',
      'nuclear', 'hydro', 'pipeline', 'refinery', 'drilling', 'fracking',
      'clean energy', 'green energy', 'fossil fuel'
    ],
    color: '#f59e0b',
    icon: '⚡'
  },
  {
    id: 'defense',
    name: 'Defense & Aerospace',
    keywords: [
      'defense', 'aerospace', 'military', 'contractor', 'boeing', 'lockheed martin',
      'raytheon', 'northrop grumman', 'general dynamics', 'bae systems',
      'aircraft', 'missile', 'radar', 'satellite', 'space', 'navy', 'army',
      'air force', 'pentagon', 'weapons', 'armament', 'security', 'intelligence',
      'cyber warfare', 'drone', 'fighter jet', 'helicopter'
    ],
    color: '#6b7280',
    icon: '🛡️'
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    keywords: [
      'real estate', 'realty', 'property', 'development', 'construction',
      'builder', 'developer', 'mortgage', 'housing', 'commercial property',
      'residential', 'landlord', 'tenant', 'rent', 'lease', 'broker',
      'realtor', 'home', 'building', 'apartment', 'office building',
      'shopping center', 'mall', 'warehouse', 'industrial', 'zoning'
    ],
    color: '#8b5cf6',
    icon: '🏠'
  },
  {
    id: 'legal',
    name: 'Legal Services',
    keywords: [
      'attorney', 'lawyer', 'legal', 'law firm', 'counsel', 'litigation',
      'court', 'judge', 'paralegal', 'legal aid', 'public defender',
      'prosecutor', 'district attorney', 'solicitor', 'barrister',
      'legal services', 'law office', 'advocacy', 'compliance',
      'regulatory', 'contract', 'intellectual property', 'patent',
      'trademark', 'corporate law', 'criminal law', 'civil law'
    ],
    color: '#0f172a',
    icon: '⚖️'
  },
  {
    id: 'education',
    name: 'Education',
    keywords: [
      'education', 'school', 'university', 'college', 'teacher', 'professor',
      'student', 'academic', 'research', 'educational', 'learning',
      'tuition', 'scholarship', 'grant', 'curriculum', 'textbook',
      'harvard', 'yale', 'stanford', 'mit', 'princeton', 'columbia',
      'public school', 'private school', 'charter school', 'elementary',
      'secondary', 'higher education', 'community college', 'training',
      'certification', 'degree', 'diploma'
    ],
    color: '#dc2626',
    icon: '🎓'
  },
  {
    id: 'healthcare-services',
    name: 'Healthcare Services',
    keywords: [
      'healthcare services', 'medical services', 'health services',
      'home health', 'nursing home', 'assisted living', 'hospice',
      'mental health', 'behavioral health', 'therapy', 'counseling',
      'rehabilitation', 'physical therapy', 'occupational therapy',
      'speech therapy', 'medical equipment', 'medical devices',
      'diagnostic', 'laboratory', 'pathology', 'radiology', 'imaging'
    ],
    color: '#059669',
    icon: '🩺'
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Food',
    keywords: [
      'agriculture', 'farming', 'farm', 'farmer', 'crop', 'livestock',
      'cattle', 'dairy', 'poultry', 'chicken', 'pig', 'beef', 'pork',
      'grain', 'corn', 'wheat', 'soybean', 'rice', 'vegetable', 'fruit',
      'food', 'grocery', 'restaurant', 'food service', 'catering',
      'organic', 'sustainable', 'fertilizer', 'pesticide', 'seed',
      'john deere', 'caterpillar', 'monsanto', 'cargill', 'tyson',
      'archer daniels', 'food processing', 'beverage', 'alcohol', 'wine'
    ],
    color: '#65a30d',
    icon: '🌾'
  },
  {
    id: 'transportation',
    name: 'Transportation',
    keywords: [
      'transportation', 'transport', 'airline', 'railroad', 'railway',
      'shipping', 'trucking', 'logistics', 'freight', 'cargo',
      'fedex', 'ups', 'dhl', 'usps', 'delta', 'american airlines',
      'united airlines', 'southwest', 'jetblue', 'alaska airlines',
      'amtrak', 'union pacific', 'bnsf', 'csx', 'norfolk southern',
      'automotive', 'car', 'truck', 'bus', 'taxi', 'uber', 'lyft',
      'port', 'harbor', 'maritime', 'vessel', 'boat', 'ship'
    ],
    color: '#0ea5e9',
    icon: '🚛'
  },
  {
    id: 'media',
    name: 'Media & Entertainment',
    keywords: [
      'media', 'entertainment', 'television', 'tv', 'radio', 'newspaper',
      'magazine', 'publishing', 'book', 'news', 'journalism', 'reporter',
      'broadcast', 'cable', 'streaming', 'film', 'movie', 'cinema',
      'theater', 'music', 'record', 'artist', 'actor', 'producer',
      'director', 'disney', 'warner', 'universal', 'paramount',
      'sony', 'fox', 'nbc', 'abc', 'cbs', 'cnn', 'msnbc', 'fox news',
      'espn', 'hbo', 'showtime', 'netflix', 'hulu', 'amazon prime'
    ],
    color: '#f97316',
    icon: '📺'
  },
  {
    id: 'retail',
    name: 'Retail & Consumer',
    keywords: [
      'retail', 'store', 'shop', 'shopping', 'consumer', 'walmart',
      'target', 'costco', 'amazon', 'home depot', 'lowes', 'best buy',
      'macys', 'nordstrom', 'gap', 'nike', 'adidas', 'starbucks',
      'mcdonalds', 'burger king', 'kfc', 'taco bell', 'subway',
      'grocery', 'supermarket', 'convenience', 'department store',
      'specialty retail', 'apparel', 'clothing', 'fashion', 'luxury',
      'brand', 'merchandise', 'sales', 'marketing', 'advertising'
    ],
    color: '#ec4899',
    icon: '🛒'
  },
  {
    id: 'labor',
    name: 'Labor & Unions',
    keywords: [
      'union', 'labor', 'worker', 'employee', 'afl-cio', 'teamsters',
      'seiu', 'uaw', 'unite here', 'afscme', 'aft', 'nea', 'ibew',
      'steelworkers', 'carpenters', 'plumbers', 'electricians',
      'machinists', 'firefighters', 'police', 'teachers', 'nurses',
      'postal', 'government', 'public sector', 'private sector',
      'collective bargaining', 'strike', 'organizing', 'workplace',
      'employment', 'job', 'wage', 'salary', 'benefits', 'pension'
    ],
    color: '#dc2626',
    icon: '👷'
  },
  {
    id: 'nonprofit',
    name: 'Non-Profit & Advocacy',
    keywords: [
      'nonprofit', 'non-profit', 'charity', 'foundation', 'advocacy',
      'activist', 'civil rights', 'human rights', 'environmental',
      'climate', 'conservation', 'wildlife', 'nature', 'green',
      'planned parenthood', 'aclu', 'nra', 'sierra club', 'naacp',
      'united way', 'salvation army', 'red cross', 'goodwill',
      'habitat for humanity', 'religious', 'church', 'faith',
      'community', 'social justice', 'equality', 'rights', 'freedom'
    ],
    color: '#16a34a',
    icon: '🤝'
  }
];

// Industry keywords for more granular matching
const INDUSTRY_KEYWORDS = new Map(
  INDUSTRY_CATEGORIES.map(category => [
    category.id,
    new Set(category.keywords.map(k => k.toLowerCase()))
  ])
);

/**
 * Categorize a contribution by industry based on employer and occupation
 */
export function categorizeContributionByIndustry(
  contribution: Pick<ContributionDetail, 'employerName' | 'occupation'>
): string {
  const employer = (contribution.employerName || '').toLowerCase();
  const occupation = (contribution.occupation || '').toLowerCase();
  
  // Create search text combining employer and occupation
  const searchText = `${employer} ${occupation}`.toLowerCase();
  
  // Find matching industry
  for (const [industryId, keywords] of INDUSTRY_KEYWORDS) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return industryId;
      }
    }
  }
  
  // Check for common variations and synonyms
  if (searchText.includes('retired')) {
    return 'other'; // Retired contributors
  }
  
  if (searchText.includes('student')) {
    return 'education';
  }
  
  if (searchText.includes('homemaker') || searchText.includes('housewife')) {
    return 'other';
  }
  
  if (searchText.includes('self-employed') || searchText.includes('consultant')) {
    return 'professional-services';
  }
  
  return 'other'; // Default category
}

/**
 * Get industry information by ID
 */
export function getIndustryById(id: string): IndustryCategory | null {
  return INDUSTRY_CATEGORIES.find(cat => cat.id === id) || null;
}

/**
 * Get all industry categories
 */
export function getAllIndustries(): IndustryCategory[] {
  return INDUSTRY_CATEGORIES;
}

/**
 * Process contributions and group by industry
 */
export function categorizeContributionsByIndustry(
  contributions: ContributionDetail[]
): Map<string, ContributionDetail[]> {
  const industryMap = new Map<string, ContributionDetail[]>();
  
  for (const contribution of contributions) {
    const industryId = categorizeContributionByIndustry(contribution);
    
    if (!industryMap.has(industryId)) {
      industryMap.set(industryId, []);
    }
    
    industryMap.get(industryId)!.push({
      ...contribution,
      industry: industryId
    });
  }
  
  return industryMap;
}

/**
 * Calculate industry statistics
 */
export function calculateIndustryStats(
  industryContributions: Map<string, ContributionDetail[]>
): Array<{
  name: string;
  amount: number;
  percentage: number;
  contributorCount: number;
  topEmployers: Array<{
    name: string;
    amount: number;
    count: number;
  }>;
  trend: 'up' | 'down' | 'stable';
}> {
  const totalAmount = Array.from(industryContributions.values())
    .flat()
    .reduce((sum, contrib) => sum + contrib.amount, 0);
  
  const industryStats = Array.from(industryContributions.entries())
    .map(([industryId, contributions]) => {
      const industry = getIndustryById(industryId);
      const industryName = industry?.name || 'Other';
      
      const amount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      
      // Calculate top employers within this industry
      const employerMap = new Map<string, { amount: number; count: number }>();
      
      for (const contrib of contributions) {
        const employer = contrib.employerName || 'Unknown';
        if (!employerMap.has(employer)) {
          employerMap.set(employer, { amount: 0, count: 0 });
        }
        const emp = employerMap.get(employer)!;
        emp.amount += contrib.amount;
        emp.count += 1;
      }
      
      const topEmployers = Array.from(employerMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      return {
        name: industryName,
        amount,
        percentage,
        contributorCount: contributions.length,
        topEmployers,
        trend: calculateTrend(contributions) // Calculate trend based on historical data
      };
    })
    .sort((a, b) => b.amount - a.amount);
  
  return industryStats;
}

/**
 * Get industry diversity score (0-100, higher = more diverse)
 */
export function calculateIndustryDiversityScore(
  industryStats: Array<{ amount: number; percentage: number }>
): number {
  if (industryStats.length === 0) return 0;
  
  // Calculate Herfindahl-Hirschman Index (HHI)
  const hhi = industryStats.reduce((sum, stat) => {
    const marketShare = stat.percentage / 100;
    return sum + (marketShare * marketShare);
  }, 0);
  
  // Convert HHI to diversity score (inverse relationship)
  // HHI ranges from 0 (perfect competition) to 1 (monopoly)
  // Diversity score ranges from 0 to 100
  const diversityScore = Math.max(0, 100 - (hhi * 100));
  
  return Math.round(diversityScore);
}

/**
 * Calculate trend based on historical data
 */
function calculateTrend(industryData: unknown): 'up' | 'down' | 'stable' {
  // For now, implement a simple trend calculation
  // In production, this would analyze historical contribution data
  
  if (!industryData || !Array.isArray(industryData) || industryData.length === 0) {
    return 'stable';
  }
  
  // Simple trend calculation based on recent vs older contributions
  const recentContributions = industryData.slice(-Math.ceil(industryData.length / 3));
  const olderContributions = industryData.slice(0, Math.floor(industryData.length / 3));
  
  const recentTotal = recentContributions.reduce((sum: number, c: unknown) => sum + (c.amount || 0), 0);
  const olderTotal = olderContributions.reduce((sum: number, c: unknown) => sum + (c.amount || 0), 0);
  
  const recentAvg = recentTotal / Math.max(1, recentContributions.length);
  const olderAvg = olderTotal / Math.max(1, olderContributions.length);
  
  const changePercent = ((recentAvg - olderAvg) / Math.max(1, olderAvg)) * 100;
  
  if (changePercent > 10) return 'up';
  if (changePercent < -10) return 'down';
  return 'stable';
}

/**
 * Get industry color for visualization
 */
export function getIndustryColor(industryId: string): string {
  const industry = getIndustryById(industryId);
  return industry?.color || '#6b7280';
}

/**
 * Get industry icon for visualization
 */
export function getIndustryIcon(industryId: string): string {
  const industry = getIndustryById(industryId);
  return industry?.icon || '📊';
}

/**
 * Search industries by name or keyword
 */
export function searchIndustries(query: string): IndustryCategory[] {
  const lowerQuery = query.toLowerCase();
  
  return INDUSTRY_CATEGORIES.filter(industry => 
    industry.name.toLowerCase().includes(lowerQuery) ||
    industry.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}

export default {
  categorizeContributionByIndustry,
  categorizeContributionsByIndustry,
  calculateIndustryStats,
  calculateIndustryDiversityScore,
  getIndustryById,
  getAllIndustries,
  getIndustryColor,
  getIndustryIcon,
  searchIndustries
};