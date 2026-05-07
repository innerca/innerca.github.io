# Visual / Interaction Upgrade Brief

## Purpose

This document is for the implementation AI.

Its job is not to fix one bug or reshuffle one section.
Its job is to make the current static site feel like a finished product instead of a technically working prototype.

Use this document together with:

- [docs/11-ui-search-redesign-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/11-ui-search-redesign-brief.md)
- [docs/12-static-pages-functional-review.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/12-static-pages-functional-review.md)

This file defines the visual and interaction bar.

## Current Problems

The site is not ugly in the narrow sense.
It already has a dark neon direction.
The problem is that it still reads like an assembled demo.

Main issues:

- too many pages are just title plus repeated cards;
- the first screen on important pages does not tell the user what to do next;
- the glow-heavy visual language is not balanced by hierarchy, rhythm, or editorial structure;
- search, latest, author, and category pages feel like internal tools rather than polished product surfaces;
- mobile interaction is fragile and crowded;
- there are hover effects, but not enough useful interaction states.

The fix is not “add more effects”.
The fix is stronger page structure, more obvious primary actions, better grouping, and cleaner motion.

## Product Direction

Target feeling:

- a curated AI paper radar;
- part editorial digest, part fast research console;
- sharper and calmer than the current version.

Keep:

- dark background;
- cyan / purple accent system;
- technical / research tone;
- Astro-first static architecture.

Change:

- reduce the sense that every block has equal importance;
- stop using the same card treatment everywhere;
- introduce one clear focal point per page;
- make filters, counts, summaries, and navigation feel intentional.

## Global Visual Rules

### 1. Hierarchy first, glow second

Do not try to improve the UI by increasing shadows, blur, or border brightness.
First improve:

- page title sizing;
- spacing rhythm;
- section ordering;
- card size contrast;
- headline vs metadata contrast.

Glow should support hierarchy, not replace it.

### 2. One page, one primary action

Each major page must have a dominant next step:

- Home: search or jump into curated sections
- Hot: scan the highest-signal papers
- Latest: browse recent additions by day or topic
- Search: type, filter, and refine quickly
- Paper detail: read, branch out by author/category, or open original source

If the first screen does not make that action obvious, the page is incomplete.

### 3. Fewer repeated card walls

Do not render long sections that look visually identical from top to bottom.
Introduce contrast through:

- one highlighted card plus supporting cards;
- alternating dense and airy sections;
- compact metadata rows;
- section headers with counts and helper copy.

### 4. Mobile is not a shrunk desktop

On mobile:

- tap targets must be obviously tappable;
- filters must not become unreadable chip soup;
- the first screen must still contain one useful action;
- header controls must not compete for the same space.

## Page-by-Page Upgrade Requirements

### Home

Current problem:

- the hero is visually consistent but too empty;
- the page becomes a long sequence of similar cards;
- the homepage does not feel curated.

Required change:

- build a stronger above-the-fold composition;
- make search a first-class action in the hero;
- add one editorial module with clear curation value;
- reduce the amount of same-sized content blocks on the first screen.

Recommended structure:

1. Hero with title, short explanation, primary search action, and one secondary action
2. Compact signal bar with counts or freshness indicators
3. Featured or trending band with stronger visual emphasis than normal cards
4. Category sections with fewer cards and clearer section framing

Visual rules:

- hero copy should explain value, not just repeat the site name;
- quick category links should look like useful shortcuts, not decorative tags;
- the highlighted module should have larger typography or larger card scale than the rest;
- avoid placing full-width sections with identical spacing one after another.

### Hot

Current problem:

- it works as a list, but it does not feel like a ranking surface.

Required change:

- make top-ranked items visually distinct from the rest;
- explain what “Hot” means in one short line;
- expose rank confidence through metadata, not just card repetition.

Recommended treatment:

- top 3 rendered with stronger prominence;
- remaining items in a denser list;
- sticky page header or summary row on desktop if useful.

### Latest

Current problem:

- the page opens directly into chips and grouped lists;
- it lacks page framing and context.

Required change:

- add a real header block before filters;
- explain what time window or grouping logic the page uses;
- make date groups easier to scan;
- reduce the feeling that filters are floating without context.

Recommended treatment:

- page intro with title, visible papers count, active days count;
- filter chips under the header, not above the page identity;
- date groups rendered as sections with stronger separation;
- “show more” treated as progressive disclosure, not a utility button lost in the flow.

### Search

Current problem:

- the page is structurally thin;
- filters look like raw controls;
- loading and empty states are functional but not product-grade.

Required change:

- give the page a header and search context;
- make search input feel like the page anchor;
- group filters into a clearer control area;
- ensure the data-loading experience feels deliberate.

Recommended treatment:

- page header with title and short usage hint;
- large input surface with a clearer focused state;
- result count and active filters shown together;
- skeletons that resemble real result shape;
- empty state with guidance, not only absence.

### Paper Detail

Current problem:

- the content is usable, but the page still reads like raw sections stacked vertically.

