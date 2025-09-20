/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Name Variants Generator for GDELT Search Optimization
 *
 * Generates comprehensive name variations for Congress members to improve
 * GDELT API search coverage and accuracy. Includes formal names, nicknames,
 * titles, state-specific variations, and leadership positions.
 */

import { BaseRepresentative } from '@/types/representative';

export interface NameVariantOptions {
  readonly includeNicknames?: boolean;
  readonly includeLeadershipTitles?: boolean;
  readonly includeStateVariations?: boolean;
  readonly includeFormalTitles?: boolean;
  readonly includeCommonNames?: boolean;
}

export interface NameVariants {
  readonly formal: string[];
  readonly nicknames: string[];
  readonly titles: string[];
  readonly leadership: string[];
  readonly stateSpecific: string[];
  readonly all: string[];
}

/**
 * Comprehensive nickname database for Congress members
 * Includes well-known nicknames, shortened names, and common variations
 */
const CONGRESS_NICKNAMES: Record<string, string[]> = {
  // House Representatives - High Profile
  O000172: ['AOC', 'Alexandria'], // Alexandria Ocasio-Cortez
  P000197: ['Nancy', 'Speaker Pelosi'], // Nancy Pelosi
  S001193: ['Eric'], // Eric Swalwell
  C001084: ['David'], // David Cicilline
  T000460: ['Mike'], // Mike Thompson
  J000126: ['Eddie Bernice'], // Eddie Bernice Johnson
  W000187: ['Maxine'], // Maxine Waters
  L000551: ['Barbara'], // Barbara Lee
  S000510: ['Adam'], // Adam Smith
  G000559: ['John'], // John Garamendi

  // Senate - High Profile
  S000033: ['Bernie'], // Bernie Sanders
  W000817: ['Elizabeth', 'Liz'], // Elizabeth Warren
  K000367: ['Amy'], // Amy Klobuchar
  M000355: ['Mitch'], // Mitch McConnell
  S000148: ['Chuck'], // Chuck Schumer
  C001035: ['Susan', 'Sue'], // Susan Collins
  M001153: ['Lisa'], // Lisa Murkowski
  C001113: ['Catherine', 'Cathy'], // Catherine Cortez Masto
  H001046: ['Martin'], // Martin Heinrich
  M001169: ['Chris'], // Chris Murphy

  // Leadership and Committee Chairs
  H000874: ['Steny'], // Steny Hoyer
  C001078: ['Gerry'], // Gerry Connolly
  M001207: ['Debbie'], // Debbie Mucarsel-Powell
  T000193: ['Bennie'], // Bennie Thompson
  N000147: ['Jerry'], // Jerry Nadler

  // Notable Freshman and Rising Stars
  B001315: ['Cori'], // Cori Bush
  O000173: ['Ilhan'], // Ilhan Omar
  T000481: ['Rashida'], // Rashida Tlaib
  P000618: ['Katie'], // Katie Porter
};

/**
 * Leadership titles for current Congress members
 * Updated for 119th Congress leadership positions
 */
const LEADERSHIP_TITLES: Record<string, string[]> = {
  // House Leadership
  J000289: ['Speaker', 'Speaker Johnson'], // Mike Johnson (Speaker)
  J000295: ['Majority Leader'], // Steve Scalise
  E000071: ['Majority Whip'], // Tom Emmer
  J000266: ['Minority Leader'], // Hakeem Jeffries
  C001049: ['Minority Whip'], // Katherine Clark

  // Senate Leadership
  S000148: ['Majority Leader', 'Majority Leader Schumer'], // Chuck Schumer
  T000250: ['Majority Whip'], // John Thune
  M000355: ['Minority Leader', 'Minority Leader McConnell'], // Mitch McConnell
  C001056: ['Minority Whip'], // John Cornyn

  // Former Leadership (still commonly referenced with titles)
  P000197: ['Speaker Emerita', 'Former Speaker', 'Speaker Pelosi'], // Nancy Pelosi
  M001175: ['Former Majority Leader'], // Kevin McCarthy

  // Committee Leadership (major committees)
  C001084: ['Chairman'], // David Cicilline (when in leadership)
  N000147: ['Chairman Nadler'], // Jerry Nadler (Judiciary)
  T000193: ['Chairman Thompson'], // Bennie Thompson (Homeland Security)
};

