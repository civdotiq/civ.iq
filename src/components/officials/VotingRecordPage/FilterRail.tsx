/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { CqLabel } from '@/components/cq';
import type { FilterState, VoteCategory, VotePosition } from './types';
import { INITIAL_FILTERS } from './types';

interface FilterRailProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  availableCategories: VoteCategory[];
  availableYears: string[];
  loaded: number;
  matched: number;
}

const POSITION_OPTIONS: Array<VotePosition | 'All'> = [
  'All',
  'Yea',
  'Nay',
  'Present',
  'Not Voting',
];

const RESULT_OPTIONS: Array<FilterState['result']> = ['All', 'Passed', 'Failed'];
const KEYVOTE_OPTIONS: Array<FilterState['keyVote']> = ['All', 'Key', 'Routine'];

export function FilterRail({
  filters,
  onChange,
  availableCategories,
  availableYears,
  loaded,
  matched,
}: FilterRailProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const hasActive = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS);

  return (
    <aside
      aria-label="Vote filters"
      style={{
        border: '2px solid var(--ink)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        position: 'sticky',
        top: 16,
        alignSelf: 'flex-start',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 8,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <CqLabel>Filter votes</CqLabel>
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange(INITIAL_FILTERS)}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Reset
          </button>
        )}
      </header>

      <FilterGroup
        label="Chamber"
        value={filters.position === 'All' ? 'All chambers' : 'Filtered by position'}
        readOnly
      />

      <FilterGroup label="Topic">
        <SelectControl
          value={filters.category}
          onChange={v => update('category', v as FilterState['category'])}
          options={['All', ...availableCategories]}
        />
      </FilterGroup>

      <FilterGroup label="Vote">
        <SelectControl
          value={filters.position}
          onChange={v => update('position', v as FilterState['position'])}
          options={POSITION_OPTIONS}
        />
      </FilterGroup>

      <FilterGroup label="Outcome">
        <SelectControl
          value={filters.result}
          onChange={v => update('result', v as FilterState['result'])}
          options={RESULT_OPTIONS}
        />
      </FilterGroup>

      <FilterGroup label="Year">
        <SelectControl
          value={filters.year}
          onChange={v => update('year', v as FilterState['year'])}
          options={['All', ...availableYears]}
        />
      </FilterGroup>

      <FilterGroup label="Key vote">
        <SelectControl
          value={filters.keyVote}
          onChange={v => update('keyVote', v as FilterState['keyVote'])}
          options={KEYVOTE_OPTIONS}
        />
      </FilterGroup>

      <footer
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {matched.toLocaleString('en-US')} of {loaded.toLocaleString('en-US')} loaded
      </footer>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
  value,
  readOnly = false,
}: {
  label: string;
  children?: React.ReactNode;
  value?: string;
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <CqLabel>{label}</CqLabel>
      {readOnly ? (
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            padding: '6px 8px',
            border: '1px solid var(--line)',
            background: 'var(--bg2)',
          }}
        >
          {value ?? '—'}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function SelectControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly T[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      style={{
        width: '100%',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        padding: '6px 8px',
        border: '1px solid var(--ink)',
        borderRadius: 'var(--radius-interactive)',
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        cursor: 'pointer',
      }}
    >
      {options.map(opt => (
        <option key={String(opt)} value={String(opt)}>
          {String(opt)}
        </option>
      ))}
    </select>
  );
}
