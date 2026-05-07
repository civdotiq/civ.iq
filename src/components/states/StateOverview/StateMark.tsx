/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface StateMarkProps {
  abbr: string;
  size?: number;
}

export function StateMark({ abbr, size = 160 }: StateMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        backgroundImage: 'repeating-linear-gradient(45deg, var(--bg2) 0 8px, var(--bg3) 8px 16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'var(--civiq-blue)',
        }}
      />
      <div
        style={{
          fontSize: Math.round(size * 0.45),
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: 'var(--fg1)',
        }}
      >
        {abbr}
      </div>
    </div>
  );
}
