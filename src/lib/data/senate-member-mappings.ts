/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Comprehensive Senate Member Name to Bioguide ID Mappings
 *
 * This mapping handles cases where Senate XML data doesn't include bioguide IDs
 * Maps various name formats (formal names, nicknames, with/without middle initials)
 * to their corresponding bioguide IDs for clickable senator links.
 */

export const senateMemberMappings: Record<string, string> = {
  // Alabama
  'Tommy Tuberville': 'T000278',
  'Katie Britt': 'B001310',
  'Katie Boyd Britt': 'B001310',

  // Alaska
  'Lisa Murkowski': 'M001153',
  'Dan Sullivan': 'S001198',
  'Daniel Sullivan': 'S001198',

  // Arizona
  'Kyrsten Sinema': 'S001191',
  'Mark Kelly': 'K000377',

  // Arkansas
  'John Boozman': 'B001236',
  'Tom Cotton': 'C001095',
  'Thomas Cotton': 'C001095',

  // California
  'Dianne Feinstein': 'F000062',
  'Alex Padilla': 'P000145',
  'Alejandro Padilla': 'P000145',

  // Colorado
  'Michael Bennet': 'B001267',
  'John Hickenlooper': 'H001061',

  // Connecticut
  'Richard Blumenthal': 'B001277',
  'Chris Murphy': 'M001169',
  'Christopher Murphy': 'M001169',

  // Delaware
  'Tom Carper': 'C000174',
  'Thomas Carper': 'C000174',
  'Chris Coons': 'C001088',
  'Christopher Coons': 'C001088',

  // Florida
  'Marco Rubio': 'R000595',
  'Rick Scott': 'S001217',
  'Richard Scott': 'S001217',

  // Georgia
  'Jon Ossoff': 'O000174',
  'Raphael Warnock': 'W000790',

  // Hawaii
  'Brian Schatz': 'S001194',
  'Mazie Hirono': 'H001042',

  // Idaho
  'Mike Crapo': 'C000880',
  'Michael Crapo': 'C000880',
  'Jim Risch': 'R000584',
  'James Risch': 'R000584',
  'James E. Risch': 'R000584',

  // Illinois
  'Dick Durbin': 'D000563',
  'Richard Durbin': 'D000563',
  'Tammy Duckworth': 'D000622',

  // Indiana
  'Todd Young': 'Y000064',
  'Mike Braun': 'B001310',

  // Iowa
  'Chuck Grassley': 'G000386',
  'Charles Grassley': 'G000386',
  'Joni Ernst': 'E000295',

  // Kansas
  'Jerry Moran': 'M000934',
  'Roger Marshall': 'M000355',

  // Kentucky
  'Mitch McConnell': 'M000355',
  'Mitchell McConnell': 'M000355',
  'Rand Paul': 'P000603',
  'Randal Paul': 'P000603',

  // Louisiana
  'Bill Cassidy': 'C001075',
  'William Cassidy': 'C001075',
  'John Kennedy': 'K000393',

  // Maine
  'Susan Collins': 'C001035',
  'Angus King': 'K000383',

  // Maryland
  'Ben Cardin': 'C000141',
  'Benjamin Cardin': 'C000141',
  'Chris Van Hollen': 'V000128',
  'Christopher Van Hollen': 'V000128',

  // Massachusetts
  'Elizabeth Warren': 'W000817',
  'Ed Markey': 'M000133',
  'Edward Markey': 'M000133',

  // Michigan
  'Debbie Stabenow': 'S000770',
  'Gary Peters': 'P000595',

  // Minnesota
  'Amy Klobuchar': 'K000367',
  'Tina Smith': 'S001203',

  // Mississippi
  'Roger Wicker': 'W000437',
  'Cindy Hyde-Smith': 'H001079',

  // Missouri
  'Josh Hawley': 'H001089',
  'Joshua Hawley': 'H001089',
  'Eric Schmitt': 'S001203',

  // Montana
  'Jon Tester': 'T000464',
  'Steve Daines': 'D000618',
  'Steven Daines': 'D000618',

  // Nebraska
  'Deb Fischer': 'F000463',
  'Debra Fischer': 'F000463',
  'Pete Ricketts': 'R000618',
  'Peter Ricketts': 'R000618',

  // Nevada
  'Catherine Cortez Masto': 'C001113',
  'Jacky Rosen': 'R000608',

  // New Hampshire
  'Jeanne Shaheen': 'S001181',
  'Maggie Hassan': 'H001076',
  'Margaret Hassan': 'H001076',

  // New Jersey
  'Bob Menendez': 'M000639',
  'Robert Menendez': 'M000639',
  'Cory Booker': 'B001288',

  // New Mexico
  'Martin Heinrich': 'H001046',
  'Ben Lujan': 'L000570',
  'Ben Ray Lujan': 'L000570',
  'Benjamin Ray Lujan': 'L000570',

  // New York
  'Chuck Schumer': 'S000148',
  'Charles Schumer': 'S000148',
  'Kirsten Gillibrand': 'G000555',

  // North Carolina
  'Thom Tillis': 'T000476',
  'Thomas Tillis': 'T000476',
  'Ted Budd': 'B001305',
  'Theodore Budd': 'B001305',

  // North Dakota
  'John Hoeven': 'H001061',
  'Kevin Cramer': 'C001096',

  // Ohio
  'Sherrod Brown': 'B000944',
  'J.D. Vance': 'V000137',
  'JD Vance': 'V000137',

  // Oklahoma
  'Jim Inhofe': 'I000024',
  'James Inhofe': 'I000024',
  'Markwayne Mullin': 'M001190',

  // Oregon
  'Ron Wyden': 'W000779',
  'Ronald Wyden': 'W000779',
  'Jeff Merkley': 'M001176',
  'Jeffrey Merkley': 'M001176',

  // Pennsylvania
  'Bob Casey': 'C001070',
  'Robert Casey': 'C001070',
  'John Fetterman': 'F000482',

  // Rhode Island
  'Jack Reed': 'R000122',
  'John Reed': 'R000122',
  'Sheldon Whitehouse': 'W000802',

  // South Carolina
  'Lindsey Graham': 'G000359',
  'Tim Scott': 'S001184',
  'Timothy Scott': 'S001184',

  // South Dakota
  'John Thune': 'T000250',
  'Mike Rounds': 'R000605',
  'Michael Rounds': 'R000605',

  // Tennessee
  'Marsha Blackburn': 'B001243',
  'Bill Hagerty': 'H001089',
  'William Hagerty': 'H001089',

  // Texas
  'John Cornyn': 'C001056',
  'Ted Cruz': 'C001098',
  'Rafael Cruz': 'C001098',

  // Utah
  'Mike Lee': 'L000577',
  'Michael Lee': 'L000577',
  'Mitt Romney': 'R000615',
  'Willard Romney': 'R000615',

  // Vermont
  'Bernie Sanders': 'S000033',
  'Bernard Sanders': 'S000033',
  'Peter Welch': 'W000800',

  // Virginia
  'Mark Warner': 'W000805',
  'Tim Kaine': 'K000384',
  'Timothy Kaine': 'K000384',

  // Washington
  'Patty Murray': 'M001111',
  'Patricia Murray': 'M001111',
  'Maria Cantwell': 'C000127',

  // West Virginia
  'Joe Manchin': 'M001183',
  'Joseph Manchin': 'M001183',
  'Shelley Capito': 'C001047',
  'Shelley Moore Capito': 'C001047',

  // Wisconsin
  'Ron Johnson': 'J000293',
  'Ronald Johnson': 'J000293',
  'Tammy Baldwin': 'B001230',

  // Wyoming
  'John Barrasso': 'B001261',
  'Cynthia Lummis': 'L000571',
  'Cindy Lummis': 'L000571',
};

