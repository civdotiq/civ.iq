'use client';

interface SwapButtonProps {
  onSwap: () => void;
  disabled?: boolean;
}

export function SwapButton({ onSwap, disabled }: SwapButtonProps) {
  return (
    <button
      type="button"
      onClick={onSwap}
      disabled={disabled}
      aria-label="Swap left and right officials"
      title="Swap left and right"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 36,
        height: 36,
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        borderRadius: 'var(--radius-interactive)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        padding: 0,
      }}
    >
      <span aria-hidden="true">⇄</span>
    </button>
  );
}
