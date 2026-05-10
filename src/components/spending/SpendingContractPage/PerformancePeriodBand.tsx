/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Hand-drawn period-of-performance band. No chart library — inline SVG
 * tuned to the Aicher language. Renders a horizontal time line between
 * `start` and `end` with a "today" tick when the current date falls
 * inside the period. Date labels use tabular-nums.
 */

import { formatDateShort, periodElapsedPct } from './data';

interface PerformancePeriodBandProps {
  start: string | null;
  end: string | null;
  potentialEnd?: string | null;
}

const SVG_W = 960;
const SVG_H = 96;
const PAD_X = 60;
const LINE_Y = 56;

export function PerformancePeriodBand({ start, end, potentialEnd }: PerformancePeriodBandProps) {
  if (!start && !end) return null;
  const elapsed = periodElapsedPct(start, end);
  const showToday = elapsed > 0 && elapsed < 100;
  const todayX = PAD_X + ((SVG_W - PAD_X * 2) * elapsed) / 100;
  const drawableEnd = SVG_W - PAD_X;

  const optionExtension =
    potentialEnd && end && new Date(potentialEnd).getTime() > new Date(end).getTime();

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Period of performance"
    >
      <line
        x1={PAD_X}
        x2={drawableEnd}
        y1={LINE_Y}
        y2={LINE_Y}
        stroke="var(--ink)"
        strokeWidth={2}
      />
      {/* Start tick */}
      <line
        x1={PAD_X}
        x2={PAD_X}
        y1={LINE_Y - 12}
        y2={LINE_Y + 12}
        stroke="var(--ink)"
        strokeWidth={2}
      />
      <text
        x={PAD_X}
        y={LINE_Y - 18}
        textAnchor="start"
        fontFamily="var(--font-mono)"
        fontSize={11}
        fill="var(--fg2)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        START
      </text>
      <text
        x={PAD_X}
        y={LINE_Y + 28}
        textAnchor="start"
        fontFamily="var(--font-mono)"
        fontSize={12}
        fontWeight={700}
        fill="var(--fg1)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatDateShort(start)}
      </text>

      {/* End tick */}
      <line
        x1={drawableEnd}
        x2={drawableEnd}
        y1={LINE_Y - 12}
        y2={LINE_Y + 12}
        stroke="var(--ink)"
        strokeWidth={2}
      />
      <text
        x={drawableEnd}
        y={LINE_Y - 18}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize={11}
        fill="var(--fg2)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {optionExtension ? 'CURRENT END' : 'END'}
      </text>
      <text
        x={drawableEnd}
        y={LINE_Y + 28}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize={12}
        fontWeight={700}
        fill="var(--fg1)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatDateShort(end)}
      </text>

      {/* Today tick */}
      {showToday && (
        <g>
          <line
            x1={todayX}
            x2={todayX}
            y1={LINE_Y - 16}
            y2={LINE_Y + 16}
            stroke="var(--civiq-blue)"
            strokeWidth={3}
          />
          <text
            x={todayX}
            y={LINE_Y - 22}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={10}
            fontWeight={700}
            fill="var(--civiq-blue)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            TODAY · {elapsed}%
          </text>
        </g>
      )}
    </svg>
  );
}