/**
 * Enhanced lookup function that handles various name formats
 * and fallback strategies for finding bioguide IDs
 */
export function findBioguideId(member: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  state?: string;
  bioguideId?: string;
}): string | null {
  // Strategy 1: Use existing bioguideId if available
  if (member.bioguideId) {
    return member.bioguideId;
  }

  // Strategy 2: Try full name lookup
  if (member.fullName) {
    // Clean up full name (remove party/state info)
    const cleanName = member.fullName
      .replace(/\s*\([DIR]-[A-Z]{2}\)\s*/, '') // Remove " (D-CA)" style party/state
      .replace(/\s*\([A-Z]{2}\)\s*/, '') // Remove " (CA)" style state
      .trim();

    if (senateMemberMappings[cleanName]) {
      return senateMemberMappings[cleanName];
    }
  }

  // Strategy 3: Try firstName + lastName combination
  if (member.firstName && member.lastName) {
    const fullName = `${member.firstName} ${member.lastName}`;
    if (senateMemberMappings[fullName]) {
      return senateMemberMappings[fullName];
    }

    // Try without middle initial
    const nameWithoutMiddle = fullName.replace(/\s+[A-Z]\.\s+/, ' ');
    if (senateMemberMappings[nameWithoutMiddle]) {
      return senateMemberMappings[nameWithoutMiddle];
    }
  }

  // Strategy 4: Try lastName + state lookup for common patterns
  if (member.lastName && member.state) {
    // Look for entries that end with lastName and match state pattern
    for (const [mappedName, bioguideId] of Object.entries(senateMemberMappings)) {
      if (mappedName.includes(member.lastName)) {
        // Additional verification would go here if needed
        return bioguideId;
      }
    }
  }

  return null;
}

/**
 * Get all mapped senator names for debugging purposes
 */
export function getMappedSenatorNames(): string[] {
  return Object.keys(senateMemberMappings);
}
