# 26. Search Metadata Slimming Execution Brief

## Status

This is a lower-priority optimization brief.

Do not interrupt current browse/layout/product cleanup to do this first.

Current product truth:

- optional full-text is already gated behind explicit user action
- full-text work is already moved off the main thread
- `Latest` and `Hot` already use real incremental fetches

So this brief is about shaving search metadata cost further, not fixing a broken core experience.

## Why This Exists

`/zh/search-index.json` is no longer the old `31.5MB` raw full-text blob, but the metadata payload is still around `5.8MB` on localhost.

That is acceptable for now, but still heavier than it needs to be.

The biggest cost is not heat fields.
The biggest cost is duplicated or verbose metadata structure:

- bilingual `title`
- `authors` as object arrays
- per-item `url`
- dates and secondary signal fields that are not all needed for initial search browse

## Priority

Treat this as:

- `P3` if current product work is still in motion
- `P2` only after current browse/search/home polish is stable

Do not sell this as a must-fix blocker.

## Measured Shape

Approximate current contributors in the metadata payload:

- `title`: about `1.72MB`
- `authors`: about `1.25MB`
- `url`: about `0.34MB`
- `categories`: about `0.21MB`
- `id`, `date`, `addedDate`: about `0.11MB` each
- heat-related scalar fields are comparatively tiny

Implication:

- removing heat detail fields will not materially change first-load cost
- removing metadata redundancy will

## Goal

Reduce search metadata payload meaningfully without changing current product behavior.

Target:

- ideal next step: move from about `5.8MB` toward `3MB` class
- stretch target: around `2.5MB`

Do not chase tiny wins with large code complexity.

## Required Constraints

1. Keep quick search functional on first open.
2. Do not reintroduce raw full-text content into the default payload.
3. Do not break current sorting by `heatScore`.
4. Do not make clickthrough depend on a second blocking request unless the UX remains instant enough.
5. Do not fork data shape separately per component unless there is a clear product reason.

## Recommended Execution Order

### Step 1

Change `search-index.json` to emit only the current language title instead of bilingual title objects.

Example direction:

- zh page ships zh title string
- en page ships en title string

This is one of the highest-yield cuts.

### Step 2

Change `authors` from:

- `[{ name: "..." }, { name: "..." }]`

to one of:

- `["...", "..."]`
- or a compact display string if current UI does not need author-level structure

Prefer the simplest format that still matches current rendering needs.

### Step 3

Remove `url` from search metadata if detail-page routing already relies on `id`.

If list cards link to internal detail pages, `id` is enough for search results.

Do not keep external source URLs in the search payload unless the search page itself truly uses them.

### Step 4

Remove fields from search metadata that do not materially improve initial search/browse:

- `addedDate`
- `sCite`
- `sCode`
- `sBuzz`
- `sFresh`
- `burstBonus`

Keep `heatScore` if search ranking or browse ordering depends on it.

### Step 5

Re-measure before doing anything fancier.

If payload is already down near the `2.5MB` to `3MB` range, stop.

Do not add complex packing, custom codecs, or split manifests just to save another few hundred KB unless real user pain still exists.

## Explicit Non-Goals

Do not do these in this pass:

- redesign full-text architecture again
- replace JSON with a custom binary format
- add another worker layer for quick search
- split search metadata into many tiny follow-up requests
- overfit this path while homepage and browse surfaces are still evolving

## Acceptance

This brief is complete only if all of the following are true:

1. `Search` still opens in quick mode with no full-text asset download.
2. Quick search still supports title, author, category, and hot-first browsing behavior.
3. Search result cards still render without broken author/title logic.
4. `heatScore` ordering still works where intended.
5. `search-index.json` size is materially smaller than the current baseline.

## Preferred Outcome

The right outcome is not “the smallest possible payload”.

The right outcome is:

- a clearly smaller metadata payload
- no product regression
- no new complexity tax that outweighs the saved bytes
