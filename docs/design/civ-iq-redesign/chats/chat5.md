# Claude Code Integration

_Started 2026-04-28 21:36 UTC_

---

## User

How do we get these designs into Claude Code without breaking our project in Claude Code?

## Assistant

I'll take a quick look at what's in the project so my answer is grounded in your actual setup.

_[tool: list_files]_

_[tool: list_files]_

Here's a clean handoff path that keeps your Claude Code project safe.

## The short answer

Use the **"Handoff to Claude Code"** export — it bundles your designs into a self-contained reference package your dev agent can read _as inspiration_, without copy-pasting prototype code straight into your repo.

## Why "don't break the project" is the real concern

Your `redesign/*.jsx` files are **prototype-grade**:

- They use Babel-in-the-browser (`<script type="text/babel">`) — your real app almost certainly uses a build step (Vite/Next/etc.)
- They share globals via `window` assignment — your app uses ES module imports
- They use pinned UMD React from unpkg — your app uses npm React
- They co-locate mock data (`data.jsx`) with components — your app has real data layers
- Style objects, primitives, and `chrome.jsx` are tuned for static artboards, not live routing

If you literally drop these files into your Claude Code repo, the build will break and Claude Code will spend its turn untangling prototype scaffolding instead of shipping the redesign.

## Recommended workflow

**1. Export a handoff package from here**
Run the _Handoff to Claude Code_ skill on this project. It produces a folder with the rendered HTML, screenshots, design tokens (`colors_and_type.css`), and notes — a read-only spec, not runnable code.

**2. Drop the package into your repo as a reference folder**
Something like `docs/design/civ-iq-redesign/` — outside `src/`, so no bundler picks it up. Commit it.

**3. Brief Claude Code with intent, not code**
Open Claude Code in that repo and say something like:

> "See `docs/design/civ-iq-redesign/`. Reimplement the Coverage page (`Coverage.html`) using **our existing components, routing, and data layer**. Match the visual design and information hierarchy. Do **not** import from the design files — they're prototype scaffolding. Use our design tokens from `<your tokens path>` and adapt the values in `colors_and_type.css` if any are missing."

**4. Migrate tokens first, components second, pages last**

- First PR: port any new color/type tokens from `colors_and_type.css` into your real token file. Review in isolation.
- Second PR: build/update primitives (buttons, cards, table rows) to match the redesign — using your stack.
- Third PR: assemble the actual pages (Coverage, Profile, etc.) on top of those primitives.

Small PRs = each one is reviewable and revertible.

**5. Keep the prototypes as the source of truth for _intent_**
When the implementation drifts or a question comes up ("what should the hover state look like?"), point Claude Code back at the HTML preview, not the JSX. The HTML renders correctly; the JSX is implementation-shaped but isn't your implementation.

## Things to explicitly tell Claude Code _not_ to do

- Don't add `@babel/standalone`, unpkg UMD React, or `<script type="text/babel">` to the repo
- Don't copy `chrome.jsx`, `primitives.jsx`, or `data.jsx` wholesale — re-derive against your stack
- Don't introduce `window.X = X` global sharing
- Don't import mock data into production routes

## If you want, I can do prep work now

A few things I can do in _this_ project to make the handoff smoother — say the word:

- **Generate the handoff package** (runs the skill end-to-end)
- **Write an `IMPLEMENTATION_NOTES.md`** that maps each redesign file → which real route/component it corresponds to in your codebase, with per-screen gotchas
- **Extract a clean `tokens.css`** from `colors_and_type.css` — just the variables, no prototype-only styles — so it's drop-in ready
- **Take pinned screenshots** of every screen + key states so the dev agent has unambiguous visual targets

Which of those would help most?

## User

All 4

## User

did it work?

## Assistant

No — the previous turn errored out before I did any of the four prep tasks. Nothing was generated. Let me start now.

_[tool: update_todos]_

_[tool: invoke_skill]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: snip]_

_[tool: grep]_

_[tool: grep]_
