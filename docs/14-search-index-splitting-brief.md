# Search Index Splitting Brief

## Purpose

This document is for the implementation AI.

The current search architecture is not acceptable for a static site at this dataset size.

Right now:

- `search-index.json` includes `summary` and `core_points`
- the payload is about `31.5MB`
- the browser downloads it, parses it, and builds the search index on the main thread

That combination causes UI stalls.

This brief defines how to keep full-text search while removing the worst runtime cost.

Use this document together with:

- [docs/11-ui-search-redesign-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/11-ui-search-redesign-brief.md)
- [docs/12-static-pages-functional-review.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/12-static-pages-functional-review.md)
- [docs/13-visual-interaction-upgrade-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/13-visual-interaction-upgrade-brief.md)

## Problem Statement

Current behavior:

- [src/pages/en/search-index.json.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/search-index.json.ts:4) ships full bilingual search text
- [src/pages/zh/search-index.json.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/search-index.json.ts:4) does the same
- [src/components/react/SearchPage.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/SearchPage.tsx:44) fetches that JSON on page load
- [src/lib/searchEngine.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/lib/searchEngine.ts:24) builds the FlexSearch index in the browser

This is the wrong split of responsibilities.

The browser should not receive raw full-text content just so it can build an index that could have been prepared at build time.

## Goal

Deliver all of the following:

1. Search page initial data load must be much lighter than the current `31.5MB` JSON path
2. Full-text search capability must remain available
3. Search page must become interactive before full-text indexing finishes
4. Main-thread stalls from JSON parse plus index build must be removed or materially reduced
5. English and Chinese routes must both work

## Non-Goals

- Do not add a backend service
- Do not require a database
- Do not rewrite the app into a SPA
- Do not remove full-text search entirely
- Do not keep the current architecture and just “compress better”

Compression is not the fix here.
The problem is browser parse and indexing cost.

## Required Architecture Change

Split search data into at least two layers.

### Layer 1: Lightweight runtime metadata

Create a small payload for rendering result cards and filters.

This payload should contain only the fields needed by the UI:

- `id`
- localized `title`
- `authors`
- `categories`
- `tags`
- `source`
- `url`
- `date`
- `addedDate`
- `citeCount`
- optional `heatScore` if the card needs it

This payload must not include:

- `summary`
- `core_points`
- both-language text when the route only needs one language
- unrelated paper fields used only on detail pages

Call this something explicit such as:

- `/en/search-meta.json`
- `/zh/search-meta.json`

### Layer 2: Prebuilt search index

Generate the FlexSearch index at build time instead of in the browser.

That means:

- read `papers.json` during build
- build search indexes in Node
- emit serialized index artifacts
- let the browser import those artifacts for query only

The browser should no longer build the document index from raw full-text paper data on page load.

## Language Strategy

Do not ship bilingual full-text data to every language page.

For `/en/search`:

- index `title.en`
- index `summary.en`
- index `core_points.en`
- index tags
- index author names
- index categories

For `/zh/search`:

- index `title.zh`
- index `summary.zh`
- index `core_points.zh`
- index tags
- index author names
- index categories

If cross-language search is intentionally required, that must be explicit and justified.
Do not assume it for free if it doubles payload or index size.

Preferred default:

- English page optimized for English text
- Chinese page optimized for Chinese text

Optional enhancement:

- add a secondary fallback strategy for cross-language title matching only

## Execution Strategy

### Phase 1: Decouple UI data from search text

Replace the current `search-index.json` payload with a lighter metadata payload.

The search page should be able to:

- render the shell
- load filters
- show result cards

without needing full summaries or core points in memory.

### Phase 2: Precompute the index

Create a build-time script that:

- loads `src/data/papers.json`
- builds a FlexSearch index per language
- exports the serialized index
- writes output into a generated data location used by Astro

Possible output shapes:

- one JSON file per language
- multiple shard files per language if the serialized index is still large

The exact format is implementation detail.
The important point is that the browser imports a prepared index instead of building one from scratch.

