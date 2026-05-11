'use client';

import { useId, useState, type FormEvent } from 'react';

/**
 * CqAskInput — single-shot question composer for the /ask entry surface.
 *
 * v1 carve-out: this input is design-coherence, NOT a working query engine.
 * CIV.IQ does not have a free-form NLP layer yet — the answer surface routes
 * by template slug + entity ID. Submit routes the user back to /ask with a
 * `?q=` parameter so the typed text survives, but the primary affordance on
 * /ask is the "Suggested questions" grid below this input. When (and only
 * when) an NLP entity-resolver ships, this component swaps its handler.
 */

interface CqAskInputProps {
  initialValue?: string;
  placeholder?: string;
  /**
   * Target URL the form submits to. Defaults to /ask. The submitted text is
   * appended as `?q=<text>` so the entry page can echo it back.
   */
  action?: string;
}

export function CqAskInput({
  initialValue = '',
  placeholder = 'Ask a question about an official, bill, industry, or topic.',
  action = '/ask',
}: CqAskInputProps) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const hasValue = value.trim().length > 0;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Native form submission handles navigation. Keeping this here for the
    // future NLP swap — when an entity resolver ships, intercept here.
    if (!hasValue) {
      e.preventDefault();
    }
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={handleSubmit}
      style={{
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
      }}
    >
      <div style={{ padding: '18px 22px' }}>
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Question
        </label>
        <input
          id={inputId}
          name="q"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="true"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-primary)',
            fontSize: 22,
            lineHeight: 1.35,
            color: 'var(--fg1)',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            padding: 0,
            minHeight: 32,
          }}
        />
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>One question per submission · No multi-turn</span>
          <span aria-hidden="true" style={{ color: 'var(--fg4)' }}>
            ·
          </span>
          <span>Returns 1 answer with sources</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={!hasValue}
        aria-label="Submit question"
        style={{
          background: 'var(--fg1)',
          color: 'var(--bg1)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: hasValue ? 'pointer' : 'not-allowed',
          opacity: hasValue ? 1 : 0.6,
          fontFamily: 'var(--font-primary)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderLeft: '2px solid var(--ink)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
        }}
      >
        Submit
        <span aria-hidden="true" style={{ fontSize: 18 }}>
          →
        </span>
      </button>
    </form>
  );
}
