# UI / Search Redesign Brief

## Context

Current site:

- Home page visual style is consistent, but the hero section is too empty and the content hierarchy is weak.
- Mobile navigation is broken in practice:
  - the floating language switcher overlaps the mobile menu area;
  - the menu button has no real expanded navigation behavior.
- Search page currently ships the full paper dataset into the page at initial load.
  - `src/pages/en/search.astro`
  - `src/pages/zh/search.astro`
  - `src/components/react/SearchPage.tsx`
- Paper cards use `framer-motion` and lazy-import heat data per card, which adds unnecessary client cost on listing pages.

This document is for the implementation AI. Do not treat it as optional guidance. Treat it as the execution brief.

## Goal

Deliver two outcomes together:

1. Make the site look more intentional and premium, especially the home page.
2. Remove the worst search-page loading behavior so search no longer depends on full dataset hydration at first paint.

The result should still feel like the same product, not a different brand.

## Constraints

- Work on `dev`.
- Do not rewrite the whole project.
- Preserve Astro-first architecture.
- Prefer server-rendered HTML where interactivity is not needed.
- Avoid introducing a large new dependency.
- Do not regress Chinese and English parity.
- Do not remove existing pages.

## Required Changes

### 1. Home page redesign

Target files will likely include:

- `src/pages/en/index.astro`
- `src/pages/zh/index.astro`
- `src/components/astro/HeroSection.astro`
- `src/components/astro/StatsBar.astro`
- `src/components/astro/CategorySection.astro`
- `src/components/react/PaperCard.tsx`
- `src/styles/global.css`

Required outcome:

- The first screen must have real utility, not just title plus counters.
- Add a strong search entry in the hero area.
- Add one compact editorial area such as:
  - featured papers;
  - trending now;
  - quick filters by field;
  - or a similar high-signal module.
- Reduce the “endless repeated card wall” feeling on the home page.
- Use stronger layout rhythm, spacing, and typography hierarchy.
- Mobile layout must feel intentionally designed, not merely stacked.

Suggested direction:

- Keep the dark / neon system, but make the composition more editorial.
- A good structure is:
  - Hero with search and quick actions
  - compact stats / signals row
  - featured or trending band
  - categorized sections with fewer, better-presented cards
- Prefer a mix of card sizes or one highlighted card plus supporting cards.

### 2. Search page loading redesign

Current problem:

- `SearchPage` receives `papers` as a prop from the Astro page.
- That means the full dataset is embedded into the page payload and hydrated on entry.

Required outcome:

- Search page first render must not inline the full paper dataset into HTML props.
- Search page should render a fast shell first, then fetch what it needs asynchronously.
- Use the existing JSON endpoints if practical, or add a leaner search dataset endpoint if needed.

Acceptable implementations:

- Fetch `/en/papers.json` or `/zh/papers.json` client-side after mount.
- Better: create a dedicated slim search payload that excludes fields not needed for search results.
- Best: return only the fields needed for:
  - search indexing;
  - filter lists;
  - result cards.

Required UX:

- Show loading skeleton or clear loading state.
- Search input should be interactive immediately.
- Results should appear after data load without layout jank.
- Filtering and pagination should still work.

### 3. Mobile navigation fix

Target files will likely include:

- `src/layouts/BaseLayout.astro`
- `src/components/astro/Navbar.astro`
- `src/components/react/LanguageSwitcher.tsx`

Required outcome:

- Language switcher must not overlap the mobile header controls.
- Mobile menu button must open a real menu or drawer.
- The mobile menu must include:
  - navigation links;
  - language switch;
  - clear close behavior.
- Keyboard and tap interaction must both work.

### 4. Card performance cleanup

Target files:

- `src/components/react/PaperCard.tsx`
- any list pages using `PaperCard`

Required outcome:

- Remove unnecessary client cost from basic list rendering.
- Avoid per-card dynamic import of the full heat-score dataset.
- Avoid using `framer-motion` for effects that can be done in CSS.

Preferred direction:

- If heat score is needed, pass it from the parent or provide it in the fetched dataset.
- Replace simple hover / tap animation with CSS transitions.
- Keep card interaction crisp but lightweight.

## Non-goals

- Do not build an authenticated user system.
- Do not add backend infrastructure.
- Do not redesign every subpage from scratch.
- Do not change the data pipeline unless required for the slimmer search payload.

## Implementation Notes

### Search data shape

If adding a lean search payload, include only what search needs:

- `id`
- localized `title`
- localized `summary`
- `authors`
- `categories`
- `source`
- `date`
- `addedDate`
- `citeCount`
- `tags`
- `url` or enough source info to derive it
- optional `heatScore`

Do not ship large unused fields if they are not displayed or indexed.

### Rendering strategy

Prefer:

- Astro for structure
- minimal React islands for true interactivity
- CSS transitions instead of runtime animation for list cards

Do not keep `client:load` on heavy components unless there is a concrete reason.

## Acceptance Criteria

The work is acceptable only if all of the following are true.

### Functional

- Home page renders correctly in both English and Chinese.
- Search page works in both English and Chinese.
- Search no longer inlines the full paper dataset in initial HTML props.
- Mobile menu works on narrow screens.
- Language switch remains usable on mobile.

### UX

- Home page first screen has a clear primary action and stronger information hierarchy.
- Search page has a visible loading state.
- Search and filter operations remain understandable and fast.
- The page looks materially better than the current production page, not just slightly rearranged.

### Performance

- Search page initial HTML is substantially lighter than before.
- Listing pages do not trigger per-card import of the full heat-score JSON.
- Simple card hover effects do not require `framer-motion`.

### Quality

- `npm run build` passes.
- No obvious console errors in local preview.
- No broken links introduced in navbar or hero actions.
- No layout overlap in the mobile header.

## Deliverables From The Implementing AI

The implementing AI must provide:

1. A short change summary.
2. Exact files changed.
3. Why the new search loading path is lighter.
4. Build / verification results.
5. Any remaining tradeoffs.

## Reviewer Instructions

I am acting as reviewer, not implementer.

When implementation is ready, review with this order:

1. Verify search page no longer embeds full dataset in page props.
2. Verify mobile nav behavior on a narrow viewport.
3. Verify card rendering no longer depends on heavy per-card client behavior.
4. Verify home page visual hierarchy is materially improved.
5. Run build and note any regressions.

If any of those fail, reject the change.