Required change:

- treat the title area as a proper article header;
- group metadata into a stronger summary block;
- make branching actions obvious: author, category, source, share.

Recommended treatment:

- article header with title, authors, categories, source row;
- body area split into summary / core points with stronger layout;
- action row should feel intentional, not bolted on after the content.

### Author and Category

Current problem:

- both pages are technically correct but too thin to feel finished.

Required change:

- add header context and page-specific framing;
- explain what the list represents;
- improve mobile readability.

Recommended treatment:

- compact intro block with entity name, count, and short descriptor;
- optional related categories or recent activity hint if cheap to compute;
- better back navigation wording and placement.

## Interaction Requirements

### Search and filter behavior

- filters must have clear active, hover, disabled, and cleared states;
- active filters should be visible without forcing the user to parse chip color alone;
- changing filters should not cause layout jump above the fold;
- pagination or “show more” controls must be stable in placement.

### Card interactions

- hover should communicate clickability, not perform a full animation show;
- focus states must be visible for keyboard navigation;
- cards should reveal structure faster: title, source, freshness, category, then summary;
- interactive metadata inside cards must not create accidental tap conflicts on mobile.

### Motion

Use motion sparingly and with purpose:

- page entrance;
- hover lift;
- search focus;
- drawer open/close;
- staggered list reveal only where it helps orientation.

Do not use motion where CSS state change is enough.
Do not rely on motion to compensate for weak layout.

### Navigation

- mobile menu must open a real navigation surface;
- language switch must be integrated into the menu on mobile;
- current page must be easy to identify;
- return paths from detail pages must feel human, not mechanical.

## Component-Level Design Rules

### Hero

- must contain a value statement, not only a brand statement;
- must expose one obvious click target;
- must avoid large dead areas with only ambient background effects.

### Section headers

- every major section should have a title, one-line explanation or count, and optional action;
- headers should create a scanning rhythm across the page.

### Chips and badges

- chips are controls when clickable, labels when passive;
- do not style both the same way;
- filter chips must look more interactive than content tags.

### Cards

- cards used in different contexts should not all have identical density;
- featured cards can be roomier;
- list cards should be tighter and faster to scan.

### Empty and loading states

- loading should preserve layout expectation;
- empty states should provide a next move;
- error states should look recoverable, not broken.

## Implementation Constraints

- do not rewrite the site into a client-heavy SPA;
- preserve zh/en parity;
- prefer Astro-rendered structure and lightweight React islands;
- do not add a large animation dependency to solve basic hover/focus needs;
- do not increase initial payload size in the name of “richer UI”;
- do not introduce a brand-new visual language unrelated to the existing site.

## Minimum File Targets

The implementation AI will likely need to touch some of:

- `src/layouts/BaseLayout.astro`
- `src/components/astro/Navbar.astro`
- `src/components/astro/HeroSection.astro`
- `src/components/astro/StatsBar.astro`
- `src/components/astro/TrendingSection.astro`
- `src/components/react/PaperCard.tsx`
- `src/components/react/SearchPage.tsx`
- `src/components/react/LatestContent.tsx`
- `src/components/astro/PaperDetail.astro`
- `src/pages/en/index.astro`
- `src/pages/zh/index.astro`
- `src/pages/en/hot.astro`
- `src/pages/zh/hot.astro`
- `src/pages/en/latest.astro`
- `src/pages/zh/latest.astro`
- `src/pages/en/author/[slug].astro`
- `src/pages/zh/author/[slug].astro`
- `src/pages/en/category/[category].astro`
- `src/pages/zh/category/[category].astro`
- `src/styles/global.css`

This is not a command to rewrite all of them.
It is the likely surface area.

## Acceptance Criteria

Reject the implementation if any of the following remain true:

- the homepage still feels like hero plus card wall;
- Hot still looks like a generic list instead of a ranking surface;
- Latest still starts as filter chips without page identity;
- Search still feels like a raw input plus filters block;
- Author and category pages still look like temporary archive pages;
- mobile navigation still feels cramped or layered awkwardly;
- the visual result is “more effects” without better structure;
- Chinese pages did not receive the same product treatment as English pages.

Approve only if the result clearly improves:

- first-screen usefulness;
- page hierarchy;
- scan speed;
- mobile tap experience;
- consistency of interactive states;
- perceived product polish.

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. A short page-by-page summary of what changed
2. Exact files changed
3. A note explaining how the visual hierarchy improved, not just which classes changed
4. Desktop and mobile verification notes
5. Build result and any remaining compromises

## Reviewer Notes

I am not implementing this work.
I am reviewing it.

Review order:

1. Check whether the home page gained a real focal point
2. Check whether Search and Latest gained page framing and better control hierarchy
3. Check whether Hot now reads as ranking, not generic listing
4. Check whether Author / Category / Detail pages feel intentionally composed
5. Check mobile header, menu, filters, and tap rhythm
6. Reject any implementation that adds visual noise without improving structure
