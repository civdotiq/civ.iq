/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Rich text descriptions for each IndustrySector value.
 *
 * These descriptions are embedded at build time to produce the 384-dim
 * reference vectors in sector-embeddings.json. At runtime, a bill's title
 * is embedded and compared against these reference vectors via cosine
 * similarity to classify which sectors the bill affects.
 *
 * The descriptions are intentionally verbose — they include synonyms,
 * related terms, and legislative vocabulary to maximize semantic overlap
 * with real bill titles. A description like "semiconductors, chip fabrication"
 * ensures that "CHIPS and Science Act" scores high against
 * COMMUNICATIONS_ELECTRONICS even though "chips" alone is ambiguous.
 *
 * If you change a description, re-run: npm run generate:embeddings
 */

import { IndustrySector } from '@/lib/fec/industry-taxonomy';

export const SECTOR_DESCRIPTIONS: Map<IndustrySector, string> = new Map([
  [
    IndustrySector.AGRIBUSINESS,
    'Agriculture and agribusiness industry: farming, crop production, livestock, ' +
      'ranching, dairy, food processing, food safety, nutrition programs, SNAP, ' +
      'farm subsidies, agricultural exports, pesticides, fertilizer, rural development, ' +
      'forestry, fisheries, aquaculture, organic farming, commodity markets, grain, ' +
      'ethanol, biofuels, USDA, farm bill, agricultural research, soil conservation',
  ],
  [
    IndustrySector.COMMUNICATIONS_ELECTRONICS,
    'Communications and electronics industry: telecommunications, broadcasting, ' +
      'media companies, cable television, internet service providers, software development, ' +
      'computer hardware, semiconductors, chip fabrication, electronics manufacturing, ' +
      'social media platforms, streaming services, cybersecurity, data centers, ' +
      'artificial intelligence technology, 5G wireless networks, broadband infrastructure, ' +
      'satellite communications, fiber optics, spectrum allocation, FCC regulation, ' +
      'net neutrality, digital privacy, tech companies, Silicon Valley, CHIPS Act',
  ],
  [
    IndustrySector.CONSTRUCTION,
    'Construction industry: building construction, infrastructure projects, ' +
      'highway construction, bridge building, dam construction, water systems, ' +
      'public works, housing development, commercial real estate development, ' +
      'building materials, cement, steel, lumber, architecture, engineering firms, ' +
      'Corps of Engineers, infrastructure spending, roads, tunnels, ports, ' +
      'federal buildings, affordable housing construction, green building',
  ],
  [
    IndustrySector.DEFENSE,
    'Defense and military industry: weapons systems, aerospace, defense contractors, ' +
      'military equipment, armed forces, veterans affairs, homeland security, ' +
      'intelligence community, national security, military bases, defense logistics, ' +
      'nuclear weapons, missile defense, Navy, Army, Air Force, Marines, ' +
      'Coast Guard, Pentagon, NDAA, defense authorization, military readiness, ' +
      'veteran benefits, VA hospitals, cybersecurity defense, space force, ' +
      'foreign military aid, NATO, arms control, sanctions',
  ],
  [
    IndustrySector.ENERGY_NATURAL_RESOURCES,
    'Energy and natural resources industry: oil, natural gas, petroleum, coal, ' +
      'renewable energy, solar power, wind energy, nuclear power, hydroelectric, ' +
      'electric utilities, pipeline companies, drilling, mining, minerals, ' +
      'environmental protection, EPA, climate change, carbon emissions, ' +
      'clean energy, energy efficiency, public lands, national parks, ' +
      'forest management, endangered species, wildlife conservation, BLM, ' +
      'offshore drilling, fracking, LNG exports, energy independence',
  ],
  [
    IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    'Finance, insurance, and real estate industry: banking, commercial banks, ' +
      'investment banks, Wall Street, securities, stock market, hedge funds, ' +
      'insurance companies, real estate, mortgage lending, credit unions, ' +
      'Federal Reserve, Treasury, SEC regulation, Dodd-Frank, financial regulation, ' +
      'consumer credit, student loans, small business lending, cryptocurrency, ' +
      'fintech, tax policy, IRS, taxation, tariffs, trade finance, ' +
      'international finance, debt ceiling, fiscal policy, budget, appropriations',
  ],
  [
    IndustrySector.HEALTH,
    'Health industry: healthcare, hospitals, physicians, pharmaceutical companies, ' +
      'drug manufacturers, medical devices, health insurance, Medicare, Medicaid, ' +
      'public health, CDC, FDA, NIH, biomedical research, clinical trials, ' +
      'prescription drugs, drug pricing, prescription drug price negotiation, ' +
      'pharmacy benefit managers, mental health, substance abuse, ' +
      'opioid crisis, veterans healthcare, nursing homes, home health, ' +
      'Affordable Care Act, health exchanges, pandemic preparedness, ' +
      'vaccines, telehealth, nursing workforce, maternal health',
  ],
  [
    IndustrySector.LAWYERS_LOBBYISTS,
    'Lawyers and lobbyists industry: law firms, legal services, lobbying firms, ' +
      'government relations, advocacy groups, litigation, judicial appointments, ' +
      'court system, Department of Justice, immigration law, civil rights, ' +
      'voting rights, criminal justice reform, sentencing, prisons, ' +
      'constitutional law, regulatory compliance, intellectual property, ' +
      'patent law, antitrust, class action lawsuits, legal aid, ' +
      'border security, asylum, visa programs, citizenship, naturalization',
  ],
  [
    IndustrySector.TRANSPORTATION,
    'Transportation industry: airlines, aviation, airports, FAA, FAA reauthorization, ' +
      'railroads, trucking, shipping, maritime, ports, public transit, Amtrak, ' +
      'highway safety, NHTSA, automobile industry, electric vehicles, ' +
      'autonomous vehicles, ride sharing, freight, logistics, pipelines, ' +
      'Department of Transportation, surface transportation reauthorization, ' +
      'air traffic control, pilot training, vehicle safety standards, ' +
      'fuel efficiency, CAFE standards, transportation funding, transit',
  ],
  [
    IndustrySector.MISC_BUSINESS,
    'Miscellaneous business: retail, wholesale trade, restaurants, food service, ' +
      'hospitality, tourism, hotels, entertainment, gaming, casinos, ' +
      'small business, manufacturing, textiles, consumer products, ' +
      'advertising, marketing, consulting, staffing, human resources, ' +
      'chambers of commerce, trade associations, business regulation, ' +
      'consumer protection, product safety, CPSC, antitrust, ' +
      'commerce, international trade, entrepreneurship, SBA',
  ],
  [
    IndustrySector.LABOR,
    'Labor and workforce industry: labor unions, collective bargaining, ' +
      'worker rights, right to organize, union organizing, protecting the right to organize, ' +
      'PRO Act, union election, union membership, organized labor, labor movement, ' +
      'minimum wage, overtime, OSHA, workplace safety, ' +
      'unemployment insurance, workers compensation, pension funds, ' +
      'retirement benefits, 401k, Social Security, employment law, ' +
      'Department of Labor, job training, workforce development, ' +
      'apprenticeships, equal pay, discrimination, family leave, FMLA, ' +
      'child labor, gig economy, independent contractors, prevailing wage, ' +
      'strikes, picket, National Labor Relations Board, NLRB',
  ],
  [
    IndustrySector.IDEOLOGY_SINGLE_ISSUE,
    'Ideology and single-issue advocacy: abortion rights, gun rights, gun control, ' +
      'Second Amendment, environmental advocacy, climate activism, ' +
      'religious organizations, faith-based initiatives, education policy, ' +
      'school choice, charter schools, curriculum, Title IX, ' +
      'LGBTQ rights, civil liberties, free speech, First Amendment, ' +
      'animal rights, human rights, foreign policy advocacy, ' +
      'pro-Israel, anti-war, term limits, government reform, ' +
      'arts funding, cultural programs, humanities, museums, social sciences',
  ],
  [
    IndustrySector.OTHER,
    'Other and miscellaneous government: government operations, ' +
      'federal workforce, civil service, government procurement, GSA, OPM, ' +
      'census, statistics, government technology, e-government, ' +
      'tribal affairs, Native American policy, Bureau of Indian Affairs, ' +
      'territories, District of Columbia, postal service, ' +
      'congressional operations, legislative branch, GAO, CBO, ' +
      'presidential administration, executive orders, regulatory reform',
  ],
]);
