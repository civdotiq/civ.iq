# Committee chair bug — investigation note

## Layer

**Our parsing** (`src/lib/services/committee.service.ts`). Upstream data is clean.

Verified against `committee-membership-current.yaml` from congress-legislators:

- HSIF has exactly one `title: Chair` (Brett Guthrie, rank 1) and one `title: Vice Chair` (Neal Dunn, rank 8).
- No past-chair / unended-term artifacts in the upstream file.

## Root cause

Two twin bugs in role normalization, both in `fetchCommitteeFromCongressLegislators`:

1. `role.includes('Chair') && !role.includes('Ranking')` — matches `"Vice Chair"`. So Vice Chairs get stamped `role: 'Chair'` in the member list.
2. `title.includes('chair') && !title.includes('ranking')` — same logic for leadership assignment. As iteration proceeds, the Vice Chair overwrites `leadership.chair`, leaving Neal Dunn in the pod.

## Scope

**49 committees/subcommittees** are affected — every committee with a Vice Chair. Verified by parsing the full YAML. Examples in scope: HSIF, HSAG, HSAP, HSPW, HSII, HSHM, HLIG, JSTX, SLIA, SLIN, SLET, and all their numbered subcommittees.

HSJU (Judiciary) is NOT affected — no Vice Chair in upstream data, so no collision. That's why the bug doesn't surface there.

One data-layer oddity outside this fix: SCNC has two upstream `title: Chairman` entries (Cornyn and Whitehouse). That's a real co-chair arrangement in the yaml, not our bug.

## Smallest-diff fix

Reorder the ternary and the leadership assignment so `Vice` is checked before `Chair`:

```ts
// role normalization — was: Chair → Ranking → Vice → Member
// now: Ranking → Vice → Chair → Member
const lower = (memberCommittee.title || '').toLowerCase();
const normalizedRole = lower.includes('ranking')
  ? 'Ranking Member'
  : lower.includes('vice')
    ? 'Vice Chair'
    : lower.includes('chair')
      ? 'Chair'
      : 'Member';
```

Same reordering for the `leadership.chair / leadership.rankingMember` assignment block. No structural changes, no new helpers.
