## Progressive Loading And Optional Depth Brief

This brief defines how the site should handle high-volume content without forcing every user to download, parse, and visually scan everything up front.

The governing rule is:

- default experience must stay light
- deeper content must be optional
- heavier data must load only after explicit user intent

This applies to:

- `Search`
- `Latest`
- `Rising Signals`
- homepage discovery modules

## Short Answer

Yes, the site should support lazy loading.

But it should not be implemented as “infinite scroll for everything”.

It should be implemented as:

- light first paint
- clear scope on what is currently loaded
- explicit user controls to reveal more
- heavier datasets loaded only when the user asks for them

## Product Principle

There are two different kinds of “more”:

### More UI items

Examples:

- show more papers in `Latest`
- expand more rows in `Rising Signals`
- reveal more homepage cards

This can be solved with staged rendering and pagination-like expansion.

### More data depth

Examples:

- enable full-text search
- load summaries / core points
- load advanced taxonomy universe

This must be gated behind explicit user intent and lazy-loaded as a separate data layer.

Do not mix these two problems together.

## Search

### Required behavior

`Search` should have two modes:

1. `Quick search` as default
2. `Full-text search` as optional

### Quick search

Load only lightweight search assets needed for:

- title
- authors
- category labels
- keywords
- heat
- date

This is the default mode for every visitor.

### Full-text search

Only load after the user explicitly enables it.

Do not automatically load full-text assets on page open, idle, hover, or first keystroke.

### Trigger placement

The trigger should live directly in the search control area, not buried elsewhere.

Recommended placement:

- immediately under the search input
- above results
- visible before the user clicks

Recommended copy direction:

- quick search is active
- it covers lightweight fields
- full-text search loads extra data
- user can enable it if needed

The modal can still exist, but the strip itself must already explain the tradeoff.

### Loading strategy

When the user enables full-text:

- lazy load the prebuilt full-text index
- initialize it off the main thread
- cache by version for return visits

Preferred implementation:

- `fetch()` or dynamic `import()` for the search asset
- `Web Worker` for index initialization and querying
- `IndexedDB` for persistent cache

Do not lazy load the old `31.5MB` raw aggregate JSON.

Even in full-text mode, the runtime should load a search-optimized artifact, not the full content blob.

## Latest

### Problem

One day can contain `300+` papers.

That is too much for a default browse page.

Even if transport is technically fine, the visual and cognitive cost is too high.

### Required behavior

`Latest` should not render the whole day feed by default.

Use a staged model:

1. show a curated first slice
2. let the user request more
3. progressively reveal deeper content

### Recommended default

For the newest day:

- show first `8` papers by default

For previous days:

- show first `4` papers per day by default

Everything else should stay collapsed behind:

- `Show more today`
- `Show more from yesterday`
- `Load older papers`

### Loading model

The page can still ship day-level metadata for navigation, but should avoid mounting large paper lists immediately.

Preferred strategies:

- render only the first slice on first paint
- load additional slices on button click
- if necessary, fetch older day groups separately

Avoid endless full-feed scroll as the primary pattern.

## Rising Signals

### Problem

A `Top 100` ranked feed is too long for a recommendation surface.

Users will not meaningfully scan it as a full card list.

### Required behavior

Turn it into a shortlist, not a long article wall.

Recommended default:

- `3` featured papers
- `9` compact ranked rows
- remaining items hidden behind `Show more signals`

### Row format

After the featured zone, use compact rows instead of full summary cards.

Each row should surface only:

- rank
- title
- primary domain
- heat / momentum label
- date

Summaries should appear only on click, expand, or detail view.

## Homepage

### Problem

The homepage currently exposes too many papers and too many discovery modules at once.

That makes first paint feel busy even before performance becomes a hard failure.

### Required behavior

Homepage modules should preview, not dump.

Recommended caps:

- `Latest`: 4 papers
- `Rising Signals`: 4 papers or 3 featured + 3 compact rows
- domain browse: 4 domains max on first paint
- each domain preview: 3 papers max

If more content exists, use:

- `View latest`
- `View all signals`
- `Browse more domains`

Do not try to make the homepage the full browse surface.

## Filters And Taxonomy

### Problem

Large chip walls are a form of heavy loading too.

Even if the data is cheap to render, the scan cost is high.

### Required behavior

Default filters should stay short and human-readable.

Use:

- Level 1: major domains
- Level 2: advanced/raw taxonomy codes on demand

That means the user also “chooses more complexity” instead of receiving all of it by default.

This is the same product principle as optional full-text.

## UX Rules

Every optional heavier layer should satisfy all of the following:

1. It is clearly labeled before the click.
2. The user understands what extra value they get.
3. The user understands there is an extra loading cost.
4. The site remembers the choice when reasonable.
5. The default experience remains useful without it.

If a feature fails rule 5, then the default state is too weak.

## Implementation Guidance

The implementation AI should treat this as a progressive disclosure system, not a one-off optimization.

### Use lazy loading for

- full-text search assets
- older `Latest` slices
- extra `Rising Signals` rows
- advanced taxonomy filter panels
- per-paper expanded summaries if those are heavy

### Do not lazy load

- core navigation
- primary homepage copy
- default quick search
- first visible results slice

The page must still feel complete and trustworthy before any optional load happens.

## Acceptance Criteria

The work is acceptable only if all of the following are true:

### Search

- opening `Search` does not trigger full-text asset download by default
- the pre-click strip explains quick search scope and extra full-text cost
- enabling full-text is explicit
- full-text initialization does not block the main thread

### Latest

- the newest day does not dump `300+` papers by default
- visible paper count is aggressively capped on first load
- deeper content is revealed only after clear user action

### Rising Signals

- the page does not default to a `100`-entry full card wall
- only a small ranked slice is visible initially
- the rest list is materially more compact than full paper cards

### Homepage

- homepage visible paper count is materially reduced
- preview modules route users deeper instead of exposing everything

### Filters

- no giant raw taxonomy wall appears on first paint in `Latest` or `Search`
- advanced category density is behind an explicit interaction

## Final Direction

The right model is not:

- load everything, then let users scroll

The right model is:

- show a strong small slice
- explain what is available beyond it
- let users opt into more data, more items, and more complexity

That is better for performance, scanability, and product clarity at the same time.
