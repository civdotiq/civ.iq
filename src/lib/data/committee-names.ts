/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee name mappings for common House and Senate committees
 * Based on Thomas Committee IDs used by congress-legislators
 */

/**
 * Committee information including name, description, and jurisdiction
 */
export interface CommitteeInfo {
  name: string;
  description: string;
  jurisdiction: string[];
  chamber: 'house' | 'senate' | 'joint';
}

/**
 * Comprehensive committee information with jurisdictions and descriptions
 */
export const COMMITTEE_INFO: Record<string, CommitteeInfo> = {
  // House Committees
  HSAG: {
    name: 'House Committee on Agriculture',
    description:
      "Oversees the nation's agricultural policies, food security, and rural development programs.",
    jurisdiction: [
      'Agriculture and agricultural commodities',
      'Food and nutrition programs',
      'Rural development',
      'Forestry and forest reserves',
      'Crop insurance and disaster assistance',
    ],
    chamber: 'house',
  },
  HSAP: {
    name: 'House Committee on Appropriations',
    description:
      'Controls federal government spending and appropriations for all government agencies and programs.',
    jurisdiction: [
      'Federal budget appropriations',
      'Government spending oversight',
      'Discretionary spending programs',
      'Emergency funding',
      'Federal agency funding',
    ],
    chamber: 'house',
  },
  HSAS: {
    name: 'House Committee on Armed Services',
    description:
      'Oversees the Department of Defense, military operations, and national security policy.',
    jurisdiction: [
      'Defense Department policy',
      'Military personnel and benefits',
      'Defense procurement',
      'Military installations',
      'National security strategy',
    ],
    chamber: 'house',
  },
  HSBA: {
    name: 'House Committee on Small Business',
    description: 'Promotes and protects the interests of small business owners and entrepreneurs.',
    jurisdiction: [
      'Small business programs',
      'SBA oversight',
      'Small business lending',
      'Entrepreneurship support',
      'Small business regulatory issues',
    ],
    chamber: 'house',
  },
  HSBU: {
    name: 'House Committee on Budget',
    description: 'Responsible for the federal budget process and fiscal policy oversight.',
    jurisdiction: [
      'Federal budget resolution',
      'Budget process oversight',
      'Fiscal policy',
      'Deficit and debt issues',
      'Budget enforcement',
    ],
    chamber: 'house',
  },
  HSED: {
    name: 'House Committee on Education and Labor',
    description: 'Oversees education policy, workforce development, and labor relations.',
    jurisdiction: [
      'Education policy',
      'Higher education',
      'Workforce development',
      'Labor relations',
      'Employment standards',
    ],
    chamber: 'house',
  },
  HSFA: {
    name: 'House Committee on Foreign Affairs',
    description: 'Handles U.S. foreign policy, international relations, and diplomatic matters.',
    jurisdiction: [
      'Foreign policy',
      'International relations',
      'Diplomatic affairs',
      'Foreign aid',
      'International trade policy',
    ],
    chamber: 'house',
  },
  HSGO: {
    name: 'House Committee on Oversight and Reform',
    description:
      'Investigates government operations and ensures accountability across federal agencies.',
    jurisdiction: [
      'Government operations oversight',
      'Federal agency accountability',
      'Government waste and fraud',
      'Civil service',
      'Government efficiency',
    ],
    chamber: 'house',
  },
  HSHA: {
    name: 'House Committee on House Administration',
    description: 'Manages House operations, elections, and internal administrative matters.',
    jurisdiction: [
      'House administration',
      'Federal election oversight',
      'Campaign finance',
      'House operations',
      'Election security',
    ],
    chamber: 'house',
  },
  HSIF: {
    name: 'House Committee on Energy and Commerce',
    description: 'Regulates interstate commerce, energy policy, and telecommunications.',
    jurisdiction: [
      'Energy policy',
      'Interstate commerce',
      'Telecommunications',
      'Health care',
      'Consumer protection',
    ],
    chamber: 'house',
  },
  HSIG: {
    name: 'House Committee on Intelligence',
    description:
      'Oversees the intelligence community and national security intelligence activities.',
    jurisdiction: [
      'Intelligence community oversight',
      'National security intelligence',
      'Intelligence budget',
      'Counterintelligence',
      'Intelligence operations',
    ],
    chamber: 'house',
  },
  HSII: {
    name: 'House Committee on Natural Resources',
    description: 'Manages public lands, natural resources, and environmental policies.',
    jurisdiction: [
      'Public lands',
      'Natural resources',
      'Environmental policy',
      'National parks',
      'Water resources',
    ],
    chamber: 'house',
  },
  HSJU: {
    name: 'House Committee on Judiciary',
    description: 'Oversees the federal judiciary, constitutional law, and civil rights.',
    jurisdiction: [
      'Federal judiciary',
      'Constitutional law',
      'Civil rights',
      'Immigration',
      'Antitrust law',
    ],
    chamber: 'house',
  },
  HSPO: {
    name: 'House Committee on Ethics',
    description:
      'Investigates ethical violations and maintains standards of conduct for House members.',
    jurisdiction: [
      'Ethics investigations',
      'Standards of conduct',
      'Financial disclosure',
      'Conflicts of interest',
      'Ethics training',
    ],
    chamber: 'house',
  },
  HSPW: {
    name: 'House Committee on Transportation and Infrastructure',
    description: 'Oversees transportation systems, infrastructure development, and public works.',
    jurisdiction: [
      'Transportation policy',
      'Infrastructure development',
      'Highway and transit systems',
      'Aviation',
      'Water infrastructure',
    ],
    chamber: 'house',
  },
  HSRU: {
    name: 'House Committee on Rules',
    description:
      'Determines the rules and procedures for House floor consideration of legislation.',
    jurisdiction: [
      'House rules and procedures',
      'Floor consideration',
      'Legislative process',
      'Debate rules',
      'Amendment procedures',
    ],
    chamber: 'house',
  },
  HSSO: {
    name: 'House Committee on Science, Space, and Technology',
    description: 'Oversees scientific research, space exploration, and technology development.',
    jurisdiction: [
      'Scientific research',
      'Space exploration',
      'Technology development',
      'NSF oversight',
      'NASA policy',
    ],
    chamber: 'house',
  },
  HSWM: {
    name: 'House Committee on Ways and Means',
    description: 'Handles tax policy, trade, and Social Security legislation.',
    jurisdiction: [
      'Tax policy',
      'International trade',
      'Social Security',
      'Medicare',
      'Customs and tariffs',
    ],
    chamber: 'house',
  },
  HSVY: {
    name: "House Committee on Veterans' Affairs",
    description: "Oversees veterans' benefits, healthcare, and services.",
    jurisdiction: [
      'Veterans benefits',
      'VA healthcare',
      'Veterans services',
      'Military pensions',
      'Veterans education',
    ],
    chamber: 'house',
  },
  HSFS: {
    name: 'House Committee on Financial Services',
    description: 'Regulates financial institutions, housing policy, and insurance.',
    jurisdiction: [
      'Financial institutions',
      'Housing policy',
      'Insurance regulation',
      'Securities markets',
      'Consumer financial protection',
    ],
    chamber: 'house',
  },
  HSHL: {
    name: 'House Committee on Homeland Security',
    description: 'Oversees domestic security, border protection, and emergency preparedness.',
    jurisdiction: [
      'Homeland security',
      'Border protection',
      'Emergency preparedness',
      'Cybersecurity',
      'Immigration enforcement',
    ],
    chamber: 'house',
  },

  // Senate Committees
  SSAG: {
    name: 'Senate Committee on Agriculture, Nutrition, and Forestry',
    description: 'Oversees agriculture, nutrition programs, and forestry policies.',
    jurisdiction: [
      'Agriculture policy',
      'Nutrition programs',
      'Forestry',
      'Rural development',
      'Food safety',
    ],
    chamber: 'senate',
  },
  SSAP: {
    name: 'Senate Committee on Appropriations',
    description: 'Controls federal government spending and budget appropriations.',
    jurisdiction: [
      'Federal appropriations',
      'Budget oversight',
      'Government spending',
      'Agency funding',
      'Emergency appropriations',
    ],
    chamber: 'senate',
  },
  SSAS: {
    name: 'Senate Committee on Armed Services',
    description: 'Oversees military affairs, defense policy, and national security.',
    jurisdiction: [
      'Defense policy',
      'Military affairs',
      'National security',
      'Defense procurement',
      'Military personnel',
    ],
    chamber: 'senate',
  },
  SSBA: {
    name: 'Senate Committee on Banking, Housing, and Urban Affairs',
    description: 'Regulates banking, housing policy, and urban development.',
    jurisdiction: [
      'Banking regulation',
      'Housing policy',
      'Urban development',
      'Financial institutions',
      'Securities regulation',
    ],
    chamber: 'senate',
  },
  SSBU: {
    name: 'Senate Committee on Budget',
    description: 'Oversees federal budget process and fiscal policy.',
    jurisdiction: [
      'Federal budget',
      'Fiscal policy',
      'Budget process',
      'Deficit reduction',
      'Budget enforcement',
    ],
    chamber: 'senate',
  },
  SSCM: {
    name: 'Senate Committee on Commerce, Science, and Transportation',
    description: 'Regulates commerce, science policy, and transportation systems.',
    jurisdiction: [
      'Interstate commerce',
      'Science policy',
      'Transportation',
      'Telecommunications',
      'Consumer protection',
    ],
    chamber: 'senate',
  },
  SSEG: {
    name: 'Senate Committee on Energy and Natural Resources',
    description: 'Oversees energy policy, natural resources, and public lands.',
    jurisdiction: [
      'Energy policy',
      'Natural resources',
      'Public lands',
      'Mineral resources',
      'Energy development',
    ],
    chamber: 'senate',
  },
  SSEV: {
    name: 'Senate Committee on Environment and Public Works',
    description: 'Handles environmental protection and public works projects.',
    jurisdiction: [
      'Environmental protection',
      'Public works',
      'Water resources',
      'Transportation infrastructure',
      'Clean air and water',
    ],
    chamber: 'senate',
  },
  SSFI: {
    name: 'Senate Committee on Finance',
    description: 'Oversees tax policy, trade, and social programs.',
    jurisdiction: [
      'Tax policy',
      'International trade',
      'Social Security',
      'Medicare',
      'Healthcare financing',
    ],
    chamber: 'senate',
  },
  SSFO: {
    name: 'Senate Committee on Foreign Relations',
    description: 'Handles foreign policy, international relations, and treaties.',
    jurisdiction: [
      'Foreign policy',
      'International relations',
      'Treaties',
      'Foreign aid',
      'Diplomatic affairs',
    ],
    chamber: 'senate',
  },
  SSGA: {
    name: 'Senate Committee on Homeland Security and Governmental Affairs',
    description: 'Oversees homeland security and government operations.',
    jurisdiction: [
      'Homeland security',
      'Government operations',
      'Federal workforce',
      'Government efficiency',
      'Emergency management',
    ],
    chamber: 'senate',
  },
  SSHR: {
    name: 'Senate Committee on Health, Education, Labor and Pensions',
    description: 'Oversees health policy, education, and labor issues.',
    jurisdiction: [
      'Health policy',
      'Education policy',
      'Labor relations',
      'Employment standards',
      'Public health',
    ],
    chamber: 'senate',
  },
  SSIG: {
    name: 'Senate Committee on Intelligence',
    description: 'Oversees intelligence community operations and national security intelligence.',
    jurisdiction: [
      'Intelligence oversight',
      'National security intelligence',
      'Intelligence budget',
      'Counterintelligence',
      'Intelligence operations',
    ],
    chamber: 'senate',
  },
  SSJU: {
    name: 'Senate Committee on Judiciary',
    description: 'Oversees federal judiciary, constitutional law, and civil rights.',
    jurisdiction: [
      'Federal judiciary',
      'Constitutional law',
      'Civil rights',
      'Immigration',
      'Criminal justice',
    ],
    chamber: 'senate',
  },
  SSRU: {
    name: 'Senate Committee on Rules and Administration',
    description: 'Manages Senate rules, procedures, and administration.',
    jurisdiction: [
      'Senate rules',
      'Senate procedures',
      'Federal elections',
      'Senate administration',
      'Campaign finance',
    ],
    chamber: 'senate',
  },
  SSSB: {
    name: 'Senate Committee on Small Business and Entrepreneurship',
    description: 'Promotes small business development and entrepreneurship.',
    jurisdiction: [
      'Small business policy',
      'Entrepreneurship',
      'SBA oversight',
      'Small business lending',
      'Business development',
    ],
    chamber: 'senate',
  },
  SSVA: {
    name: "Senate Committee on Veterans' Affairs",
    description: "Oversees veterans' benefits, healthcare, and services.",
    jurisdiction: [
      'Veterans benefits',
      'VA healthcare',
      'Veterans services',
      'Military pensions',
      'Veterans education',
    ],
    chamber: 'senate',
  },
  SSIN: {
    name: 'Senate Committee on Indian Affairs',
    description: 'Handles issues related to Native American tribes and indigenous peoples.',
    jurisdiction: [
      'Native American affairs',
      'Tribal sovereignty',
      'Indian lands',
      'Tribal economic development',
      'Indigenous rights',
    ],
    chamber: 'senate',
  },

  // Joint Committees
  JCEC: {
    name: 'Joint Economic Committee',
    description: 'Studies economic conditions and makes recommendations on economic policy.',
    jurisdiction: [
      'Economic policy',
      'Economic research',
      'Economic conditions',
      'Economic statistics',
      'Economic forecasting',
    ],
    chamber: 'joint',
  },
  JCLC: {
    name: 'Joint Committee on the Library',
    description: 'Oversees the Library of Congress and its operations.',
    jurisdiction: [
      'Library of Congress',
      'Congressional research',
      'Library services',
      'Information management',
      'Congressional records',
    ],
    chamber: 'joint',
  },
  JCPR: {
    name: 'Joint Committee on Printing',
    description: 'Oversees government printing and document distribution.',
    jurisdiction: [
      'Government printing',
      'Document distribution',
      'Government publications',
      'Printing standards',
      'Publication oversight',
    ],
    chamber: 'joint',
  },
  JCTX: {
    name: 'Joint Committee on Taxation',
    description: 'Provides nonpartisan analysis of tax legislation and policy.',
    jurisdiction: [
      'Tax analysis',
      'Tax policy',
      'Revenue estimates',
      'Tax legislation',
      'Tax administration',
    ],
    chamber: 'joint',
  },

  // Select Committees
  SCAG: {
    name: 'House Select Committee on the Climate Crisis',
    description: 'Investigates climate change impacts and develops policy recommendations.',
    jurisdiction: [
      'Climate change',
      'Environmental policy',
      'Clean energy',
      'Climate science',
      'Climate adaptation',
    ],
    chamber: 'house',
  },
  SCCH: {
    name: 'House Select Committee on the Chinese Communist Party',
    description: "Investigates the Chinese Communist Party's impact on U.S. national security.",
    jurisdiction: [
      'China policy',
      'National security',
      'Economic competition',
      'Technology transfer',
      'Human rights',
    ],
    chamber: 'house',
  },
  SCWG: {
    name: 'House Select Committee on the Weaponization of the Federal Government',
    description: 'Investigates the weaponization of federal agencies against citizens.',
    jurisdiction: [
      'Government accountability',
      'Federal agency oversight',
      'Civil liberties',
      'Government abuse',
      'Constitutional rights',
    ],
    chamber: 'house',
  },

  // Special Committees
  SPAG: {
    name: 'Senate Special Committee on Aging',
    description: 'Studies issues affecting older Americans and aging policy.',
    jurisdiction: [
      'Aging policy',
      'Senior citizens',
      'Medicare',
      'Social Security',
      'Long-term care',
    ],
    chamber: 'senate',
  },
};

