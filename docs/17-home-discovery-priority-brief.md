# Home Discovery Priority Brief

## Purpose

This document is for the implementation AI.

The homepage should stop behaving like a generic landing page plus repeated content blocks.

It needs to express the product's actual discovery order clearly:

1. search when the user has intent
2. latest when the user wants fast recent browsing
3. hot when the user wants ranked guidance

This brief defines how the homepage should present those three paths.

Use this document together with:

- [docs/13-visual-interaction-upgrade-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/13-visual-interaction-upgrade-brief.md)
- [docs/16-discovery-surface-ia-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/16-discovery-surface-ia-brief.md)
- [docs/11-ui-search-redesign-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/11-ui-search-redesign-brief.md)

## Core Decision

The homepage should not teach the ranking model first.

It should first help users do one of two simple things:

- search directly
- browse what is new

`Hot` remains valuable, but it should enter as a curated secondary module, not as the main homepage logic.

## Desired Priority

### 1. Hero owns intent

The hero should answer:

- what this site is for
- what the user can do immediately

Primary action:

- go search

Secondary action:

- browse latest

This means the hero should not mainly advertise:

- counters
- decorative tags
- heat score concepts

### 2. Latest owns low-friction discovery

The homepage should expose a recent-discovery module high on the page.

This is the easiest behavior for repeat visitors:

- open site
- scan what was added
- click into interesting papers

### 3. Hot owns recommendation

`Hot` should appear as a tighter, more curated module lower than the first discovery actions.

It should feel like:

- "signals worth watching"

not:

- "you must understand my scoring system before browsing"

## Recommended Homepage Structure

Use this order unless there is a very strong reason not to.

1. Hero
2. Compact stats / freshness strip
3. Latest / recent discovery band
4. Hot / trending signals module
5. Category sections

This order better matches user intent than:

- Hero
- Hot
- long mixed card wall

## Hero Requirements

### Role

The hero is not just branding.
It is the main routing layer for the entire site.

### Required content

- title
- one-line value statement
- primary search action
- secondary latest action
- optional compact quick topics

### Required behavior

Primary CTA:

- `Search papers`
- `搜索论文`

Secondary CTA:

- `Browse latest`
- `浏览最新收录`

The secondary CTA should land on `Latest`, not `Hot`.

### Copy direction

Good direction:

- `Track new AI papers without digging through noisy feeds`
- `快速发现新收录的 AI 论文`

Bad direction:

- vague cyber branding with no product promise
- score-heavy or model-heavy explanation in the hero

## Latest Module Requirements

### Role on homepage

This is the homepage's main browsing module.

It should help a user immediately understand:

- what is newly added
- what topics are active
- where to click next

### Recommended treatment

- section title
- short helper line
- a compact recent set of cards
- an action to open full `Latest`

Recommended CTA:

- `View all latest`
- `查看全部最新收录`

### Important rule

Do not make the homepage latest module look like a full clone of the `Latest` page.

It should be:

- a preview
- a fast teaser
- a routing module

not:

- the entire full page embedded on home

## Hot Module Requirements

### Role on homepage

The homepage `Hot` section is not the primary feed.
It is a recommendation sidebar or recommendation band.

### Required treatment

- smaller and more selective than the latest module
- stronger explanation of why it matters
- less numeric score emphasis

Recommended framing:

- `Rising Signals`
- `Worth watching`
- `Papers with strong recent attention`

### What to show

Prefer:

- a few ranked highlights
- short explanation tags
- a link to the full `Hot` page

Do not dump a long hot ranking onto the homepage.

## Category Sections

Category sections should come after the main discovery decisions.

They are useful for:

- field-based browsing
- deeper exploration after the user understands the site's main entry points

Do not let category walls crowd out:

- search
- latest
- hot

## Visual Emphasis Rules

The homepage should visually emphasize sections in this order:

1. hero search action
2. latest preview
3. hot preview
4. category exploration

That emphasis should be reflected through:

- vertical order
- section size
- title contrast
- CTA clarity

Not through louder glow effects.

## Mobile Rules

On mobile:

- hero must still show two clear actions without wrapping into clutter
- latest preview should appear before the user has to scroll through ranking content
- hot preview should stay short
- do not stack too many chips ahead of the first useful cards

The first two mobile screens should help the user either:

- search
- browse latest

without needing to understand heat ranking first.

## Copy Guidance

### Hero

English:

- Title: `AI Paper Radar`
- Subtitle: `Search, scan, and track recent AI papers`

Chinese:

- Title: `AI 学术前沿雷达`
- Subtitle: `搜索、浏览并追踪最新 AI 论文`

### Latest module

English:

- Title: `Latest Additions`
- Helper: `Fresh papers grouped for fast browsing`

Chinese:

- Title: `最新收录`
- Helper: `按时间与主题快速浏览新论文`

### Hot module

English:

- Title: `Rising Signals`
- Helper: `Papers with strong recent attention`

Chinese:

- Title: `值得关注`
- Helper: `近期关注度较强的论文`

The exact words can vary.
The relative framing should not.

## What To Avoid

Reject implementations that do any of the following:

- place `Hot` above the homepage recent-discovery module
- make homepage discovery revolve around score explanation
- treat `Latest` as a minor afterthought
- stuff the hero with too many chips, counters, and competing actions
- make homepage sections feel like equally weighted blocks

## Suggested File Targets

The implementation AI will likely need to touch:

- `src/pages/en/index.astro`
- `src/pages/zh/index.astro`
- `src/components/astro/HeroSection.astro`
- `src/components/astro/StatsBar.astro`
- `src/components/astro/TrendingSection.astro`
- `src/components/astro/CategorySection.astro`
- relevant i18n strings

This does not require a full rewrite.
It requires clearer ordering and stronger product framing.

## Acceptance Criteria

Approve only if all of the following are true:

- the homepage primary CTA is search
- the homepage secondary CTA routes to `Latest`
- a recent-discovery module appears before the homepage hot module
- the hot module is shorter and more selective than the latest module
- users can infer the role of `Search`, `Latest`, and `Hot` from the homepage alone
- mobile first screens prioritize search and latest browsing

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. Final homepage section order
2. Updated hero CTA strategy
3. What changed in the latest preview module
4. What changed in the hot preview module
5. Desktop and mobile verification notes

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Check homepage CTA priority
2. Check whether latest appears before hot
3. Check whether hot became a curated secondary module
4. Check whether the hero now routes users clearly
