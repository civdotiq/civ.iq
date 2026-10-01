/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StateOverviewServerSections } from '@/components/states/LegacyStateOverview/StateOverviewServerSections';
import type { StateHubData, HubChamber } from '@/lib/state-hub/load-state-hub';
import type { StateOverviewServerData } from '@/lib/state-overview/load-state-overview';

function chamber(over: Partial<HubChamber>): HubChamber {
  return {
    key: 'upper',
    name: 'Senate',
    roleTitle: 'State Senator',
    seats: 40,
    termYears: 4,
    members: [],
    partyCounts: [],
    hasMultiMemberDistricts: false,
    ...over,
  };
}

function hub(over: Partial<StateHubData>): StateHubData {
  return {
    stateCode: 'CA',
    stateName: 'California',
    legislatureName: 'California State Legislature',
    copy: {} as StateHubData['copy'],
    chambers: [
      chamber({ key: 'upper', name: 'Senate', seats: 40 }),
      chamber({ key: 'lower', name: 'Assembly', roleTitle: 'Assemblymember', seats: 80 }),
    ],
    memberCount: 120,
    unicameral: false,
    website: null,
    capitolCity: null,
    nextElectionYear: 2026,
    rosterAsOf: null,
    ...over,
  };
}

const DATA: StateOverviewServerData = {
  chiefExecutive: {
    title: 'Governor',
    name: 'Gavin Newsom',
    party: 'Democratic',
    inOfficeSince: '2019-01-07',
    website: 'https://www.gov.ca.gov/',
    sourceUrl: 'https://www.nga.org/governors/california/',
  },
  senators: [
    {
      bioguideId: 'P000145',
      name: 'Alex Padilla',
      party: 'Democrat',
      role: 'Senator',
      district: null,
    },
  ],
  houseMembers: [
    {
      bioguideId: 'L000578',
      name: 'Doug LaMalfa',
      party: 'Republican',
      role: 'Representative',
      district: '1',
    },
  ],
  delegationAvailable: true,
  demographics: null,
};

describe('StateOverviewServerSections', () => {
  it('writes a factual summary with correct articles', () => {
    render(
      <StateOverviewServerSections
        stateCode="CA"
        stateName="California"
        data={DATA}
        hub={hub({})}
      />
    );
    expect(
      screen.getByText(
        'The governor of California is Gavin Newsom (Democratic), in office since January 2019. ' +
          'In Congress, California is represented by 1 U.S. senator and 1 representative. ' +
          'The California State Legislature has a 40-seat Senate and an 80-seat Assembly. ' +
          'The next regular legislative election is in 2026.'
      )
    ).toBeInTheDocument();
  });

  it('links every member of Congress to their profile', () => {
    render(
      <StateOverviewServerSections stateCode="CA" stateName="California" data={DATA} hub={null} />
    );
    expect(screen.getByRole('link', { name: 'Alex Padilla' })).toHaveAttribute(
      'href',
      '/representative/P000145'
    );
    expect(screen.getByRole('link', { name: 'Doug LaMalfa' })).toHaveAttribute(
      'href',
      '/representative/L000578'
    );
  });

  it('names DC with "the" and its mayor and delegate', () => {
    const dc: StateOverviewServerData = {
      ...DATA,
      chiefExecutive: { ...DATA.chiefExecutive!, title: 'Mayor', name: 'Muriel Bowser' },
      senators: [],
      houseMembers: [
        {
          bioguideId: 'N000147',
          name: 'Eleanor Holmes Norton',
          party: 'Democrat',
          role: 'Delegate',
          district: '0',
        },
      ],
    };
    render(
      <StateOverviewServerSections
        stateCode="DC"
        stateName="District of Columbia"
        data={dc}
        hub={null}
      />
    );
    expect(
      screen.getByText(/^The mayor of the District of Columbia is Muriel Bowser/)
    ).toHaveTextContent(
      'In Congress, the District of Columbia is represented by a non-voting delegate.'
    );
    expect(
      screen.getByRole('heading', { name: 'Mayor of the District of Columbia' })
    ).toBeInTheDocument();
  });

  it('hides the delegation when the roster was unavailable', () => {
    render(
      <StateOverviewServerSections
        stateCode="CA"
        stateName="California"
        data={{ ...DATA, senators: [], houseMembers: [], delegationAvailable: false }}
        hub={null}
      />
    );
    expect(
      screen.queryByRole('heading', { name: 'California in Congress' })
    ).not.toBeInTheDocument();
  });

  it('says "two chambers" when a seat count is unknown', () => {
    const pr = hub({
      stateCode: 'PR',
      legislatureName: 'Legislative Assembly of Puerto Rico',
      chambers: [
        chamber({ key: 'upper', name: 'Senate', seats: null }),
        chamber({ key: 'lower', name: 'House of Representatives', seats: null }),
      ],
      nextElectionYear: null,
    });
    render(
      <StateOverviewServerSections
        stateCode="PR"
        stateName="Puerto Rico"
        data={{ ...DATA, chiefExecutive: null }}
        hub={pr}
      />
    );
    expect(
      screen.getByText(/has two chambers, the Senate and the House of Representatives\.$/)
    ).toBeInTheDocument();
  });
});
