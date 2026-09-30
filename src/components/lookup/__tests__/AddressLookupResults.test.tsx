/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddressLookupResults } from '../AddressLookupResults';
import type { UnifiedGeocodeResult } from '@/types/unified-geocode';
import type { StateMember } from '@/services/lookup/resolve-representatives.service';

function member(overrides: Partial<StateMember>): StateMember {
  return {
    id: 'ocd-person/00000000-0000-0000-0000-000000000001',
    name: 'Test Member',
    party: 'Democratic',
    district: '8',
    chamber: 'upper',
    atLarge: false,
    ...overrides,
  };
}

const detroit: UnifiedGeocodeResult = {
  success: true,
  matchedAddress: '20185 BRIARCLIFF RD, DETROIT, MI, 48221',
  districts: { federal: { state: 'MI', district: '13', districtId: 'MI-13' } },
  federalRepresentatives: [
    {
      bioguideId: 'P000595',
      name: 'Gary Peters',
      party: 'Democrat',
      state: 'MI',
      chamber: 'Senate',
      title: 'U.S. Senator',
      phone: '202-224-6221',
      contactForm: 'https://www.peters.senate.gov/contact/email-gary',
    },
    {
      bioguideId: 'T000488',
      name: 'Shri Thanedar',
      party: 'Democrat',
      state: 'MI',
      district: '13',
      chamber: 'House',
      title: 'U.S. Representative',
      phone: '202-225-5126',
    },
  ],
  stateSeats: [
    {
      censusChamber: 'upper',
      census: { geoid: '26008', number: '008', name: 'State Senate District 8' },
      districts: ['8'],
      members: [
        member({
          id: 'ocd-person/11111111-1111-1111-1111-111111111111',
          name: 'Mallory McMorrow',
          party: 'Democratic',
        }),
      ],
      status: 'found',
    },
  ],
};

describe('AddressLookupResults', () => {
  it('says what each level of office does, without ranking them', () => {
    render(<AddressLookupResults result={detroit} />);
    expect(screen.getByText(/write federal law and set the federal budget/)).toBeInTheDocument();
    expect(
      screen.getByText(/Michigan Legislature writes Michigan law, including the state budget/)
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your state legislators' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your state senator' })).toBeInTheDocument();
  });

  it('links each seat to the page describing its district', () => {
    render(<AddressLookupResults result={detroit} />);
    expect(screen.getByRole('link', { name: 'Michigan' })).toHaveAttribute('href', '/states/mi');
    expect(screen.getByRole('link', { name: 'Michigan’s 13th District' })).toHaveAttribute(
      'href',
      '/districts/MI-13'
    );
    expect(screen.getByRole('link', { name: 'District 8' })).toHaveAttribute(
      'href',
      '/state-districts/mi/upper/8'
    );
  });

  it('gives members of Congress a phone and contact form, and one party noun', () => {
    render(<AddressLookupResults result={detroit} />);
    const peters = screen.getByText('Gary Peters').closest('li');
    expect(peters).not.toBeNull();
    const card = within(peters as HTMLElement);
    expect(card.getByRole('link', { name: '202-224-6221' })).toHaveAttribute(
      'href',
      'tel:2022246221'
    );
    expect(card.getByRole('link', { name: 'Contact form' })).toHaveAttribute(
      'href',
      'https://www.peters.senate.gov/contact/email-gary'
    );
    const mcmorrow = screen.getByText('Mallory McMorrow').closest('li');
    expect(within(mcmorrow as HTMLElement).getByText('Democrat')).toBeInTheDocument();
    expect(screen.queryByText('Democratic')).not.toBeInTheDocument();
  });

  it('explains DC’s delegate and council, and does not link at-large seats', () => {
    const dc: UnifiedGeocodeResult = {
      success: true,
      matchedAddress: '1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500',
      districts: { federal: { state: 'DC', district: '98', districtId: 'DC-98' } },
      federalRepresentatives: [
        {
          bioguideId: 'N000147',
          name: 'Eleanor Norton',
          party: 'Democrat',
          state: 'DC',
          district: '0',
          chamber: 'House',
          title: 'U.S. Representative',
        },
      ],
      stateSeats: [
        {
          censusChamber: 'upper',
          census: { geoid: '11002', number: '002', name: 'Ward 2' },
          districts: ['Ward 2'],
          members: [
            member({ name: 'Ward Member', district: 'Ward 2', chamber: 'lower' }),
            member({
              id: 'ocd-person/22222222-2222-2222-2222-222222222222',
              name: 'At-Large Member',
              district: 'At-Large',
              chamber: 'lower',
              atLarge: true,
            }),
          ],
          status: 'found',
        },
      ],
    };
    render(<AddressLookupResults result={dc} />);
    expect(
      screen.getByText(
        /The District of Columbia has no senators, and its delegate can vote in committee/
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Senators also confirm/)).not.toBeInTheDocument();
    expect(screen.getByText(/Delegate/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See every DC councilmember' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'the District of Columbia' })).toHaveAttribute(
      'href',
      '/districts/DC-AL'
    );
    expect(screen.getByRole('heading', { name: 'Your councilmembers' })).toBeInTheDocument();
    expect(screen.getByText(/Congress reviews every District law/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ward 2' })).toHaveAttribute(
      'href',
      '/state-districts/dc/lower/Ward 2'
    );
    expect(screen.queryByRole('link', { name: 'At-Large' })).not.toBeInTheDocument();
  });
});
