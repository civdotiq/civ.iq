/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  MembersByState,
  groupMembersByState,
} from '@/features/representatives/components/MembersByState';

const members = [
  { bioguideId: 'T000488', name: 'Shri Thanedar', state: 'MI', district: '13', chamber: 'House' },
  { bioguideId: 'S001208', name: 'Elissa Slotkin', state: 'MI', chamber: 'Senate' },
  { bioguideId: 'D000624', name: 'Debbie Dingell', state: 'MI', district: '6', chamber: 'House' },
  { bioguideId: 'P000610', name: 'Gary Peters', state: 'MI', chamber: 'Senate' },
  { bioguideId: 'B001323', name: 'Nick Begich', state: 'AK', district: '0', chamber: 'House' },
  {
    bioguideId: 'H001103',
    name: 'Pablo José Hernández',
    state: 'PR',
    district: '0',
    chamber: 'House',
    role: 'Resident Commissioner',
  },
] as const;

describe('groupMembersByState', () => {
  it('orders states by name, senators first, then House seats by district', () => {
    const groups = groupMembersByState([...members]);
    expect(groups.map(g => g.stateName)).toEqual(['Alaska', 'Michigan', 'Puerto Rico']);
    expect(groups[1]!.members.map(m => m.name)).toEqual([
      'Elissa Slotkin',
      'Gary Peters',
      'Debbie Dingell',
      'Shri Thanedar',
    ]);
  });
});

describe('MembersByState', () => {
  it('links every member and every state, with a seat label', () => {
    render(<MembersByState representatives={[...members]} />);
    expect(screen.getByRole('link', { name: 'Debbie Dingell' })).toHaveAttribute(
      'href',
      '/representative/D000624'
    );
    expect(screen.getByRole('link', { name: 'Michigan' })).toHaveAttribute('href', '/states/mi');
    expect(screen.getAllByRole('link')).toHaveLength(members.length + 3);
    expect(screen.getByText('District 6')).toBeInTheDocument();
    expect(screen.getByText('At-Large')).toBeInTheDocument();
    expect(screen.getByText('Resident Commissioner')).toBeInTheDocument();
    expect(screen.getByText(/6 current members/)).toBeInTheDocument();
  });

  it('renders nothing when the member list is empty', () => {
    const { container } = render(<MembersByState representatives={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
