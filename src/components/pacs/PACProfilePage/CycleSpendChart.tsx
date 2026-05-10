/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Hand-drawn cycle-by-cycle raise + disburse chart for the PAC profile.
 *
 * Replaces the reference's quarterly chart: quarterly data needs Form
 * 3X parsing we do not have. The 5-cycle aggregate (2018, 2020, 2022,
 * 2024, 2026) comes from /committee/{id}/totals/. Side-by-side bars
 * per cycle, raised in civiq-blue and disbursed in ink. Per the
 * design rules, no chart library — inline SVG geometry tuned to the
 * reference's visual language.
 */

import { useMemo } from 'react';
import type { CycleRow } from './types';

interface CycleSpendChartProps {
  cycles: CycleRow[];
}

const SVG_W = 1212;
const SVG_H = 220;
const PADDING_X = 50;
const PADDING_BOTTOM = 40;
const PADDING_TOP = 40;

export function CycleSpendChart({ cycles }: CycleSpendChartProps) {
  const { gridTicks, max } = useMemo(() => computeScale(cycles), [cycles]);
  const drawableH = SVG_H - PADDING_TOP - PADDING_BOTTOM;
  const usableW = SVG_W - PADDING_X - 20;
  const groupW = cycles.length > 0 ? usableW / cycles.length : 0;

  if (!cycles.length) return null;
  const allEmpty = cycles.every(c => !c.hasData || (c.raised === 0 && c.disbursed === 0));

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: '100%' }}
      role="img"
      aria-label="Cycle by cycle raised and disbursed"
    >
      {/* Y gridlines */}
      {gridTicks.map(v => {
        const y = SVG_H - PADDING_BOTTOM - (v / max) * drawableH;
        return (
          <g key={v}>
            <line x1={PADDING_X} x2={SVG_W - 20} y1={y} y2={y} stroke="var(--line)" />
            <text
              x={10}
              y={y + 4}
              fontSize={10}
              fill="var(--fg3)"
              fontFamily="var(--font-mono)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTick(v)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {cycles.map((c, i) => {
        const x = PADDING_X + i * groupW;
        const halfW = (groupW - 16) / 2;
        const raisedH = max > 0 ? (c.raised / max) * drawableH : 0;
        const disbursedH = max > 0 ? (c.disbursed / max) * drawableH : 0;
        const yRaised = SVG_H - PADDING_BOTTOM - raisedH;
        const yDisb = SVG_H - PADDING_BOTTOM - disbursedH;
        return (
          <g key={c.cycle}>
            <rect x={x + 8} y={yRaised} width={halfW} height={raisedH} fill="var(--civiq-blue)" />
            <rect
              x={x + 8 + halfW + 2}
              y={yDisb}
              width={halfW}
              height={disbursedH}
              fill="var(--ink)"
            />
            <text
              x={x + groupW / 2}
              y={SVG_H - 18}
              fontSize={11}
              fontWeight={700}
              fill="var(--fg1)"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {c.cycle}
            </text>
            {!c.hasData && (
              <text
                x={x + groupW / 2}
                y={SVG_H - 4}
                fontSize={9}
                fill="var(--fg3)"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                No filings
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${PADDING_X}, 14)`}>
        <rect x={0} y={0} width={10} height={10} fill="var(--civiq-blue)" />
        <text x={16} y={9} fill="var(--fg1)" fontSize={11} fontWeight={700}>
          RAISED
        </text>
        <rect x={90} y={0} width={10} height={10} fill="var(--ink)" />
        <text x={106} y={9} fill="var(--fg1)" fontSize={11} fontWeight={700}>
          DISBURSED
        </text>
      </g>

      {allEmpty && (
        <text
          x={SVG_W / 2}
          y={SVG_H / 2 + 6}
          textAnchor="middle"
          fontSize={12}
          fill="var(--fg3)"
          fontFamily="var(--font-mono)"
        >
          No FEC totals filed in any of the last five cycles
        </text>
      )}
    </svg>
  );
}

function computeScale(cycles: CycleRow[]): { gridTicks: number[]; max: number } {
  const peak = Math.max(0, ...cycles.flatMap(c => [c.raised, c.disbursed]));
  if (peak === 0) return { gridTicks: [0], max: 1 };
  const niceMax = roundUpToNice(peak);
  const ticks: number[] = [];
  for (let i = 1; i <= 5; i++) ticks.push((niceMax / 5) * i);
  return { gridTicks: ticks, max: niceMax };
}

function roundUpToNice(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const norm = n / base;
  let factor: number;
  if (norm <= 1) factor = 1;
  else if (norm <= 2) factor = 2;
  else if (norm <= 5) factor = 5;
  else factor = 10;
  return factor * base;
}

function formatTick(n: number): string {
  if (n === 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