### Phase 3: Move indexing work off the main thread

If importing or querying the index is still heavy, move search work into a Web Worker.

Preferred behavior:

- page becomes usable immediately
- metadata loads first
- worker loads or imports the prebuilt index asynchronously
- lightweight search can work before full-text index is ready if needed

Worker use is strongly preferred if the imported index is still non-trivial.

## Recommended UX Behavior

The search page should not behave like a frozen tool waiting for all data work to finish.

Recommended flow:

1. Render search page shell immediately
2. Load `search-meta.json`
3. Enable quick filtering and light search as soon as metadata is ready
4. Load prebuilt full-text index asynchronously
5. Upgrade search behavior once full-text index is ready

User-facing states should be clear:

- `Loading search data...`
- `Full-text search ready`
- or an equivalent subtle status

Do not block typing until the full-text layer is ready.

## Acceptable Search Modes

Any of the following implementations are acceptable.

### Option A: Best balance

- metadata JSON for rendering
- prebuilt FlexSearch index
- index imported in a Web Worker

This is the preferred solution.

### Option B: Good incremental step

- metadata JSON for rendering
- prebuilt FlexSearch index
- index imported on main thread only if it proves cheap enough

This is acceptable only if the page remains responsive on realistic hardware.

### Option C: Progressive enhancement

- metadata JSON supports title/tags/authors/categories search immediately
- full-text index loads later as an enhancement

This is also acceptable and may produce the best perceived performance.

## Not Acceptable

Reject any implementation that does any of the following:

- still downloads `summary` and `core_points` as runtime search page data
- still builds the full FlexSearch index in the browser from raw paper JSON
- still ships both-language full text to both language pages without a strong reason
- claims success based only on network compression
- leaves the search page unresponsive while parsing or importing large artifacts

## Likely File Targets

The implementation AI will likely need to modify or add some of:

- `src/components/react/SearchPage.tsx`
- `src/lib/searchEngine.ts`
- `src/pages/en/search-index.json.ts`
- `src/pages/zh/search-index.json.ts`
- `src/pages/en/search.astro`
- `src/pages/zh/search.astro`
- `package.json`
- `scripts/` build-time generator files
- generated search artifacts under `src/data/` or a similar generated-data directory

This is not permission to overcomplicate the codebase.
Keep the architecture simple and static-site friendly.

## Data Shape Guidance

### Lightweight metadata payload

Use a dedicated type for search results metadata.

Example shape:

```ts
type SearchMetaItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  authors: { name: string }[];
  categories: string[];
  tags: string[];
  date: string;
  addedDate?: string;
  citeCount: number;
};
```

Do not use the full `Paper` type if the page does not need the full `Paper` object.

### Search index content

The index may still include summary and core points internally.
That is fine.

But the full-text content should exist only inside the prebuilt search artifact, not as general-purpose page data.

## Verification Requirements

The implementing AI must verify at least:

1. `/en/search` loads and returns results
2. `/zh/search` loads and returns results
3. Search page initial network path no longer fetches the old full raw full-text payload
4. Typing in the search box does not lock the page while the old-style index build runs
5. Search still finds terms that exist only in `summary` or `core_points`

## Acceptance Criteria

Approve only if all of the following are true:

- the search page no longer uses the current `31.5MB` raw full-text JSON strategy
- rendering data and index data are clearly separated
- full-text search still works
- the page remains responsive while search assets load
- English and Chinese search both work
- build output is deterministic and compatible with static hosting

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. Exact files changed
2. New generated artifact structure
3. Which fields were removed from the runtime payload
4. How the prebuilt index is loaded
5. Whether a Web Worker was used
6. Before/after payload sizes
7. Build result and local verification notes

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Confirm the raw runtime payload no longer includes `summary` and `core_points`
2. Confirm the browser is not rebuilding the full index from raw paper data
3. Confirm full-text queries still match summary-only and core-points-only terms
4. Confirm search page responsiveness during load
5. Confirm zh/en parity
