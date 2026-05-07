## High-Volume Browse Simplification Brief

This brief covers the next UX problem revealed by the current implementation:

- `Latest` can easily contain `300+` papers in a single day
- `Rising Signals` currently exposes up to `100` papers
- both pages still behave too much like long feeds

That is the wrong interaction model.

At this scale, these pages should help users decide where to look first, not ask them to manually read a giant list.

## Problem Statement

The current UI still assumes that users will browse a long result stream.

That breaks down when:

- one day can contain hundreds of papers
- `Hot / Rising Signals` can contain dozens to a hundred entries
- cards include summaries, tags, metadata, and rank cues at the same time

The result is high visual density and weak prioritization.

Users do not need “more papers on screen”.
Users need:

- a shortlist
- clear grouping
- visible reasons to care
- a way to expand only when they choose to

## Product Principle

Treat both pages as triage surfaces, not archive surfaces.

- `Latest` = “what was added recently, and where should I start?”
- `Rising Signals` = “what is most worth checking first?”

The full corpus can still exist behind:

- `Search`
- explicit “show more”
- deeper filtered views

But first paint should feel selective.

## Latest

### What should change

Do not dump the whole recent stream as the default reading mode.

Instead:

1. Show a compact daily overview first.
2. Show a curated first slice for the newest day.
3. Keep the rest collapsed behind explicit expansion.

### Recommended structure

#### Header summary

Add a small overview band above results:

- `Today: 326 papers`
- `Top fields: LLM, Vision, Agents, Multimodal`
- `Need the full catalog? Open Search`

This frames the scale immediately.

#### Default result strategy

For each day:

- show only the first `6` to `12` papers by default
- add a strong secondary action:
  - `View all 326 papers from today`
  - `Load 12 more`

Do not auto-render hundreds of cards below the fold.

#### Better day grouping

Use date sections more aggressively:

- `Today`
- `Yesterday`
- `Earlier this week`

For older sections:

- collapse by default
- show only count + CTA until expanded

#### Lighter cards in Latest

Default `Latest` cards should be lighter than search results:

- title
- authors
- 1 row of category/source/date metadata
- optional short summary only for featured items

Do not use full summary cards for every entry in a 300+ paper day.

### Filters

`Latest` should not expose the full raw taxonomy wall.

Preferred options:

- high-level field chips only
- top 6 to 10 popular buckets for the selected day range
- `More fields` opens the full filter drawer only on demand

If low-level category filtering must remain:

- hide it behind an expandable advanced filter panel

### Recommended user actions

The page should guide users toward 3 actions:

- skim the best few from today
- narrow to one field
- jump to broad search

If the page tries to support all exploration paths equally on first paint, it will stay heavy.

## Rising Signals

### What should change

Do not present `100` ranked papers as the default interpretation of this page.

Nobody wants a “top 100 hottest papers” feed as a first-pass UX.

This page should behave like a prioritized shortlist.

### Recommended structure

#### Shortlist first

Default output should be capped tightly:

- top `12` overall, or
- top `3` featured + `9` compact ranked rows

Everything after that should be progressive disclosure.

Suggested CTA:

- `Load 12 more`
- `View full ranking`

Do not render all `100` in full-card mode on first load.

#### Explain why these papers are here

Replace internal ranking language with plain-language framing.

Bad:

- `按热力分数排序`
- `Top papers by heat score`

Better:

- `近期更值得优先浏览的论文`
- `Papers worth checking first based on recency, citations, and recent activity`

The user should understand the value without needing to reverse-engineer the scoring model.

#### Compact ranked list after the hero picks

After the top 3 featured entries:

- switch to denser ranked rows
- remove long summaries
- keep only title, authors, field, date, and one short reason cue

Example reason cues:

- `High citations`
- `New and rapidly noticed`
- `Top venue signal`
- `Strong multi-source coverage`

The point is not to expose the full formula.
The point is to give a human-readable reason to click.

### Better segmentation

Instead of one giant ranking, consider splitting into:

- `Top picks now`
- `New but rising`
- `Still worth catching up on`

This is easier to scan than ranks `#1` through `#100`.

## Shared Recommendations

### Progressive disclosure

Both surfaces should adopt the same rule:

- first screen = selective
- expansion = explicit

Never force users to process the entire volume by default.

### Result density

Use at least 2 density modes:

- featured card
- compact row

Right now the product leans too heavily on one rich-card pattern.

### Mobile behavior

This matters even more on mobile.

On narrow screens:

- cut featured counts further
- collapse older sections sooner
- avoid tall card stacks with repeated summaries

## Suggested Acceptance Targets

### Latest

- first screen should show a clear daily count and a limited curated slice
- no 100+ chip taxonomy wall on first paint
- one large day should not auto-expand into hundreds of full cards
- users can reach the full day list, but only through explicit action

### Rising Signals

- first screen should feel like a shortlist, not a ranked archive
- default view should not render 100 entries in full-card form
- the page should explain “why look here” in plain language
- the list after top picks should be compact

## Implementation Direction

Files likely involved:

- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx)
- [src/pages/zh/hot.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/hot.astro)
- [src/pages/en/hot.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/hot.astro)
- [src/components/react/PaperCard.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/PaperCard.tsx)
- [src/lib/i18n.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/lib/i18n.ts)

Preferred implementation strategy:

1. Add lighter browse-specific list variants instead of reusing the richest card everywhere.
2. Cap default rendering aggressively.
3. Move full expansion behind explicit actions.
4. Reduce taxonomy noise on `Latest`.
5. Reframe `Rising Signals` as a shortlist with reasons, not a raw ranking dump.
