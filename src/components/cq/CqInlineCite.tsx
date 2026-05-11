/**
 * CqInlineCite — superscript-style numbered citation marker rendered inline
 * in answer prose. Anchors to `#cite-<n>` in the citation rail below.
 *
 * NOTE — v1 carve-out: this primitive ships built but UNUSED inside the live
 * answer pods (CampaignContributionsAnswer, VotingRecordAnswer, etc.). Those
 * pods render structured typed data, not generated prose, and the underlying
 * records do not expose per-claim provenance. Fabricating per-sentence
 * numbering against pod data would be dishonest design.
 *
 * The honest mapping is: typed pod body in the middle, source rail below.
 * CqInlineCite is reserved for a future LLM-synthesis surface where each
 * sentence really does map to an extractive quote.
 */

interface CqInlineCiteProps {
  n: number;
}

export function CqInlineCite({ n }: CqInlineCiteProps) {
  return (
    <a
      href={`#cite-${n}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        marginLeft: 2,
        marginRight: 1,
        verticalAlign: '2px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--civiq-blue)',
        border: '1px solid var(--civiq-blue)',
        background: 'var(--bg1)',
        textDecoration: 'none',
        letterSpacing: '-0.02em',
      }}
    >
      {n}
    </a>
  );
}