/**
 * State-specific name variations and regional titles
 */
const STATE_VARIATIONS: Record<string, (member: BaseRepresentative) => string[]> = {
  TX: member => [`${member.lastName} Texas`, `Texas ${member.lastName}`],
  CA: member => [`${member.lastName} California`, `California ${member.lastName}`],
  NY: member => [`${member.lastName} New York`, `New York ${member.lastName}`],
  FL: member => [`${member.lastName} Florida`, `Florida ${member.lastName}`],
  // Add more states as needed
};

export class NameVariantsGenerator {
  private readonly options: Required<NameVariantOptions>;

  constructor(options: NameVariantOptions = {}) {
    this.options = {
      includeNicknames: true,
      includeLeadershipTitles: true,
      includeStateVariations: true,
      includeFormalTitles: true,
      includeCommonNames: true,
      ...options,
    };
  }

  /**
   * Generate all name variants for a Congress member
   */
  generateVariants(member: BaseRepresentative): NameVariants {
    const formal = this.generateFormalNames(member);
    const nicknames = this.options.includeNicknames ? this.generateNicknames(member) : [];
    const titles = this.options.includeFormalTitles ? this.generateTitleVariants(member) : [];
    const leadership = this.options.includeLeadershipTitles
      ? this.generateLeadershipTitles(member)
      : [];
    const stateSpecific = this.options.includeStateVariations
      ? this.generateStateVariations(member)
      : [];

    const all = [...formal, ...nicknames, ...titles, ...leadership, ...stateSpecific].filter(
      (variant, index, array) => array.indexOf(variant) === index
    ); // Remove duplicates

    return {
      formal,
      nicknames,
      titles,
      leadership,
      stateSpecific,
      all,
    };
  }

  /**
   * Generate formal name variations
   */
  private generateFormalNames(member: BaseRepresentative): string[] {
    const variants = [
      `"${member.firstName} ${member.lastName}"`,
      `"${member.lastName}"`,
      `"${member.name}"`, // Full name as provided
    ];

    // Add initials if common
    if (member.firstName.length > 0) {
      variants.push(`"${member.firstName[0]}. ${member.lastName}"`);
    }

    // Add middle initial if present in full name
    const nameParts = member.name.split(' ');
    if (nameParts.length > 2) {
      const middleInitial = nameParts[1];
      variants.push(`"${member.firstName} ${middleInitial} ${member.lastName}"`);
    }

    return variants;
  }

  /**
   * Generate nickname variations
   */
  private generateNicknames(member: BaseRepresentative): string[] {
    const nicknames = CONGRESS_NICKNAMES[member.bioguideId] || [];
    const variants: string[] = [];

    nicknames.forEach(nickname => {
      variants.push(`"${nickname}"`);
      variants.push(`"${nickname} ${member.lastName}"`);
      variants.push(`"${nickname} ${member.state}"`);
    });

    // Add common shortened versions of first names
    const commonShortNames = this.getCommonShortNames(member.firstName);
    commonShortNames.forEach(shortName => {
      if (!nicknames.includes(shortName)) {
        variants.push(`"${shortName} ${member.lastName}"`);
      }
    });

    return variants;
  }

  /**
   * Generate title-based variations
   */
  private generateTitleVariants(member: BaseRepresentative): string[] {
    const variants: string[] = [];

    if (member.chamber === 'House') {
      variants.push(
        `"Rep. ${member.lastName}"`,
        `"Representative ${member.lastName}"`,
        `"Rep. ${member.firstName} ${member.lastName}"`,
        `"Representative ${member.firstName} ${member.lastName}"`,
        `"Congressman ${member.lastName}"`,
        `"Congresswoman ${member.lastName}"`
      );
    } else {
      variants.push(
        `"Sen. ${member.lastName}"`,
        `"Senator ${member.lastName}"`,
        `"Sen. ${member.firstName} ${member.lastName}"`,
        `"Senator ${member.firstName} ${member.lastName}"`
      );
    }

    return variants;
  }

