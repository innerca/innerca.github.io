## Scanability And Filter Layout Brief

This brief focuses on one visible product problem:

- `Latest` and `Search` are hard to scan at a glance
- the category areas are visually noisy
- the page layout gives taxonomy chips too much prominence

This is not just a styling issue.
It is a hierarchy issue.

## Core Diagnosis

Right now both pages put the wrong thing at the top of the reading order.

Users should first see:

- what this page is for
- how much content is here
- the most useful next action

Instead, they quickly run into:

- a long wall of raw categories
- low-level codes with weak semantic meaning
- too many equal-weight chips competing for attention

The result is:

- no obvious entry point
- poor first-screen comprehension
- visual fatigue before users even reach content

## Latest

### Current problem

`Latest` currently looks like:

1. page title
2. subtitle
3. giant category chip wall
4. only then actual results

This is backwards.

The chip wall visually dominates the page and makes the layout feel broken or unfinished.

### What the page should feel like

`Latest` should feel like a recent-ingest dashboard, not a taxonomy control panel.

Users should be able to answer three questions immediately:

- how many papers landed recently
- which areas are most active
- where to start browsing

### Required layout change

Reorder the page into:

1. header
2. overview band
3. recent results
4. lightweight field filters
5. advanced filters only on demand

Recommended overview band:

- `Today: 326 papers`
- `Yesterday: 188 papers`
- `Most active: LLM, Vision, Agents`

This instantly gives shape to the page.

### Category/filter treatment

Do not show the full category universe inline by default.

Use one of these approaches:

- top 6 to 8 high-level field chips
- a segmented control for a few major buckets
- an `Advanced filters` toggle that reveals the full taxonomy panel

If the user has not asked for advanced narrowing, the full taxonomy should stay hidden.

### Better first-screen behavior

The first viewport on mobile should include:

- title
- short scale summary
- 1 compact row of useful filters
- first 3 to 6 papers

If users cannot see real paper content above the fold, the page is still over-filtered.

## Search

### Current problem

`Search` is mixing two different interaction modes in one visual layer:

- query-driven search
- exhaustive category filtering

The category chip wall is too large and competes with the search box itself.

That weakens the main mental model:

- type a query
- optionally refine

Instead the page feels like:

- here is a search box
- here is a second entire UI made of 100 filter chips

### What the page should feel like

The search input must remain the obvious primary control.

Everything else should read as refinement, not equal-priority content.

### Required layout change

Use a two-level filter structure.

#### Level 1: lightweight visible filters

Keep only:

- source
- a few high-level field chips
- maybe one `More filters` button

#### Level 2: expandable advanced filters

Move the long taxonomy list into:

- a collapsible panel
- a drawer
- or a modal/filter sheet

Do not keep it fully expanded under the search bar.

### Scanability rule

A user should be able to understand the search page in under 2 seconds:

- what can I search
- what mode am I in
- what is the primary action

If the user has to visually parse dozens of codes before understanding the page, the layout is failing.

## Visual Hierarchy Recommendations

### Make chips less dominant

Current chips feel too numerous and too equal in weight.

Adjust by:

- reducing default chip count
- reducing contrast of inactive chips
- grouping chips under clearer headings
- hiding overflow behind `Show more`

### Separate browse content from controls

Controls should not visually overwhelm results.

Use stronger separation between:

- search/filter controls
- overview information
- actual paper results

That can be done with:

- section spacing
- panel grouping
- headings
- progressive disclosure

### Use information density intentionally

Not every page needs the same density.

Recommended density by surface:

- `Search`: input-first, filters-secondary, results-dominant
- `Latest`: overview-first, shortlist-second, full archive hidden behind expansion

## Concrete Acceptance Targets

### Latest

- first screen shows recent-paper overview, not a taxonomy wall
- users can see actual papers above the fold
- category filtering is present but not dominant
- full raw category list is hidden or heavily reduced by default

### Search

- search bar remains the strongest element on screen
- default filters are minimal and legible
- long category lists are moved into an advanced filter surface
- users can understand the page without scanning dozens of chips

## Files Likely Involved

- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx)
- [src/components/react/SearchPage.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/SearchPage.tsx)
- [src/lib/i18n.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/lib/i18n.ts)

## Implementation Direction

1. Reduce default filter surface area.
2. Introduce overview/summary bands before long controls.
3. Hide low-level taxonomy behind explicit advanced interaction.
4. Make results visible earlier in the viewport.
5. Keep the primary page action visually dominant.