export const COMMITTEE_NAMES: Record<string, string> = {
  // House Committees
  HSAG: 'House Committee on Agriculture',
  HSAP: 'House Committee on Appropriations',
  HSAS: 'House Committee on Armed Services',
  HSBA: 'House Committee on Small Business',
  HSBU: 'House Committee on Budget',
  HSED: 'House Committee on Education and Labor',
  HSFA: 'House Committee on Foreign Affairs',
  HSGO: 'House Committee on Oversight and Reform',
  HSHA: 'House Committee on House Administration',
  HSIF: 'House Committee on Energy and Commerce',
  HSIG: 'House Committee on Intelligence',
  HSII: 'House Committee on Natural Resources',
  HSJU: 'House Committee on Judiciary',
  HSPO: 'House Committee on Ethics',
  HSPW: 'House Committee on Transportation and Infrastructure',
  HSRU: 'House Committee on Rules',
  HSSO: 'House Committee on Science, Space, and Technology',
  HSSY: 'House Committee on Science, Space, and Technology',
  HSSM: 'House Committee on Small Business',
  HSWM: 'House Committee on Ways and Means',
  HSVY: "House Committee on Veterans' Affairs",
  HSFS: 'House Committee on Financial Services',
  HSHL: 'House Committee on Homeland Security',
  HSHM: 'House Committee on Homeland Security',

  // Senate Committees
  SSAG: 'Senate Committee on Agriculture, Nutrition, and Forestry',
  SSAP: 'Senate Committee on Appropriations',
  SSAS: 'Senate Committee on Armed Services',
  SSBA: 'Senate Committee on Banking, Housing, and Urban Affairs',
  SSBU: 'Senate Committee on Budget',
  SSCM: 'Senate Committee on Commerce, Science, and Transportation',
  SSEG: 'Senate Committee on Energy and Natural Resources',
  SSEV: 'Senate Committee on Environment and Public Works',
  SSFI: 'Senate Committee on Finance',
  SSFO: 'Senate Committee on Foreign Relations',
  SSGA: 'Senate Committee on Homeland Security and Governmental Affairs',
  SSHR: 'Senate Committee on Health, Education, Labor and Pensions',
  SSIG: 'Senate Committee on Intelligence',
  SSJU: 'Senate Committee on Judiciary',
  SSRU: 'Senate Committee on Rules and Administration',
  SSSB: 'Senate Committee on Small Business and Entrepreneurship',
  SSVA: "Senate Committee on Veterans' Affairs",
  SSIN: 'Senate Committee on Indian Affairs',
  SSAF: 'Senate Committee on Agriculture, Nutrition, and Forestry',

  // Joint Committees
  JCEC: 'Joint Economic Committee',
  JCLC: 'Joint Committee on the Library',
  JCPR: 'Joint Committee on Printing',
  JCTX: 'Joint Committee on Taxation',
  JCSE: 'Joint Committee on Security and Cooperation in Europe',

  // Select Committees
  SCAG: 'House Select Committee on the Climate Crisis',
  SCCC: 'House Select Committee on the Coronavirus Crisis',
  SCMO: 'House Select Committee on the Modernization of Congress',
  SCCH: 'House Select Committee on the Chinese Communist Party',
  SCWG: 'House Select Committee on the Weaponization of the Federal Government',

  // Special Committees
  SPAG: 'Senate Special Committee on Aging',
  SPET: 'Senate Special Committee on Ethics',
  SPIN: 'Senate Special Committee on Intelligence',

  // Common abbreviations that might appear
  HELP: 'Senate Committee on Health, Education, Labor and Pensions',
  HSGAC: 'Senate Committee on Homeland Security and Governmental Affairs',
  SFRC: 'Senate Committee on Foreign Relations',
  SASC: 'Senate Committee on Armed Services',
  HASC: 'House Committee on Armed Services',
  HFAC: 'House Committee on Foreign Affairs',
  HVAC: "House Committee on Veterans' Affairs",
  SVAC: "Senate Committee on Veterans' Affairs",
  'T&I': 'House Committee on Transportation and Infrastructure',
  EPW: 'Senate Committee on Environment and Public Works',
  ENR: 'Senate Committee on Energy and Natural Resources',
  SBC: 'Senate Committee on Small Business and Entrepreneurship',
  HSC: 'House Committee on Homeland Security',
  SJC: 'Senate Committee on Judiciary',
  HJC: 'House Committee on Judiciary',
  HEEC: 'House Committee on Energy and Commerce',
  SAPC: 'Senate Committee on Appropriations',
  HAPC: 'House Committee on Appropriations',
  SBUD: 'Senate Committee on Budget',
  HBUD: 'House Committee on Budget',
  SRUL: 'Senate Committee on Rules and Administration',
  HRUL: 'House Committee on Rules',
  SETH: 'Senate Committee on Ethics',
  HEOC: 'House Committee on Ethics',
  HADM: 'House Committee on House Administration',
  SAGO: 'Senate Committee on Agriculture, Nutrition, and Forestry',
  HAGR: 'House Committee on Agriculture',
  SFIN: 'Senate Committee on Finance',
  HWAM: 'House Committee on Ways and Means',
  SBANK: 'Senate Committee on Banking, Housing, and Urban Affairs',
  HFIN: 'House Committee on Financial Services',
  SCOM: 'Senate Committee on Commerce, Science, and Transportation',
  HENR: 'House Committee on Energy and Commerce',
  SENR: 'Senate Committee on Energy and Natural Resources',
  HNAT: 'House Committee on Natural Resources',
  SEPW: 'Senate Committee on Environment and Public Works',
  HPUB: 'House Committee on Transportation and Infrastructure',
  SHELP: 'Senate Committee on Health, Education, Labor and Pensions',
  HEDU: 'House Committee on Education and Labor',
  SFOR: 'Senate Committee on Foreign Relations',
  HFOR: 'House Committee on Foreign Affairs',
  HOVE: 'House Committee on Oversight and Reform',
  SGOV: 'Senate Committee on Homeland Security and Governmental Affairs',
  HSCI: 'House Committee on Science, Space, and Technology',
  HSMA: 'House Committee on Small Business',
  SSBE: 'Senate Committee on Small Business and Entrepreneurship',
  SIND: 'Senate Committee on Indian Affairs',
  JWTO: 'Joint Committee on Taxation',
  JECON: 'Joint Economic Committee',
  JLIB: 'Joint Committee on the Library',
  JPRINT: 'Joint Committee on Printing',

  // Senate Environment and Public Works Subcommittees
  SSEV09: 'Subcommittee on Clean Air, Climate, and Nuclear Safety',
  SSEV10: 'Subcommittee on Transportation and Infrastructure',
  SSEV15: 'Subcommittee on Superfund, Waste Management, and Regulatory Oversight',

  // Senate Finance Subcommittees
  SSFI02: 'Subcommittee on Health Care',
  SSFI10: 'Subcommittee on International Trade, Customs, and Global Competitiveness',
  SSFI11: 'Subcommittee on Social Security, Pensions, and Family Policy',

  // Senate HELP Subcommittees
  SSHR09: 'Subcommittee on Primary Health and Retirement Security',
  SSHR11: 'Subcommittee on Employment and Workplace Safety',
  SSHR12: 'Subcommittee on Children and Families',

  // Senate Agriculture Subcommittees
  SSAF13: 'Subcommittee on Rural Development and Energy',
  SSAF14: 'Subcommittee on Livestock, Dairy, Poultry, Local Food Systems, and Food Safety',
  SSAF15: 'Subcommittee on Food and Nutrition, Specialty Crops, Organics, and Research',
  SSAF16: 'Subcommittee on Conservation, Climate, Forestry, and Natural Resources',
  SSAF17: 'Subcommittee on Commodities, Risk Management, and Trade',

  // Senate Commerce, Science, and Transportation Subcommittees
  SSCM34: 'Subcommittee on Aviation Safety, Operations, and Innovation',
  SSCM35: 'Subcommittee on Communications, Media, and Broadband',
  SSCM36: 'Subcommittee on Consumer Protection, Product Safety, and Data Security',
  SSCM37: 'Subcommittee on Space, Science, and Competitiveness',
  SSCM38: 'Subcommittee on Surface Transportation, Maritime, Freight, and Ports',
  SSCM39: 'Subcommittee on Tourism, Trade, and Export Promotion',

  // Senate Armed Services Subcommittees (119th Congress)
  SSAS14: 'Subcommittee on Cybersecurity',
  SSAS20: 'Subcommittee on Seapower',
  SSAS21: 'Subcommittee on Strategic Forces',

  // Senate Homeland Security and Governmental Affairs Subcommittees
  SSGA20: 'Subcommittee on Investigations',
  SSGA22: 'Subcommittee on Governmental Operations and Border Management',

  // Senate Judiciary Subcommittees (additional)
  SSJU01: 'Subcommittee on the Constitution',
  SSJU04: 'Subcommittee on Competition Policy, Antitrust, and Consumer Rights',
  SSJU22: 'Subcommittee on Federal Courts, Oversight, Agency Action, and Federal Rights',
  SSJU28: 'Subcommittee on Immigration, Citizenship, and Border Safety',
};