  /**
   * Generate leadership title variations
   */
  private generateLeadershipTitles(member: BaseRepresentative): string[] {
    const titles = LEADERSHIP_TITLES[member.bioguideId] || [];
    const variants: string[] = [];

    titles.forEach(title => {
      variants.push(`"${title}"`);
      variants.push(`"${title} ${member.lastName}"`);
    });

    return variants;
  }

  /**
   * Generate state-specific variations
   */
  private generateStateVariations(member: BaseRepresentative): string[] {
    const variants = [
      `"${member.lastName} ${member.state}"`,
      `"${member.firstName} ${member.lastName} ${member.state}"`,
    ];

    // Add district for House members
    if (member.chamber === 'House' && member.district) {
      variants.push(
        `"${member.lastName} ${member.state}-${member.district}"`,
        `"${member.lastName} ${member.state} ${member.district}"`
      );
    }

    // Add state-specific generators
    const stateGenerator = STATE_VARIATIONS[member.state];
    if (stateGenerator) {
      variants.push(...stateGenerator(member));
    }

    return variants.map(v => `"${v.replace(/"/g, '')}"`); // Ensure proper quoting
  }

  /**
   * Get common shortened versions of first names
   */
  private getCommonShortNames(firstName: string): string[] {
    const shortNameMap: Record<string, string[]> = {
      Alexander: ['Alex', 'Xander'],
      Alexandra: ['Alex', 'Lexi'],
      Benjamin: ['Ben', 'Benny'],
      Christopher: ['Chris', 'Christie'],
      Daniel: ['Dan', 'Danny'],
      David: ['Dave', 'Davey'],
      Elizabeth: ['Liz', 'Beth', 'Lizzy'],
      Jennifer: ['Jen', 'Jenny'],
      Jonathan: ['Jon', 'Johnny'],
      Katherine: ['Kate', 'Katie', 'Kathy'],
      Matthew: ['Matt', 'Matty'],
      Michael: ['Mike', 'Mickey'],
      Nicholas: ['Nick', 'Nicky'],
      Patricia: ['Pat', 'Patty', 'Tricia'],
      Richard: ['Rick', 'Dick', 'Richie'],
      Robert: ['Bob', 'Bobby', 'Rob'],
      Samuel: ['Sam', 'Sammy'],
      Susan: ['Sue', 'Susie'],
      Thomas: ['Tom', 'Tommy'],
      William: ['Bill', 'Billy', 'Will'],
    };

    return shortNameMap[firstName] || [];
  }

  /**
   * Static method for quick variant generation
   */
  static generateQuickVariants(member: BaseRepresentative): string[] {
    const generator = new NameVariantsGenerator();
    return generator.generateVariants(member).all;
  }

  /**
   * Get variants optimized for GDELT search queries
   */
  generateGDELTOptimizedVariants(member: BaseRepresentative): string[] {
    const variants = this.generateVariants(member);

    // Prioritize most effective variants for GDELT
    const prioritized = [
      ...variants.formal.slice(0, 3), // Top 3 formal names
      ...variants.nicknames.slice(0, 2), // Top 2 nicknames
      ...variants.titles.slice(0, 4), // Top 4 title variants
      ...variants.leadership.slice(0, 2), // Top 2 leadership titles
      ...variants.stateSpecific.slice(0, 2), // Top 2 state variants
    ];

    // Remove duplicates and limit to reasonable number for API efficiency
    return prioritized
      .filter((variant, index, array) => array.indexOf(variant) === index)
      .slice(0, 15); // Limit to 15 variants for optimal query performance
  }
}

/**
 * Utility function to generate name variants for batch processing
 */
export function generateBatchNameVariants(
  members: BaseRepresentative[],
  options?: NameVariantOptions
): Map<string, string[]> {
  const generator = new NameVariantsGenerator(options);
  const variants = new Map<string, string[]>();

  members.forEach(member => {
    variants.set(member.bioguideId, generator.generateGDELTOptimizedVariants(member));
  });

  return variants;
}

/**
 * Export commonly used nickname database for external use
 */
export { CONGRESS_NICKNAMES, LEADERSHIP_TITLES };
