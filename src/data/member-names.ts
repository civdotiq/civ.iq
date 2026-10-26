/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Names members go by that congress-legislators doesn't record, keyed by
 * Bioguide ID. Each was read from the member's own house.gov or senate.gov
 * site (checked 2026-10-26). Where the site and Wikipedia differ, the site
 * wins. Lone middle initials and generational suffixes are dropped, as for
 * every other member.
 * senate.gov blocks automated requests from our network, so Senate entries
 * cite an Internet Archive copy of the official site.
 */
export interface MemberNameSource {
  name: string;
  /** The official page the name was read from. */
  source: string;
  /** Internet Archive copy, when the official site could not be fetched. */
  via?: string;
  checked: string;
}

export const MEMBER_NAMES: Readonly<Record<string, MemberNameSource>> = {
  B001307: {
    name: 'Jim Baird',
    source: 'https://baird.house.gov/',
    checked: '2026-10-26',
  },
  B001300: {
    name: 'Nanette Barragán',
    source: 'https://barragan.house.gov/about',
    checked: '2026-10-26',
  },
  B001323: {
    name: 'Nick Begich',
    source: 'https://begich.house.gov/',
    checked: '2026-10-26',
  },
  B001292: {
    name: 'Don Beyer',
    source: 'https://beyer.house.gov/',
    checked: '2026-10-26',
  },
  B001327: {
    name: 'Rob Bresnahan',
    source: 'https://bresnahan.house.gov/',
    checked: '2026-10-26',
  },
  C001123: {
    name: 'Gil Cisneros',
    source: 'https://cisneros.house.gov/',
    checked: '2026-10-26',
  },
  C001136: {
    name: 'Herb Conaway',
    source: 'https://conaway.house.gov/',
    checked: '2026-10-26',
  },
  C001088: {
    name: 'Chris Coons',
    source: 'https://www.coons.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.coons.senate.gov/',
    checked: '2026-10-26',
  },
  C001110: {
    name: 'Lou Correa',
    source: 'https://correa.house.gov/',
    checked: '2026-10-26',
  },
  C001132: {
    name: 'Eli Crane',
    source: 'https://crane.house.gov/',
    checked: '2026-10-26',
  },
  D000230: {
    name: 'Don Davis',
    source: 'https://dondavis.house.gov/about',
    checked: '2026-10-26',
  },
  D000530: {
    name: 'Chris Deluzio',
    source: 'https://deluzio.house.gov/about',
    checked: '2026-10-26',
  },
  V000133: {
    name: 'Jefferson Van Drew',
    source: 'https://vandrew.house.gov/',
    checked: '2026-10-26',
  },
  D000563: {
    name: 'Dick Durbin',
    source: 'https://www.durbin.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.durbin.senate.gov/',
    checked: '2026-10-26',
  },
  D000600: {
    name: 'Mario Díaz-Balart',
    source: 'https://mariodiazbalart.house.gov/',
    checked: '2026-10-26',
  },
  L000273: {
    name: 'Teresa Leger Fernández',
    source: 'https://fernandez.house.gov/',
    checked: '2026-10-26',
  },
  G000593: {
    name: 'Carlos Gimenez',
    source: 'https://gimenez.house.gov/',
    checked: '2026-10-26',
  },
  G000599: {
    name: 'Daniel Goldman',
    source: 'https://goldman.house.gov/',
    checked: '2026-10-26',
  },
  J000312: {
    name: 'Jim Justice',
    source: 'https://www.justice.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.justice.senate.gov/',
    checked: '2026-10-26',
  },
  K000375: {
    name: 'Bill Keating',
    source: 'https://keating.house.gov/',
    checked: '2026-10-26',
  },
  K000402: {
    name: 'Timothy Kennedy',
    source: 'https://kennedy.house.gov/',
    checked: '2026-10-26',
  },
  K000399: {
    name: 'Jen Kiggans',
    source: 'https://kiggans.house.gov/',
    checked: '2026-10-26',
  },
  L000600: {
    name: 'Nick Langworthy',
    source: 'https://langworthy.house.gov/',
    checked: '2026-10-26',
  },
  L000566: {
    name: 'Bob Latta',
    source: 'https://latta.house.gov/',
    checked: '2026-10-26',
  },
  L000599: {
    name: 'Mike Lawler',
    source: 'https://lawler.house.gov/',
    checked: '2026-10-26',
  },
  M001218: {
    name: 'Rich McCormick',
    source: 'https://mccormick.house.gov/about',
    checked: '2026-10-26',
  },
  M001243: {
    name: 'Dave McCormick',
    source: 'https://www.mccormick.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.mccormick.senate.gov/',
    checked: '2026-10-26',
  },
  M001226: {
    name: 'Rob Menendez',
    source: 'https://menendez.house.gov/',
    checked: '2026-10-26',
  },
  M001204: {
    name: 'Dan Meuser',
    source: 'https://meuser.house.gov/',
    checked: '2026-10-26',
  },
  M001210: {
    name: 'Greg Murphy',
    source: 'https://murphy.house.gov/',
    checked: '2026-10-26',
  },
  M001169: {
    name: 'Chris Murphy',
    source: 'https://www.murphy.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.murphy.senate.gov/',
    checked: '2026-10-26',
  },
  N000002: {
    name: 'Jerry Nadler',
    source: 'https://nadler.house.gov/',
    checked: '2026-10-26',
  },
  N000193: {
    name: 'Zach Nunn',
    source: 'https://nunn.house.gov/',
    checked: '2026-10-26',
  },
  O000175: {
    name: 'Andy Ogles',
    source: 'https://ogles.house.gov/about',
    checked: '2026-10-26',
  },
  O000177: {
    name: 'Bob Onder',
    source: 'https://onder.house.gov/',
    checked: '2026-10-26',
  },
  R000584: {
    name: 'James Risch',
    source: 'https://www.risch.senate.gov/',
    via: 'https://web.archive.org/web/20261017/https://www.risch.senate.gov/',
    checked: '2026-10-26',
  },
  R000579: {
    name: 'Pat Ryan',
    source: 'https://patryan.house.gov/',
    checked: '2026-10-26',
  },
  S000168: {
    name: 'María Elvira Salazar',
    source: 'https://salazar.house.gov/',
    checked: '2026-10-26',
  },
  S001214: {
    name: 'Greg Steube',
    source: 'https://steube.house.gov/about',
    checked: '2026-10-26',
  },
  S001201: {
    name: 'Thomas Suozzi',
    source: 'https://suozzi.house.gov/',
    checked: '2026-10-26',
  },
  S001223: {
    name: 'Emilia Sykes',
    source: 'https://sykes.house.gov/',
    checked: '2026-10-26',
  },
  T000165: {
    name: 'Tom Tiffany',
    source: 'https://tiffany.house.gov/',
    checked: '2026-10-26',
  },
  T000463: {
    name: 'Mike Turner',
    source: 'https://turner.house.gov/',
    checked: '2026-10-26',
  },
  V000138: {
    name: 'Eugene Vindman',
    source: 'https://vindman.house.gov/',
    checked: '2026-10-26',
  },
  W000804: {
    name: 'Rob Wittman',
    source: 'https://wittman.house.gov/',
    checked: '2026-10-26',
  },
};