/**
 * Get the full committee name from the Thomas ID
 */
export function getCommitteeName(thomasId: string): string {
  // First try direct lookup
  if (COMMITTEE_NAMES[thomasId]) {
    return COMMITTEE_NAMES[thomasId];
  }

  // If it's a subcommittee (has numbers), try the parent committee
  if (thomasId.match(/^[A-Z]{4,}\d+$/)) {
    const parentId = thomasId.replace(/\d+$/, '');
    if (COMMITTEE_NAMES[parentId]) {
      return COMMITTEE_NAMES[parentId];
    }
  }

  // If no mapping found, return the original ID
  return thomasId;
}

/**
 * Get comprehensive committee information
 */
export function getCommitteeInfo(thomasId: string): CommitteeInfo | null {
  return COMMITTEE_INFO[thomasId] || null;
}

/**
 * Get the chamber from the Thomas ID
 */
export function getCommitteeChamber(thomasId: string): 'house' | 'senate' | 'joint' {
  if (thomasId.startsWith('H')) return 'house';
  if (thomasId.startsWith('S')) return 'senate';
  if (thomasId.startsWith('J')) return 'joint';
  return 'house'; // default fallback
}

/**
 * Check if a committee is a select or special committee
 */
export function isSelectCommittee(thomasId: string): boolean {
  return thomasId.startsWith('SC') || thomasId.startsWith('SP');
}

