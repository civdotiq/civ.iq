/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  inOfficeSince,
  normalizeGovernorParty,
  parseNgaDate,
  parseNgaGovernorPage,
  parseNgaIndex,
} from '@/lib/data-sources/state-governors/parse-nga';

// Markup copied from nga.org/governors/ and nga.org/governors/texas/ (2026-10-01).
const INDEX = `
<ul>
                  <li class="current-governors__item">
            <div class="current-governors__wrapper">
              <a
                href="https://www.nga.org/governors/new-hampshire/"
                target="_blank"
              >
                <div class="current-governors__item__image">
                  <img decoding="async" src="https://www.nga.org/wp-content/uploads/2025/01/ayotte.jpg" alt="Kelly Ayotte" />
                </div>
                <div class="current-governors__item__link">
                  <small class="state">New Hampshire</small>
                  Gov. Kelly Ayotte                </div>
              </a>
            </div>
          </li>
                  <li class="current-governors__item">
            <div class="current-governors__wrapper">
              <a
                href="https://www.nga.org/governors/american-samoa/"
                target="_blank"
              >
                <div class="current-governors__item__link">
                  <small class="state">American Samoa</small>
                  Gov. Pula&#8217;ali&#8217;i Nikolao Pula                </div>
              </a>
            </div>
          </li>
</ul>`;

const TEXAS = `
  <li class="item">
            <label class="label">Terms</label>
                          January 20, 2015 - January 7, 2019<br/>January 8, 2019 - January 17, 2023<br/>January 17, 2023 - Current                      </li>
                  <li class="item">
            <label class="label">Party</label>
                          Republican                      </li>
                  <li class="item">
            <label class="label">Born</label>
                          November 13, 1957                      </li>
  <h4 class="title">Additional Information</h4>
    <ul>
                      <li class="item">
          <i class="fas fa-link"></i>
          <a href="http://gov.texas.gov/">Governor&#039;s Website</a>
        </li>
                      <li class="item">
          <i class="fas fa-link"></i>
          <a href="https://www.texas.gov/">State Website</a>
        </li>
    </ul>`;

describe('parseNgaIndex', () => {
  it('reads state, name without "Gov." and detail URL', () => {
    expect(parseNgaIndex(INDEX)).toEqual([
      {
        stateName: 'New Hampshire',
        name: 'Kelly Ayotte',
        url: 'https://www.nga.org/governors/new-hampshire/',
      },
      {
        stateName: 'American Samoa',
        name: 'Pula’ali’i Nikolao Pula',
        url: 'https://www.nga.org/governors/american-samoa/',
      },
    ]);
  });
});

describe('parseNgaGovernorPage', () => {
  const tx = parseNgaGovernorPage(TEXAS);

  it('reads party, every term and the governor website (not the state site)', () => {
    expect(tx.party).toBe('Republican');
    expect(tx.terms).toEqual([
      { start: '2015-01-20', end: '2019-01-07' },
      { start: '2019-01-08', end: '2023-01-17' },
      { start: '2023-01-17', end: null },
    ]);
    expect(tx.website).toBe('http://gov.texas.gov/');
  });

  it('returns nulls and no terms when the fields are missing', () => {
    expect(parseNgaGovernorPage('<html></html>')).toEqual({
      party: null,
      terms: [],
      website: null,
    });
  });
});

describe('inOfficeSince', () => {
  it('walks back through abutting terms', () => {
    expect(inOfficeSince(tx())).toBe('2015-01-20');
  });

  it('stops at a gap in service', () => {
    expect(
      inOfficeSince([
        { start: '2011-01-03', end: '2015-01-05' },
        { start: '2019-01-07', end: null },
      ])
    ).toBe('2019-01-07');
  });

  it('is null without a current term', () => {
    expect(inOfficeSince([{ start: '2017-01-05', end: '2025-01-09' }])).toBeNull();
  });

  function tx() {
    return parseNgaGovernorPage(TEXAS).terms;
  }
});

describe('helpers', () => {
  it('parses NGA dates', () => {
    expect(parseNgaDate('January 9, 2025')).toBe('2025-01-09');
    expect(parseNgaDate('Current')).toBeNull();
  });

  it('normalizes "Democrat" to "Democratic"', () => {
    expect(normalizeGovernorParty('Democrat')).toBe('Democratic');
    expect(normalizeGovernorParty('Republican')).toBe('Republican');
    expect(normalizeGovernorParty(null)).toBeNull();
  });
});
