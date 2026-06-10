/**
 * Centralized chart colors using CIV.IQ brand palette
 * Ensures consistency across all data visualizations
 *
 * Brand colors from src/styles/aicher-system.css:
 * - --aicher-red: #e11d07 (Civiq Red)
 * - --aicher-green: #0a9338 (Civiq Green)
 * - --aicher-blue: #3ea2d4 (Civiq Blue)
 */

export const BRAND_COLORS = {
  red: '#e11d07',
  green: '#0a9338',
  blue: '#3ea2d4',
  // Democrat blue — darker than interactive blue so party identity never
  // reads as UI chrome. Keep in sync with --party-democrat / party-dem.
  democrat: '#2563eb',
} as const;

/**
 * Primary chart color palette for data visualizations
 * Use these colors in Recharts, D3, and other visualization libraries
 */
export const CHART_COLORS = [
  BRAND_COLORS.blue, // Primary
  BRAND_COLORS.green, // Secondary
  BRAND_COLORS.red, // Tertiary
  '#64748b', // Neutral gray
  '#94a3b8', // Light gray
  '#475569', // Dark gray
] as const;

/**
 * Semantic colors for specific data types
 */
export const SEMANTIC_COLORS = {
  // Political party colors (design system: blue #2563eb=Democrat, red=Republican)
  democrat: BRAND_COLORS.democrat,
  republican: BRAND_COLORS.red,
  independent: '#64748b',

  // Status colors
  success: BRAND_COLORS.green,
  warning: '#f59e0b',
  error: BRAND_COLORS.red,
  info: BRAND_COLORS.blue,

  // Vote colors
  yea: BRAND_COLORS.green,
  nay: BRAND_COLORS.red,
  abstain: '#64748b',

  // Financial colors
  income: BRAND_COLORS.green,
  expenditure: BRAND_COLORS.red,
  balance: BRAND_COLORS.blue,
} as const;

/**
 * Chart color utilities
 */
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length]!;
};

export const getPartyColor = (party: string): string => {
  const normalized = party.toLowerCase();
  if (normalized.includes('democrat') || normalized === 'd') {
    return SEMANTIC_COLORS.democrat;
  }
  if (normalized.includes('republican') || normalized === 'r') {
    return SEMANTIC_COLORS.republican;
  }
  return SEMANTIC_COLORS.independent;
};