/**
 * Subcommittee mappings - maps parent committee to subcommittees
 */
export const SUBCOMMITTEE_MAPPINGS: Record<string, Array<{ id: string; name: string }>> = {
  // House Judiciary Committee Subcommittees
  HSJU: [
    { id: 'HSJU01', name: 'Subcommittee on the Constitution and Civil Justice' },
    { id: 'HSJU02', name: 'Subcommittee on Courts, Intellectual Property, and the Internet' },
    { id: 'HSJU03', name: 'Subcommittee on Crime, Terrorism, and National Security' },
    { id: 'HSJU04', name: 'Subcommittee on Antitrust, Commercial and Administrative Law' },
    { id: 'HSJU05', name: 'Subcommittee on Immigration and Citizenship' },
  ],

  // House Armed Services Committee Subcommittees
  HSAS: [
    { id: 'HSAS01', name: 'Subcommittee on Tactical Air and Land Forces' },
    { id: 'HSAS02', name: 'Subcommittee on Seapower and Projection Forces' },
    { id: 'HSAS03', name: 'Subcommittee on Strategic Forces' },
    { id: 'HSAS04', name: 'Subcommittee on Military Personnel' },
    { id: 'HSAS05', name: 'Subcommittee on Readiness' },
    {
      id: 'HSAS06',
      name: 'Subcommittee on Cyber, Innovative Technologies, and Information Systems',
    },
  ],

  // House Energy and Commerce Committee Subcommittees
  HSIF: [
    { id: 'HSIF01', name: 'Subcommittee on Energy' },
    { id: 'HSIF02', name: 'Subcommittee on Environment and Climate Change' },
    { id: 'HSIF03', name: 'Subcommittee on Health' },
    { id: 'HSIF04', name: 'Subcommittee on Consumer Protection and Commerce' },
    { id: 'HSIF05', name: 'Subcommittee on Communications and Technology' },
    { id: 'HSIF06', name: 'Subcommittee on Oversight and Investigations' },
  ],

  // House Appropriations Committee Subcommittees
  HSAP: [
    { id: 'HSAP01', name: 'Subcommittee on Defense' },
    { id: 'HSAP02', name: 'Subcommittee on Labor, Health and Human Services, Education' },
    { id: 'HSAP03', name: 'Subcommittee on Homeland Security' },
    { id: 'HSAP04', name: 'Subcommittee on Transportation, Housing and Urban Development' },
    { id: 'HSAP05', name: 'Subcommittee on Interior, Environment, and Related Agencies' },
    { id: 'HSAP06', name: 'Subcommittee on Commerce, Justice, Science, and Related Agencies' },
    {
      id: 'HSAP07',
      name: 'Subcommittee on Agriculture, Rural Development, Food and Drug Administration',
    },
    { id: 'HSAP08', name: 'Subcommittee on Energy and Water Development' },
    { id: 'HSAP09', name: 'Subcommittee on Financial Services and General Government' },
    { id: 'HSAP10', name: 'Subcommittee on State, Foreign Operations, and Related Programs' },
    { id: 'HSAP11', name: 'Subcommittee on Legislative Branch' },
    {
      id: 'HSAP12',
      name: 'Subcommittee on Military Construction, Veterans Affairs, and Related Agencies',
    },
  ],

  // House Ways and Means Committee Subcommittees
  HSWM: [
    { id: 'HSWM01', name: 'Subcommittee on Trade' },
    { id: 'HSWM02', name: 'Subcommittee on Health' },
    { id: 'HSWM03', name: 'Subcommittee on Social Security' },
    { id: 'HSWM04', name: 'Subcommittee on Worker and Family Support' },
    { id: 'HSWM05', name: 'Subcommittee on Tax Policy' },
    { id: 'HSWM06', name: 'Subcommittee on Oversight' },
  ],

  // House Financial Services Committee Subcommittees
  HSFS: [
    { id: 'HSFS01', name: 'Subcommittee on Capital Markets' },
    { id: 'HSFS02', name: 'Subcommittee on Consumer Protection and Financial Institutions' },
    { id: 'HSFS03', name: 'Subcommittee on Housing and Insurance' },
    {
      id: 'HSFS04',
      name: 'Subcommittee on National Security, International Development and Monetary Policy',
    },
    { id: 'HSFS05', name: 'Subcommittee on Oversight and Investigations' },
    { id: 'HSFS06', name: 'Subcommittee on Digital Assets, Financial Technology and Inclusion' },
  ],

  // Senate Judiciary Committee Subcommittees
  SSJU: [
    { id: 'SSJU01', name: 'Subcommittee on the Constitution' },
    {
      id: 'SSJU02',
      name: 'Subcommittee on Federal Courts, Oversight, Agency Action, and Federal Rights',
    },
    { id: 'SSJU03', name: 'Subcommittee on Criminal Justice and Counterterrorism' },
    { id: 'SSJU04', name: 'Subcommittee on Competition Policy, Antitrust, and Consumer Rights' },
    { id: 'SSJU05', name: 'Subcommittee on Immigration, Citizenship, and Border Safety' },
    { id: 'SSJU06', name: 'Subcommittee on Intellectual Property' },
  ],

  // Senate Armed Services Committee Subcommittees
  SSAS: [
    { id: 'SSAS01', name: 'Subcommittee on Airland' },
    { id: 'SSAS02', name: 'Subcommittee on Seapower' },
    { id: 'SSAS03', name: 'Subcommittee on Strategic Forces' },
    { id: 'SSAS04', name: 'Subcommittee on Personnel' },
    { id: 'SSAS05', name: 'Subcommittee on Readiness and Management Support' },
    { id: 'SSAS06', name: 'Subcommittee on Cybersecurity' },
  ],

  // Senate Appropriations Committee Subcommittees
  SSAP: [
    { id: 'SSAP01', name: 'Subcommittee on Defense' },
    { id: 'SSAP02', name: 'Subcommittee on Labor, Health and Human Services, Education' },
    { id: 'SSAP03', name: 'Subcommittee on Homeland Security' },
    { id: 'SSAP04', name: 'Subcommittee on Transportation, Housing and Urban Development' },
    { id: 'SSAP05', name: 'Subcommittee on Interior, Environment, and Related Agencies' },
    { id: 'SSAP06', name: 'Subcommittee on Commerce, Justice, Science, and Related Agencies' },
    {
      id: 'SSAP07',
      name: 'Subcommittee on Agriculture, Rural Development, Food and Drug Administration',
    },
    { id: 'SSAP08', name: 'Subcommittee on Energy and Water Development' },
    { id: 'SSAP09', name: 'Subcommittee on Financial Services and General Government' },
    { id: 'SSAP10', name: 'Subcommittee on State, Foreign Operations, and Related Programs' },
    { id: 'SSAP11', name: 'Subcommittee on Legislative Branch' },
    {
      id: 'SSAP12',
      name: 'Subcommittee on Military Construction, Veterans Affairs, and Related Agencies',
    },
  ],

  // Senate Finance Committee Subcommittees
  SSFI: [
    {
      id: 'SSFI01',
      name: 'Subcommittee on International Trade, Customs, and Global Competitiveness',
    },
    { id: 'SSFI02', name: 'Subcommittee on Health Care' },
    { id: 'SSFI03', name: 'Subcommittee on Social Security, Pensions, and Family Policy' },
    { id: 'SSFI04', name: 'Subcommittee on Taxation and IRS Oversight' },
    { id: 'SSFI05', name: 'Subcommittee on Energy, Natural Resources, and Infrastructure' },
  ],

  // Senate HELP Committee Subcommittees
  SSHR: [
    { id: 'SSHR01', name: 'Subcommittee on Primary Health and Retirement Security' },
    { id: 'SSHR02', name: 'Subcommittee on Employment and Workplace Safety' },
    { id: 'SSHR03', name: 'Subcommittee on Children and Families' },
  ],
};

/**
 * Get subcommittees for a committee
 */
export function getSubcommittees(thomasId: string): Array<{ id: string; name: string }> {
  return SUBCOMMITTEE_MAPPINGS[thomasId] || [];
}
