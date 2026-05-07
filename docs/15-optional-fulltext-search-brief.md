# Optional Full-Text Search Brief

## Purpose

This document is for the implementation AI.

The site should not force every user to download and initialize full-text search.

Instead:

- default search should stay fast and light
- full-text search should be optional
- users should be informed before extra search assets are loaded

This brief defines:

- where the trigger belongs
- when the confirmation modal should appear
- what the user flow should be
- what implementation patterns are acceptable

Use this together with:

- [docs/14-search-index-splitting-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/14-search-index-splitting-brief.md)
- [docs/13-visual-interaction-upgrade-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/13-visual-interaction-upgrade-brief.md)
- [docs/12-static-pages-functional-review.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/12-static-pages-functional-review.md)

## Product Decision

Full-text search is an advanced capability, not the default mode.

Default mode should search only lightweight fields such as:

- title
- authors
- categories
- tags

Optional mode should additionally search:

- summary
- core points

This is a product decision, not just a technical workaround.
It protects initial responsiveness while still preserving power-user capability.

## Current Search Page Context

Current search page structure is simple:

- page title
- short hint copy
- search input
- filters
- results

Given that structure, the full-text trigger should be attached to the search workflow itself.

It should not live in:

- the global navbar
- the mobile menu
- the footer
- a passive settings page

Those locations hide the feature or make it feel detached from the user’s current search intent.

## Required Trigger Placement

### Primary trigger location

Place the main trigger directly below the search input and above filters / results summary.

That row should act as a “search mode” strip.

Recommended structure:

- left side: current search mode summary
- right side: action button or toggle-like button for enabling full-text search

Example copy:

- `Quick search active`
- `Enable full-text search`

Or in Chinese:

- `当前：快速搜索`
- `启用全文搜索`

Why this is the correct location:

- it sits next to the user’s search intent
- it is visible before filtering begins
- it does not pollute the global header
- it still works on mobile because it can stack under the input

### Secondary trigger location

Add a contextual CTA inside the empty-result state when:

- the user has typed a query
- quick search returns zero results
- full-text search is not yet enabled

Example copy:

- `No results in quick search`
- `Try full-text search in summaries and key points`

This is the right fallback trigger because it appears exactly when the user has evidence that lightweight search may be too narrow.

## Modal Behavior

### When the modal should open

The modal should open only when the user explicitly requests full-text search.

Valid trigger actions:

- clicking `Enable full-text search`
- clicking the empty-state CTA that suggests trying full-text search

### When the modal should not open

Do not open the modal:

- automatically on first page visit
- automatically on first keystroke
- automatically when the query is long
- automatically after a timeout

Auto-popup behavior would be intrusive and would read like a growth pattern, not a product feature.

## Modal Content Requirements

The modal should explain the cost in plain language.

It must communicate:

- this enables deeper search
- extra search data will be loaded
- initial activation may take a moment
- after loading, the setting can be remembered

Recommended content:

### Title

- `Enable full-text search`
- `启用全文搜索`

### Body

English:

- `Search within summaries and key points. This loads additional search data and may take a moment on first use.`

Chinese:

- `可搜索摘要和要点。首次启用时需要额外加载搜索数据，可能需要一点时间。`

### Actions

Primary:

- `Enable now`
- `立即启用`

Secondary:

- `Not now`
- `暂不启用`

Optional checkbox:

- `Remember my choice on this device`
- `在此设备记住我的选择`

## Loading Flow

After the user confirms:

1. close or transition the modal into a loading state
2. start loading the prebuilt full-text index
3. show an inline status near the search mode row
4. keep the rest of the page usable

Inline status examples:

- `Enabling full-text search...`
- `Full-text search ready`

Do not freeze the whole screen behind a blocking loader.

## State Model

The implementation should distinguish these states:

- `quick`
- `confirming-fulltext`
- `loading-fulltext`
- `fulltext-ready`
- `fulltext-failed`

This can be modeled in React state or a small reducer.
The exact implementation is not important.
The user-visible state clarity is important.

## Persistence

Remember the user’s decision in local storage.

Recommended behavior:

- if user enabled full-text and chose to remember it, auto-enable on later visits
- if full-text assets are not ready yet, show the loading status again
- if user declined, do not keep nagging on every search

Do not reopen the modal repeatedly once a user has dismissed it in the same session.

## UI Design Rules

### Search mode row

The row under the search input should be compact and readable.

It should contain:

- current mode label
- concise explanation
- CTA or ready state

It should not look like:

- a warning banner
- a settings panel
- a large promotional card

Preferred visual treatment:

- subtle glass row or bordered strip
- smaller than the main search input
- clear active/inactive distinction

### Button style

The trigger should look like a secondary action, not the primary action of the page.

Use:

- bordered button
- compact size
- clear hover / focus state

Do not make it louder than the search field itself.

### Empty-state CTA

The empty-state CTA should be framed as help, not blame.

Good direction:

- `Try searching in summaries and key points`

Bad direction:

- `Your search is too narrow`

## Mobile Rules

On mobile:

- the trigger must stay below the input
- do not place it inline with the input icon
- do not hide it behind a menu
- modal actions must be thumb-friendly

If horizontal space is tight, stack:

- mode label
- explanatory copy
- trigger button

Do not force a tiny switch control beside the input field.

## Desktop Rules

On desktop:

- the mode strip may use a two-column layout
- status and action can sit on the same row
- the strip should still remain secondary to the input

Do not move the trigger to the top-right page corner just because desktop has more space.

## Implementation Constraints

- do not add the old `31.5MB` raw full-text payload back into runtime data
- do not build the full-text index from raw JSON in the browser
- do not block the quick-search path on full-text readiness
- do not hide the feature so deeply that users never discover it
- do not make the modal appear automatically on first visit

## Suggested File Targets

The implementation AI will likely need to touch:

- `src/components/react/SearchPage.tsx`
- `src/lib/searchEngine.ts`
- any new worker file used for search index loading
- any generated search artifact wiring introduced by the index-splitting work
- i18n strings used by the search page

This does not authorize unrelated redesign.

## Acceptance Criteria

Approve only if all of the following are true:

- quick search works without loading full-text assets
- the main full-text trigger is below the search input, not in global navigation
- enabling full-text requires explicit user action
- a confirmation modal explains the extra load before activation
- zero-result quick searches offer a contextual full-text CTA
- page remains usable while full-text assets load
- user choice can be remembered locally
- zh/en copy both exist and are coherent

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. Exact trigger placement description
2. Modal copy for both languages
3. Exact files changed
4. Whether user choice is persisted and how
5. Loading and failure states implemented
6. Local verification notes for desktop and mobile

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Confirm the trigger is below the search input
2. Confirm the modal is explicit and not auto-triggered
3. Confirm quick search remains the default path
4. Confirm empty-result CTA exists when full-text is disabled
5. Confirm enabling full-text does not lock the page
