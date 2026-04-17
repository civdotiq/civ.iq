/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Company Alias Table
 *
 * Static mapping of top companies by lobbying spend with known name
 * variants across federal APIs: EPA, OSHA, CFPB, SEC, FEC, and LDA
 * (Senate Lobbying Disclosure Act filings).
 *
 * Each entry has a canonical name, known aliases, SIC codes, sector,
 * and SEC CIK where available. The alias lookup is case-insensitive
 * and strips corporate suffixes before matching.
 */

import { IndustrySector } from './industry-taxonomy.js';

export interface CompanyAlias {
  canonicalName: string;
  aliases: string[];
  sicCodes: string[];
  naicsCodes: string[];
  sector: IndustrySector | null;
  cik: string | null;
}

/**
 * Top companies by lobbying spend with cross-API name variants.
 * Ordered roughly by total lobbying expenditure (descending).
 */
export const COMPANY_ALIAS_TABLE: CompanyAlias[] = [
  // ── Pharmaceuticals & Health ────────────────────────────────────────
  {
    canonicalName: 'PFIZER',
    aliases: ['PFIZER INC', 'PFIZER INC.', 'PFIZER PHARMACEUTICALS', 'PFE'],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: '78003',
  },
  {
    canonicalName: 'JOHNSON AND JOHNSON',
    aliases: [
      'JOHNSON & JOHNSON',
      'J&J',
      'JNJ',
      'JOHNSON AND JOHNSON INC',
      'JOHNSON & JOHNSON INC.',
      'JANSSEN PHARMACEUTICALS',
      'JANSSEN BIOTECH',
    ],
    sicCodes: ['2834', '3841'],
    naicsCodes: ['325412', '339112'],
    sector: IndustrySector.HEALTH,
    cik: '200406',
  },
  {
    canonicalName: 'MERCK',
    aliases: [
      'MERCK & CO',
      'MERCK AND CO',
      'MERCK & CO INC',
      'MERCK & CO., INC.',
      'MERCK SHARP & DOHME',
      'MSD',
      'MRK',
    ],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: '310158',
  },
  {
    canonicalName: 'ABBVIE',
    aliases: ['ABBVIE INC', 'ABBVIE INC.', 'ABBV'],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: '1551152',
  },
  {
    canonicalName: 'ELI LILLY',
    aliases: ['ELI LILLY AND COMPANY', 'ELI LILLY & CO', 'LILLY', 'LLY', 'ELI LILLY AND CO'],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: '59478',
  },
  {
    canonicalName: 'AMGEN',
    aliases: ['AMGEN INC', 'AMGEN INC.', 'AMGN'],
    sicCodes: ['2836'],
    naicsCodes: ['325414'],
    sector: IndustrySector.HEALTH,
    cik: '318154',
  },
  {
    canonicalName: 'BRISTOL MYERS SQUIBB',
    aliases: [
      'BRISTOL-MYERS SQUIBB',
      'BRISTOL-MYERS SQUIBB CO',
      'BRISTOL MYERS SQUIBB CO',
      'BMS',
      'BMY',
    ],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: '14272',
  },
  {
    canonicalName: 'UNITEDHEALTH GROUP',
    aliases: [
      'UNITEDHEALTH GROUP INC',
      'UNITEDHEALTH GROUP INCORPORATED',
      'UNITED HEALTH GROUP',
      'UNH',
      'UNITEDHEALTHCARE',
    ],
    sicCodes: ['6324'],
    naicsCodes: ['524114'],
    sector: IndustrySector.HEALTH,
    cik: '731766',
  },
  {
    canonicalName: 'CVS HEALTH',
    aliases: ['CVS HEALTH CORP', 'CVS HEALTH CORPORATION', 'CVS CAREMARK', 'CVS PHARMACY', 'CVS'],
    sicCodes: ['5912'],
    naicsCodes: ['446110'],
    sector: IndustrySector.HEALTH,
    cik: '64803',
  },
  {
    canonicalName: 'CIGNA',
    aliases: ['CIGNA CORP', 'CIGNA CORPORATION', 'THE CIGNA GROUP', 'CI'],
    sicCodes: ['6321'],
    naicsCodes: ['524114'],
    sector: IndustrySector.HEALTH,
    cik: '1739940',
  },
  {
    canonicalName: 'ANTHEM',
    aliases: [
      'ANTHEM INC',
      'ELEVANCE HEALTH',
      'ELEVANCE HEALTH INC',
      'WELLPOINT',
      'WELLPOINT INC',
      'ELV',
    ],
    sicCodes: ['6324'],
    naicsCodes: ['524114'],
    sector: IndustrySector.HEALTH,
    cik: '1156039',
  },
  {
    canonicalName: 'HUMANA',
    aliases: ['HUMANA INC', 'HUMANA INC.', 'HUM'],
    sicCodes: ['6324'],
    naicsCodes: ['524114'],
    sector: IndustrySector.HEALTH,
    cik: '49071',
  },
  {
    canonicalName: 'MEDTRONIC',
    aliases: ['MEDTRONIC PLC', 'MEDTRONIC INC', 'MDT'],
    sicCodes: ['3841'],
    naicsCodes: ['339112'],
    sector: IndustrySector.HEALTH,
    cik: '1613103',
  },
  {
    canonicalName: 'ABBOTT LABORATORIES',
    aliases: ['ABBOTT LABS', 'ABBOTT', 'ABT'],
    sicCodes: ['3841'],
    naicsCodes: ['339112'],
    sector: IndustrySector.HEALTH,
    cik: '1800',
  },

  // ── Technology & Communications ─────────────────────────────────────
  {
    canonicalName: 'ALPHABET',
    aliases: ['ALPHABET INC', 'GOOGLE', 'GOOGLE INC', 'GOOGLE LLC', 'GOOG', 'GOOGL'],
    sicCodes: ['7372'],
    naicsCodes: ['519130'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1652044',
  },
  {
    canonicalName: 'META PLATFORMS',
    aliases: [
      'META PLATFORMS INC',
      'META',
      'FACEBOOK',
      'FACEBOOK INC',
      'FB',
      'META PLATFORMS INC.',
    ],
    sicCodes: ['7372'],
    naicsCodes: ['519130'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1326801',
  },
  {
    canonicalName: 'AMAZON',
    aliases: [
      'AMAZON.COM',
      'AMAZON.COM INC',
      'AMAZON COM INC',
      'AMAZON INC',
      'AMZN',
      'AMAZON WEB SERVICES',
      'AWS',
    ],
    sicCodes: ['5961'],
    naicsCodes: ['454110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1018724',
  },
  {
    canonicalName: 'APPLE',
    aliases: ['APPLE INC', 'APPLE INC.', 'AAPL', 'APPLE COMPUTER'],
    sicCodes: ['3571'],
    naicsCodes: ['334111'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '320193',
  },
  {
    canonicalName: 'MICROSOFT',
    aliases: ['MICROSOFT CORP', 'MICROSOFT CORPORATION', 'MSFT'],
    sicCodes: ['7372'],
    naicsCodes: ['511210'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '789019',
  },
  {
    canonicalName: 'AT AND T',
    aliases: [
      'AT&T',
      'AT&T INC',
      'AT&T INC.',
      'ATT',
      'AT AND T INC',
      'AMERICAN TELEPHONE AND TELEGRAPH',
      'SOUTHWESTERN BELL',
      'T',
    ],
    sicCodes: ['4813'],
    naicsCodes: ['517110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '732717',
  },
  {
    canonicalName: 'COMCAST',
    aliases: [
      'COMCAST CORP',
      'COMCAST CORPORATION',
      'COMCAST NBCUNIVERSAL',
      'NBCUNIVERSAL',
      'CMCSA',
    ],
    sicCodes: ['4841'],
    naicsCodes: ['517110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '902739',
  },
  {
    canonicalName: 'VERIZON',
    aliases: ['VERIZON COMMUNICATIONS', 'VERIZON COMMUNICATIONS INC', 'VZ', 'VERIZON WIRELESS'],
    sicCodes: ['4813'],
    naicsCodes: ['517110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '732712',
  },
  {
    canonicalName: 'INTEL',
    aliases: ['INTEL CORP', 'INTEL CORPORATION', 'INTC'],
    sicCodes: ['3674'],
    naicsCodes: ['334413'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '50863',
  },
  {
    canonicalName: 'QUALCOMM',
    aliases: ['QUALCOMM INC', 'QUALCOMM INCORPORATED', 'QCOM'],
    sicCodes: ['3674'],
    naicsCodes: ['334413'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '804328',
  },
  {
    canonicalName: 'ORACLE',
    aliases: ['ORACLE CORP', 'ORACLE CORPORATION', 'ORCL'],
    sicCodes: ['7372'],
    naicsCodes: ['511210'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1341439',
  },
  {
    canonicalName: 'IBM',
    aliases: [
      'INTERNATIONAL BUSINESS MACHINES',
      'INTERNATIONAL BUSINESS MACHINES CORP',
      'IBM CORP',
    ],
    sicCodes: ['7372'],
    naicsCodes: ['511210'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '51143',
  },
  {
    canonicalName: 'CISCO',
    aliases: ['CISCO SYSTEMS', 'CISCO SYSTEMS INC', 'CSCO'],
    sicCodes: ['3577'],
    naicsCodes: ['334290'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '858877',
  },
  {
    canonicalName: 'SALESFORCE',
    aliases: ['SALESFORCE INC', 'SALESFORCE.COM', 'CRM'],
    sicCodes: ['7372'],
    naicsCodes: ['511210'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1108524',
  },
  {
    canonicalName: 'NVIDIA',
    aliases: ['NVIDIA CORP', 'NVIDIA CORPORATION', 'NVDA'],
    sicCodes: ['3674'],
    naicsCodes: ['334413'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1045810',
  },
  {
    canonicalName: 'BROADCOM',
    aliases: ['BROADCOM INC', 'AVAGO TECHNOLOGIES', 'AVGO'],
    sicCodes: ['3674'],
    naicsCodes: ['334413'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1649338',
  },
  {
    canonicalName: 'T-MOBILE',
    aliases: ['T-MOBILE US', 'T-MOBILE US INC', 'TMUS', 'SPRINT', 'SPRINT CORP'],
    sicCodes: ['4812'],
    naicsCodes: ['517210'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1283699',
  },

  // ── Defense & Aerospace ─────────────────────────────────────────────
  {
    canonicalName: 'LOCKHEED MARTIN',
    aliases: ['LOCKHEED MARTIN CORP', 'LOCKHEED MARTIN CORPORATION', 'LOCKMART', 'LMT', 'LOCKHEED'],
    sicCodes: ['3761'],
    naicsCodes: ['336411'],
    sector: IndustrySector.DEFENSE,
    cik: '936468',
  },
  {
    canonicalName: 'RAYTHEON TECHNOLOGIES',
    aliases: [
      'RAYTHEON',
      'RTX',
      'RTX CORP',
      'RAYTHEON CO',
      'RAYTHEON COMPANY',
      'UNITED TECHNOLOGIES',
      'UNITED TECHNOLOGIES CORP',
    ],
    sicCodes: ['3724'],
    naicsCodes: ['336411'],
    sector: IndustrySector.DEFENSE,
    cik: '101829',
  },
  {
    canonicalName: 'BOEING',
    aliases: ['THE BOEING COMPANY', 'BOEING CO', 'BOEING COMPANY', 'BA'],
    sicCodes: ['3721'],
    naicsCodes: ['336411'],
    sector: IndustrySector.DEFENSE,
    cik: '12927',
  },
  {
    canonicalName: 'NORTHROP GRUMMAN',
    aliases: ['NORTHROP GRUMMAN CORP', 'NORTHROP GRUMMAN CORPORATION', 'NOC', 'NORTHRUP GRUMMAN'],
    sicCodes: ['3761'],
    naicsCodes: ['336411'],
    sector: IndustrySector.DEFENSE,
    cik: '1133421',
  },
  {
    canonicalName: 'GENERAL DYNAMICS',
    aliases: ['GENERAL DYNAMICS CORP', 'GENERAL DYNAMICS CORPORATION', 'GD'],
    sicCodes: ['3731'],
    naicsCodes: ['336611'],
    sector: IndustrySector.DEFENSE,
    cik: '40533',
  },
  {
    canonicalName: 'L3HARRIS TECHNOLOGIES',
    aliases: [
      'L3HARRIS',
      'L3 HARRIS',
      'L3 TECHNOLOGIES',
      'HARRIS CORP',
      'HARRIS CORPORATION',
      'LHX',
    ],
    sicCodes: ['3812'],
    naicsCodes: ['334511'],
    sector: IndustrySector.DEFENSE,
    cik: '202058',
  },
  {
    canonicalName: 'BAE SYSTEMS',
    aliases: ['BAE SYSTEMS INC', 'BAE SYSTEMS PLC', 'BAE'],
    sicCodes: ['3812'],
    naicsCodes: ['334511'],
    sector: IndustrySector.DEFENSE,
    cik: null,
  },
  {
    canonicalName: 'LEIDOS',
    aliases: ['LEIDOS HOLDINGS', 'LEIDOS INC', 'LDOS', 'SAIC'],
    sicCodes: ['7371'],
    naicsCodes: ['541512'],
    sector: IndustrySector.DEFENSE,
    cik: '1336920',
  },
  {
    canonicalName: 'HUNTINGTON INGALLS',
    aliases: ['HUNTINGTON INGALLS INDUSTRIES', 'HII', 'NEWPORT NEWS SHIPBUILDING'],
    sicCodes: ['3731'],
    naicsCodes: ['336611'],
    sector: IndustrySector.DEFENSE,
    cik: '1501585',
  },

  // ── Energy & Natural Resources ──────────────────────────────────────
  {
    canonicalName: 'EXXON MOBIL',
    aliases: [
      'EXXONMOBIL',
      'EXXON MOBIL CORP',
      'EXXON MOBIL CORPORATION',
      'XOM',
      'EXXON',
      'MOBIL',
      'EXXON CHEMICAL',
    ],
    sicCodes: ['2911'],
    naicsCodes: ['324110'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '34088',
  },
  {
    canonicalName: 'CHEVRON',
    aliases: ['CHEVRON CORP', 'CHEVRON CORPORATION', 'CVX', 'CHEVRON USA', 'CHEVRON TEXACO'],
    sicCodes: ['2911'],
    naicsCodes: ['324110'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '93410',
  },
  {
    canonicalName: 'CONOCOPHILLIPS',
    aliases: ['CONOCO PHILLIPS', 'CONOCOPHILLIPS CO', 'COP', 'CONOCO'],
    sicCodes: ['1311'],
    naicsCodes: ['211120'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '1163165',
  },
  {
    canonicalName: 'KOCH INDUSTRIES',
    aliases: [
      'KOCH INDUSTRIES INC',
      'KOCH',
      'KOCH COMPANIES',
      'GEORGIA-PACIFIC',
      'GEORGIA PACIFIC',
      'FLINT HILLS RESOURCES',
      'INVISTA',
    ],
    sicCodes: ['2911'],
    naicsCodes: ['324110'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: null,
  },
  {
    canonicalName: 'DUKE ENERGY',
    aliases: ['DUKE ENERGY CORP', 'DUKE ENERGY CORPORATION', 'DUK'],
    sicCodes: ['4911'],
    naicsCodes: ['221112'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '1326160',
  },
  {
    canonicalName: 'SOUTHERN COMPANY',
    aliases: ['THE SOUTHERN COMPANY', 'SOUTHERN CO', 'SO', 'GEORGIA POWER', 'ALABAMA POWER'],
    sicCodes: ['4911'],
    naicsCodes: ['221112'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '92122',
  },
  {
    canonicalName: 'NEXTERA ENERGY',
    aliases: [
      'NEXTERA ENERGY INC',
      'NEE',
      'FPL GROUP',
      'FLORIDA POWER AND LIGHT',
      'FLORIDA POWER & LIGHT',
    ],
    sicCodes: ['4911'],
    naicsCodes: ['221112'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '753308',
  },
  {
    canonicalName: 'DOMINION ENERGY',
    aliases: ['DOMINION ENERGY INC', 'DOMINION', 'D'],
    sicCodes: ['4911'],
    naicsCodes: ['221112'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '715957',
  },
  {
    canonicalName: 'PHILLIPS 66',
    aliases: ['PHILLIPS 66 CO', 'PSX'],
    sicCodes: ['2911'],
    naicsCodes: ['324110'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '1534701',
  },
  {
    canonicalName: 'VALERO ENERGY',
    aliases: ['VALERO ENERGY CORP', 'VALERO', 'VLO'],
    sicCodes: ['2911'],
    naicsCodes: ['324110'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '1035002',
  },
  {
    canonicalName: 'DEVON ENERGY',
    aliases: ['DEVON ENERGY CORP', 'DVN'],
    sicCodes: ['1311'],
    naicsCodes: ['211120'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '1090012',
  },
  {
    canonicalName: 'HALLIBURTON',
    aliases: ['HALLIBURTON CO', 'HALLIBURTON COMPANY', 'HAL'],
    sicCodes: ['1381'],
    naicsCodes: ['213111'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: '45012',
  },

  // ── Finance / Insurance / Real Estate ───────────────────────────────
  {
    canonicalName: 'JPMORGAN CHASE',
    aliases: [
      'JPMORGAN CHASE & CO',
      'JPMORGAN CHASE AND CO',
      'JP MORGAN CHASE',
      'JP MORGAN',
      'JPMORGAN',
      'JPM',
      'CHASE',
      'J.P. MORGAN',
    ],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '19617',
  },
  {
    canonicalName: 'BANK OF AMERICA',
    aliases: [
      'BANK OF AMERICA CORP',
      'BANK OF AMERICA CORPORATION',
      'BOFA',
      'BAC',
      'MERRILL LYNCH',
      'BANK OF AMERICA NA',
    ],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '70858',
  },
  {
    canonicalName: 'GOLDMAN SACHS',
    aliases: ['THE GOLDMAN SACHS GROUP', 'GOLDMAN SACHS GROUP', 'GOLDMAN SACHS & CO', 'GS'],
    sicCodes: ['6211'],
    naicsCodes: ['523110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '886982',
  },
  {
    canonicalName: 'CITIGROUP',
    aliases: ['CITIGROUP INC', 'CITIBANK', 'CITI', 'C', 'CITICORP'],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '831001',
  },
  {
    canonicalName: 'WELLS FARGO',
    aliases: ['WELLS FARGO & CO', 'WELLS FARGO AND COMPANY', 'WELLS FARGO BANK', 'WFC'],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '72971',
  },
  {
    canonicalName: 'MORGAN STANLEY',
    aliases: ['MORGAN STANLEY & CO', 'MS'],
    sicCodes: ['6211'],
    naicsCodes: ['523110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '895421',
  },
  {
    canonicalName: 'BLACKROCK',
    aliases: ['BLACKROCK INC', 'BLACKROCK FINANCIAL', 'BLK'],
    sicCodes: ['6282'],
    naicsCodes: ['523920'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '1364742',
  },
  {
    canonicalName: 'CHARLES SCHWAB',
    aliases: ['THE CHARLES SCHWAB CORPORATION', 'CHARLES SCHWAB CORP', 'SCHWAB', 'SCHW'],
    sicCodes: ['6211'],
    naicsCodes: ['523120'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '316709',
  },
  {
    canonicalName: 'AMERICAN EXPRESS',
    aliases: ['AMERICAN EXPRESS CO', 'AMEX', 'AXP'],
    sicCodes: ['6153'],
    naicsCodes: ['522210'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '4962',
  },
  {
    canonicalName: 'CAPITAL ONE',
    aliases: ['CAPITAL ONE FINANCIAL', 'CAPITAL ONE FINANCIAL CORP', 'COF'],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '927628',
  },
  {
    canonicalName: 'US BANCORP',
    aliases: ['U.S. BANCORP', 'US BANK', 'USB'],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '36104',
  },
  {
    canonicalName: 'PNC FINANCIAL',
    aliases: ['PNC FINANCIAL SERVICES', 'PNC FINANCIAL SERVICES GROUP', 'PNC BANK', 'PNC'],
    sicCodes: ['6020'],
    naicsCodes: ['522110'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '713676',
  },
  {
    canonicalName: 'BERKSHIRE HATHAWAY',
    aliases: ['BERKSHIRE HATHAWAY INC', 'BRK', 'BRKB'],
    sicCodes: ['6331'],
    naicsCodes: ['524126'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '1067983',
  },

  // ── Chemicals & Manufacturing ───────────────────────────────────────
  {
    canonicalName: 'DOW',
    aliases: [
      'DOW INC',
      'DOW INC.',
      'DOW CHEMICAL',
      'DOW CHEMICAL CO',
      'DOW CHEMICAL COMPANY',
      'THE DOW CHEMICAL COMPANY',
      'DOW CHEMICAL CO TEXAS OPERATIONS',
      'DOW CHEMICAL CO FREEPORT TX',
      'DOW CHEMICAL MIDLAND',
    ],
    sicCodes: ['2821'],
    naicsCodes: ['325211'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '1751788',
  },
  {
    canonicalName: 'DUPONT',
    aliases: [
      'DUPONT DE NEMOURS',
      'E I DU PONT DE NEMOURS',
      'EI DUPONT',
      'DD',
      'DUPONT INC',
      'CHEMOURS',
    ],
    sicCodes: ['2821'],
    naicsCodes: ['325211'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '1666700',
  },
  {
    canonicalName: '3M',
    aliases: ['3M COMPANY', '3M CO', 'MINNESOTA MINING AND MANUFACTURING', 'MMM'],
    sicCodes: ['3841'],
    naicsCodes: ['339999'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '66740',
  },
  {
    canonicalName: 'BASF',
    aliases: ['BASF CORP', 'BASF CORPORATION', 'BASF SE'],
    sicCodes: ['2810'],
    naicsCodes: ['325110'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: null,
  },
  {
    canonicalName: 'HONEYWELL',
    aliases: ['HONEYWELL INTERNATIONAL', 'HONEYWELL INTERNATIONAL INC', 'HON'],
    sicCodes: ['3728'],
    naicsCodes: ['334512'],
    sector: IndustrySector.DEFENSE,
    cik: '773840',
  },
  {
    canonicalName: 'CATERPILLAR',
    aliases: ['CATERPILLAR INC', 'CAT'],
    sicCodes: ['3531'],
    naicsCodes: ['333120'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '18230',
  },
  {
    canonicalName: 'GENERAL ELECTRIC',
    aliases: ['GENERAL ELECTRIC CO', 'GENERAL ELECTRIC COMPANY', 'GE', 'GE AEROSPACE'],
    sicCodes: ['3511'],
    naicsCodes: ['336412'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '40554',
  },
  {
    canonicalName: 'PROCTER AND GAMBLE',
    aliases: [
      'PROCTER & GAMBLE',
      'PROCTER & GAMBLE CO',
      'THE PROCTER & GAMBLE COMPANY',
      'P&G',
      'PG',
    ],
    sicCodes: ['2841'],
    naicsCodes: ['325611'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '80424',
  },

  // ── Transportation ──────────────────────────────────────────────────
  {
    canonicalName: 'UNION PACIFIC',
    aliases: ['UNION PACIFIC CORP', 'UNION PACIFIC RAILROAD', 'UNP'],
    sicCodes: ['4011'],
    naicsCodes: ['482111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '100885',
  },
  {
    canonicalName: 'FEDEX',
    aliases: ['FEDEX CORP', 'FEDEX CORPORATION', 'FEDERAL EXPRESS', 'FDX'],
    sicCodes: ['4513'],
    naicsCodes: ['492110'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1048911',
  },
  {
    canonicalName: 'UNITED PARCEL SERVICE',
    aliases: ['UPS', 'UNITED PARCEL SERVICE INC'],
    sicCodes: ['4215'],
    naicsCodes: ['492110'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1090727',
  },
  {
    canonicalName: 'DELTA AIR LINES',
    aliases: ['DELTA AIR LINES INC', 'DELTA AIRLINES', 'DELTA', 'DAL'],
    sicCodes: ['4512'],
    naicsCodes: ['481111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '27904',
  },
  {
    canonicalName: 'UNITED AIRLINES',
    aliases: [
      'UNITED AIRLINES HOLDINGS',
      'UNITED AIRLINES HOLDINGS INC',
      'UNITED CONTINENTAL',
      'UAL',
    ],
    sicCodes: ['4512'],
    naicsCodes: ['481111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '100517',
  },
  {
    canonicalName: 'AMERICAN AIRLINES',
    aliases: ['AMERICAN AIRLINES GROUP', 'AMERICAN AIRLINES GROUP INC', 'AAL', 'AMR CORP'],
    sicCodes: ['4512'],
    naicsCodes: ['481111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '6201',
  },
  {
    canonicalName: 'NORFOLK SOUTHERN',
    aliases: ['NORFOLK SOUTHERN CORP', 'NORFOLK SOUTHERN CORPORATION', 'NSC'],
    sicCodes: ['4011'],
    naicsCodes: ['482111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '73309',
  },

  // ── Consumer / Retail ───────────────────────────────────────────────
  {
    canonicalName: 'WALMART',
    aliases: [
      'WALMART INC',
      'WAL-MART',
      'WAL MART',
      'WAL-MART STORES',
      'WAL-MART STORES INC',
      'WMT',
    ],
    sicCodes: ['5331'],
    naicsCodes: ['452210'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '104169',
  },
  {
    canonicalName: 'HOME DEPOT',
    aliases: ['THE HOME DEPOT', 'HOME DEPOT INC', 'HD'],
    sicCodes: ['5211'],
    naicsCodes: ['444110'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '354950',
  },
  {
    canonicalName: 'TARGET',
    aliases: ['TARGET CORP', 'TARGET CORPORATION', 'TGT'],
    sicCodes: ['5331'],
    naicsCodes: ['452210'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '27419',
  },
  {
    canonicalName: 'COSTCO',
    aliases: ['COSTCO WHOLESALE', 'COSTCO WHOLESALE CORP', 'COST'],
    sicCodes: ['5331'],
    naicsCodes: ['452910'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '909832',
  },

  // ── Agriculture ─────────────────────────────────────────────────────
  {
    canonicalName: 'CARGILL',
    aliases: ['CARGILL INC', 'CARGILL INCORPORATED'],
    sicCodes: ['2041'],
    naicsCodes: ['311211'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: null,
  },
  {
    canonicalName: 'ARCHER DANIELS MIDLAND',
    aliases: ['ADM', 'ARCHER-DANIELS-MIDLAND', 'ARCHER DANIELS MIDLAND CO'],
    sicCodes: ['2041'],
    naicsCodes: ['311211'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: '7084',
  },
  {
    canonicalName: 'DEERE',
    aliases: ['DEERE & CO', 'DEERE AND COMPANY', 'JOHN DEERE', 'DE'],
    sicCodes: ['3523'],
    naicsCodes: ['333111'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: '315189',
  },
  {
    canonicalName: 'MONSANTO',
    aliases: ['MONSANTO CO', 'MONSANTO COMPANY', 'BAYER CROP SCIENCE'],
    sicCodes: ['2870'],
    naicsCodes: ['325320'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: null,
  },
  {
    canonicalName: 'BAYER',
    aliases: ['BAYER AG', 'BAYER CORP', 'BAYER HEALTHCARE', 'BAYRY'],
    sicCodes: ['2834'],
    naicsCodes: ['325412'],
    sector: IndustrySector.HEALTH,
    cik: null,
  },

  // ── Construction ────────────────────────────────────────────────────
  {
    canonicalName: 'BECHTEL',
    aliases: ['BECHTEL GROUP', 'BECHTEL CORP', 'BECHTEL NATIONAL'],
    sicCodes: ['1542'],
    naicsCodes: ['236220'],
    sector: IndustrySector.CONSTRUCTION,
    cik: null,
  },
  {
    canonicalName: 'FLUOR',
    aliases: ['FLUOR CORP', 'FLUOR CORPORATION', 'FLR'],
    sicCodes: ['1542'],
    naicsCodes: ['236220'],
    sector: IndustrySector.CONSTRUCTION,
    cik: '1124198',
  },

  // ── Automotive ──────────────────────────────────────────────────────
  {
    canonicalName: 'GENERAL MOTORS',
    aliases: ['GENERAL MOTORS CO', 'GENERAL MOTORS COMPANY', 'GM'],
    sicCodes: ['3711'],
    naicsCodes: ['336111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1467858',
  },
  {
    canonicalName: 'FORD MOTOR',
    aliases: ['FORD MOTOR CO', 'FORD MOTOR COMPANY', 'FORD', 'F'],
    sicCodes: ['3711'],
    naicsCodes: ['336111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '37996',
  },
  {
    canonicalName: 'TOYOTA',
    aliases: ['TOYOTA MOTOR', 'TOYOTA MOTOR CORP', 'TM', 'TOYOTA MOTOR NORTH AMERICA'],
    sicCodes: ['3711'],
    naicsCodes: ['336111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1094517',
  },
  {
    canonicalName: 'STELLANTIS',
    aliases: ['STELLANTIS NV', 'FIAT CHRYSLER', 'CHRYSLER', 'FCA', 'FIAT CHRYSLER AUTOMOBILES'],
    sicCodes: ['3711'],
    naicsCodes: ['336111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1513153',
  },
  {
    canonicalName: 'TESLA',
    aliases: ['TESLA INC', 'TESLA MOTORS', 'TSLA'],
    sicCodes: ['3711'],
    naicsCodes: ['336111'],
    sector: IndustrySector.TRANSPORTATION,
    cik: '1318605',
  },

  // ── Tobacco ─────────────────────────────────────────────────────────
  {
    canonicalName: 'PHILIP MORRIS',
    aliases: [
      'PHILIP MORRIS INTERNATIONAL',
      'PHILIP MORRIS INTERNATIONAL INC',
      'PM',
      'ALTRIA',
      'ALTRIA GROUP',
      'ALTRIA GROUP INC',
      'MO',
    ],
    sicCodes: ['2111'],
    naicsCodes: ['312230'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: '1413329',
  },
  {
    canonicalName: 'REYNOLDS AMERICAN',
    aliases: [
      'R.J. REYNOLDS',
      'RJ REYNOLDS',
      'RJ REYNOLDS TOBACCO',
      'BRITISH AMERICAN TOBACCO',
      'BAT',
    ],
    sicCodes: ['2111'],
    naicsCodes: ['312230'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: null,
  },

  // ── Insurance ───────────────────────────────────────────────────────
  {
    canonicalName: 'STATE FARM',
    aliases: ['STATE FARM INSURANCE', 'STATE FARM MUTUAL', 'STATE FARM MUTUAL AUTOMOBILE'],
    sicCodes: ['6311'],
    naicsCodes: ['524126'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: null,
  },
  {
    canonicalName: 'ALLSTATE',
    aliases: ['ALLSTATE CORP', 'THE ALLSTATE CORPORATION', 'ALL'],
    sicCodes: ['6331'],
    naicsCodes: ['524126'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '899629',
  },
  {
    canonicalName: 'PROGRESSIVE',
    aliases: ['PROGRESSIVE CORP', 'THE PROGRESSIVE CORPORATION', 'PGR'],
    sicCodes: ['6331'],
    naicsCodes: ['524126'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '80661',
  },
  {
    canonicalName: 'METLIFE',
    aliases: ['METLIFE INC', 'METROPOLITAN LIFE', 'MET'],
    sicCodes: ['6311'],
    naicsCodes: ['524113'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: '1099219',
  },

  // ── Food & Beverage ─────────────────────────────────────────────────
  {
    canonicalName: 'PEPSICO',
    aliases: ['PEPSICO INC', 'PEPSI', 'FRITO-LAY', 'FRITO LAY', 'PEP'],
    sicCodes: ['2086'],
    naicsCodes: ['312111'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: '77476',
  },
  {
    canonicalName: 'COCA COLA',
    aliases: ['THE COCA-COLA COMPANY', 'COCA-COLA', 'COCA COLA CO', 'COKE', 'KO'],
    sicCodes: ['2086'],
    naicsCodes: ['312111'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: '21344',
  },
  {
    canonicalName: 'NESTLE',
    aliases: ['NESTLE USA', 'NESTLE SA', 'NSRGY'],
    sicCodes: ['2024'],
    naicsCodes: ['311520'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: null,
  },
  {
    canonicalName: 'TYSON FOODS',
    aliases: ['TYSON FOODS INC', 'TYSON', 'TSN'],
    sicCodes: ['2011'],
    naicsCodes: ['311611'],
    sector: IndustrySector.AGRIBUSINESS,
    cik: '100493',
  },

  // ── Labor ───────────────────────────────────────────────────────────
  {
    canonicalName: 'AFL-CIO',
    aliases: ['AMERICAN FEDERATION OF LABOR', 'AFL CIO', 'AFLCIO'],
    sicCodes: [],
    naicsCodes: ['813930'],
    sector: IndustrySector.LABOR,
    cik: null,
  },
  {
    canonicalName: 'SEIU',
    aliases: ['SERVICE EMPLOYEES INTERNATIONAL UNION', 'SERVICE EMPLOYEES INTL UNION'],
    sicCodes: [],
    naicsCodes: ['813930'],
    sector: IndustrySector.LABOR,
    cik: null,
  },
  {
    canonicalName: 'TEAMSTERS',
    aliases: ['INTERNATIONAL BROTHERHOOD OF TEAMSTERS', 'IBT'],
    sicCodes: [],
    naicsCodes: ['813930'],
    sector: IndustrySector.LABOR,
    cik: null,
  },
  {
    canonicalName: 'UAW',
    aliases: [
      'UNITED AUTO WORKERS',
      'UNITED AUTOMOBILE WORKERS',
      'INTERNATIONAL UNION UNITED AUTOMOBILE',
    ],
    sicCodes: [],
    naicsCodes: ['813930'],
    sector: IndustrySector.LABOR,
    cik: null,
  },

  // ── Trade Associations ──────────────────────────────────────────────
  {
    canonicalName: 'US CHAMBER OF COMMERCE',
    aliases: [
      'CHAMBER OF COMMERCE OF THE UNITED STATES',
      'U.S. CHAMBER OF COMMERCE',
      'UNITED STATES CHAMBER OF COMMERCE',
      'USCOC',
    ],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: null,
  },
  {
    canonicalName: 'NATIONAL ASSOCIATION OF REALTORS',
    aliases: ['NAR', 'NATL ASSN OF REALTORS', 'REALTORS PAC'],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    cik: null,
  },
  {
    canonicalName: 'AMERICAN MEDICAL ASSOCIATION',
    aliases: ['AMA', 'AMPAC'],
    sicCodes: [],
    naicsCodes: ['813920'],
    sector: IndustrySector.HEALTH,
    cik: null,
  },
  {
    canonicalName: 'AMERICAN HOSPITAL ASSOCIATION',
    aliases: ['AHA', 'AM HOSPITAL ASSN'],
    sicCodes: [],
    naicsCodes: ['813920'],
    sector: IndustrySector.HEALTH,
    cik: null,
  },
  {
    canonicalName: 'PHRMA',
    aliases: [
      'PHARMACEUTICAL RESEARCH AND MANUFACTURERS OF AMERICA',
      'PHARMACEUTICAL RESEARCH & MANUFACTURERS',
      'PHARMA',
    ],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.HEALTH,
    cik: null,
  },
  {
    canonicalName: 'AMERICAN PETROLEUM INSTITUTE',
    aliases: ['API', 'AMER PETROLEUM INST'],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
    cik: null,
  },
  {
    canonicalName: 'NATIONAL RIFLE ASSOCIATION',
    aliases: ['NRA', 'NRA OF AMERICA', 'NRA POLITICAL VICTORY FUND'],
    sicCodes: [],
    naicsCodes: ['813410'],
    sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    cik: null,
  },
  {
    canonicalName: 'AARP',
    aliases: ['AMERICAN ASSOCIATION OF RETIRED PERSONS'],
    sicCodes: [],
    naicsCodes: ['813410'],
    sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    cik: null,
  },
  {
    canonicalName: 'NATIONAL ASSOCIATION OF MANUFACTURERS',
    aliases: ['NAM', 'NATL ASSN OF MANUFACTURERS'],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: null,
  },
  {
    canonicalName: 'BUSINESS ROUNDTABLE',
    aliases: ['BRT'],
    sicCodes: [],
    naicsCodes: ['813910'],
    sector: IndustrySector.MISC_BUSINESS,
    cik: null,
  },
  {
    canonicalName: 'BLUE CROSS BLUE SHIELD',
    aliases: ['BLUE CROSS AND BLUE SHIELD', 'BCBS', 'BLUE CROSS BLUE SHIELD ASSOCIATION', 'BCBSA'],
    sicCodes: ['6324'],
    naicsCodes: ['524114'],
    sector: IndustrySector.HEALTH,
    cik: null,
  },

  // ── Media & Entertainment ───────────────────────────────────────────
  {
    canonicalName: 'WALT DISNEY',
    aliases: ['THE WALT DISNEY COMPANY', 'DISNEY', 'WALT DISNEY CO', 'DIS'],
    sicCodes: ['7812'],
    naicsCodes: ['512110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1744489',
  },
  {
    canonicalName: 'WARNER BROS DISCOVERY',
    aliases: [
      'WARNER BROS',
      'WARNER MEDIA',
      'WARNERMEDIA',
      'WBD',
      'DISCOVERY INC',
      'AT&T WARNERMEDIA',
    ],
    sicCodes: ['4841'],
    naicsCodes: ['512110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '1437107',
  },
  {
    canonicalName: 'PARAMOUNT',
    aliases: ['PARAMOUNT GLOBAL', 'VIACOM', 'VIACOMBSCBS', 'CBS', 'PARA'],
    sicCodes: ['4841'],
    naicsCodes: ['512110'],
    sector: IndustrySector.COMMUNICATIONS_ELECTRONICS,
    cik: '813828',
  },

  // ── Lawyers & Lobbyists ─────────────────────────────────────────────
  {
    canonicalName: 'AKIN GUMP',
    aliases: [
      'AKIN GUMP STRAUSS HAUER AND FELD',
      'AKIN GUMP STRAUSS HAUER & FELD',
      'AKIN GUMP STRAUSS',
    ],
    sicCodes: ['8111'],
    naicsCodes: ['541110'],
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    cik: null,
  },
  {
    canonicalName: 'SQUIRE PATTON BOGGS',
    aliases: ['SQUIRE PATTON BOGGS LLP', 'PATTON BOGGS', 'SQUIRE SANDERS'],
    sicCodes: ['8111'],
    naicsCodes: ['541110'],
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    cik: null,
  },
  {
    canonicalName: 'BROWNSTEIN HYATT',
    aliases: ['BROWNSTEIN HYATT FARBER SCHRECK', 'BROWNSTEIN HYATT FARBER SCHRECK LLP'],
    sicCodes: ['8111'],
    naicsCodes: ['541110'],
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    cik: null,
  },
  {
    canonicalName: 'HOLLAND AND KNIGHT',
    aliases: ['HOLLAND & KNIGHT', 'HOLLAND & KNIGHT LLP'],
    sicCodes: ['8111'],
    naicsCodes: ['541110'],
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    cik: null,
  },
  {
    canonicalName: 'K STREET PARTNERS',
    aliases: ['K&L GATES', 'K AND L GATES'],
    sicCodes: ['8111'],
    naicsCodes: ['541110'],
    sector: IndustrySector.LAWYERS_LOBBYISTS,
    cik: null,
  },
];

/**
 * Case-insensitive lookup index: normalized alias → CompanyAlias.
 * Built once at module load.
 */
const ALIAS_INDEX = new Map<string, CompanyAlias>();

for (const entry of COMPANY_ALIAS_TABLE) {
  // Index the canonical name itself
  ALIAS_INDEX.set(entry.canonicalName.toUpperCase(), entry);

  // Index every alias
  for (const alias of entry.aliases) {
    ALIAS_INDEX.set(alias.toUpperCase(), entry);
  }
}

/**
 * Corporate suffix pattern for stripping before lookup.
 */
const STRIP_SUFFIX =
  /\b(inc|llc|llp|corp|lp|ltd|co|company|corporation|incorporated|limited|plc|sa|ag|gmbh)\b\.?/gi;

/**
 * Look up a company by any known alias.
 * Normalizes the input (strips suffixes, punctuation) before matching.
 * Returns the CompanyAlias entry or null if not found.
 */
export function findCompanyByAlias(name: string): CompanyAlias | null {
  if (!name?.trim()) return null;

  // Try direct lookup first
  const upper = name.trim().toUpperCase();
  const direct = ALIAS_INDEX.get(upper);
  if (direct) return direct;

  // Strip suffixes and punctuation, then retry
  const cleaned = upper
    .replace(STRIP_SUFFIX, '')
    .replace(/&/g, ' AND ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return ALIAS_INDEX.get(cleaned) ?? null;
}
