# Static Pages Functional Review

## Purpose

This document is a functional review and acceptance reference for the current static-site surface.

It is separate from the UI redesign brief.

Use this document for:

- checking whether the current static routes are actually usable;
- assigning follow-up fixes to an implementation AI;
- reviewing whether those fixes are complete.

## Pages Reviewed

English routes reviewed on local dev:

- `/en/`
- `/en/hot`
- `/en/latest`
- `/en/search`
- `/en/paper/[id]`
- `/en/author/[slug]`
- `/en/category/[category]`

Chinese routes were not manually walked end-to-end in this review pass, but any accepted implementation must preserve parity.

## High-Level Findings

### Working

- Main route generation is present and primary static pages open.
- Paper cards can navigate into paper detail pages.
- Author pages and category pages open.
- Latest-page category filtering works.
- Core site navigation links are present.

### Broken or materially incomplete

- Search is functionally broken in local dev because the page requests a JSON endpoint that returns `404`.
- React warnings are present in production-facing components due to invalid JSX DOM property names.
- Several pages are technically usable but too thin in structure to count as complete product pages.

## Confirmed Issues

### 1. Search page data endpoint is broken

Observed behavior:

- `SearchPage` requests `/${lang}/search-index.json`.
- Local route `http://localhost:4321/en/search-index.json` returned `404`.
- Search UI shows the input and loading skeletons but does not actually load results.

Relevant files:

- [src/components/react/SearchPage.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/SearchPage.tsx:42)
- [src/pages/en/search-index.json.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/search-index.json.ts:4)
- [src/pages/zh/search-index.json.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/search-index.json.ts:4)

Required outcome:

- `/en/search` and `/zh/search` must load search data successfully in local dev and build output.
- The requested JSON route must resolve correctly.
- Typing a query must render actual result cards.

### 2. Latest page still depends on client-loaded full paper data

Observed behavior:

- `LatestContent` is loaded with `client:load` and receives full `papers` as props from the Astro page.

Relevant files:

- [src/pages/en/latest.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/latest.astro:12)
- [src/pages/zh/latest.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/latest.astro:12)

Why it matters:

- This repeats the same architectural problem previously seen on search:
  shipping too much data into initial page props.

Required outcome:

- Latest page should not depend on initial hydration with the full paper dataset unless there is a clear, justified reason.
- If interactivity is needed, prefer a smaller payload or a better rendering split.

### 3. Invalid React DOM properties in `LatestContent`

Observed behavior:

- Console warning:
  `Invalid DOM property 'class'. Did you mean 'className'?`

Relevant file:

- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx:75)

Required outcome:

- Remove invalid JSX DOM properties.
- Zero known React property warnings from this component.

### 4. Invalid SVG JSX properties in `ShareButton`

Observed behavior:

- Console warnings for:
  - `stroke-linecap`
  - `stroke-linejoin`
  - `stroke-width`

Relevant file:

- [src/components/react/ShareButton.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/ShareButton.tsx:71)

Required outcome:

- Replace SVG attributes with valid React JSX equivalents:
  - `strokeLinecap`
  - `strokeLinejoin`
  - `strokeWidth`

### 5. Latest page is structurally weak

Observed behavior:

- The page starts with category chips and date-grouped cards.
- There is no real page header, explanation, or summary context.

Relevant file:

- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx:74)

Why it matters:

- This is not a hard runtime bug, but it is a product-level issue.
- The page feels like an internal listing rather than a finished content surface.

Required outcome:

- Add a real page header region.
- Explain what “Latest” represents.
- Show some summary context such as date range, number of days, or total visible papers.

### 6. Author and category pages are too thin

Observed behavior:

- They open and list papers.
- They do not provide much supporting context beyond the title and count.

Relevant files:

- [src/pages/en/author/[slug].astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/author/[slug].astro:48)
- [src/pages/en/category/[category].astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/en/category/[category].astro:1)
- Chinese equivalents in `src/pages/zh/...`

Required outcome:

- Keep them lightweight, but make them feel intentional.
- Minimum expectation:
  - clearer header structure;
  - more useful count/context copy;
  - no broken or awkward back-link wording;
  - stable mobile layout.

## Functional Expectations By Page

### Home

Must support:

- visible navigation to core pages;
- visible search entry;
- working language switch;
- paper-card navigation to detail pages.

Should improve:

- information hierarchy;
- mobile first-screen usefulness.

### Hot

Must support:

- visible explanation of what “Hot” means;
- paper cards with usable metadata;
- stable scrolling and mobile layout.

Should improve:

- stronger distinction between top-ranked items and the rest.

### Latest

Must support:

- category filtering;
- date-grouped display;
- working “show more” behavior where applicable;
- stable mobile layout.

Must improve:

- header/context;
- payload strategy;
- JSX correctness.

### Search

Must support:

- successful data loading;
- query input;
- filters;
- pagination;
- empty state;
- working mobile layout.

Must improve:

- endpoint reliability;
- actual results rendering in dev and build.

### Paper Detail

Must support:

- title, authors, categories, summary;
- working share actions;
- correct link-outs and back navigation;
- clean console behavior.

Must improve:

- JSX correctness in share controls.

### Author

Must support:

- correct author title;
- paper count;
- card listing;
- back navigation.

Should improve:

- page context and layout richness.

### Category

Must support:

- correct category title;
- result count;
- card listing;
- back navigation.

Should improve:

- page context and layout richness.

## Implementation Tasks For Another AI

If assigned to an implementation AI, the minimum task set should be:

1. Fix search endpoint routing so `/en/search` and `/zh/search` actually load result data.
2. Remove React JSX warnings from `LatestContent` and `ShareButton`.
3. Rework `Latest` page structure so it has a meaningful header and better context.
4. Review `Author` and `Category` pages for thin or awkward presentation and polish them.
5. Re-check mobile navigation, language switching, and page-to-page flow after the above changes.

## Acceptance Criteria

The implementation should be rejected if any of the following remain true.

- `/en/search` loads but cannot fetch its backing JSON data.
- Search input can accept text but never renders results.
- React console warnings still appear from `LatestContent`.
- React console warnings still appear from `ShareButton`.
- `Latest` still begins directly with filter chips and no real page header/context.
- Author/category pages remain obviously unfinished or visually broken on mobile.

## Reviewer Checklist

Run this exact review order:

1. Open `/en/search` and confirm the search JSON endpoint resolves successfully.
2. Type a real query and confirm result cards render.
3. Open `/en/latest` and confirm there are no JSX warnings from `LatestContent`.
4. Open at least one paper detail page and confirm there are no JSX warnings from `ShareButton`.
5. Check `/en/latest`, `/en/author/...`, and `/en/category/...` on a narrow viewport.
6. Verify language parity has not been broken for the matching `zh` routes.
7. Run build and note any regression.

## Notes

- This document is not asking for a full redesign of every route.
- It is asking for routes to be functionally complete and product-credible.
- Cosmetic polish without fixing broken search is not acceptable.
