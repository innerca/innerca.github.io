## Acceptance Round 2

This document captures the remaining issues after the implementation pass on `dev`.

Checked against:

- local runtime at `http://localhost:4321`
- current branch `dev`
- latest relevant commits:
  - `274b308 fix: avoid prototype pollution crash in search index builder`
  - `5bd1c8e feat: brand, typography, and discovery upgrades per docs 15–19`
  - `a4324fb refactor: split search index into lightweight meta + prebuilt inverted index`

## Overall Status

Not accepted yet.

The main search architecture direction is now correct:

- `/en/search-index.json` and `/zh/search-index.json` load successfully
- both are about `5.1MB`
- `/en/search-prebuilt.json` and `/zh/search-prebuilt.json` now load successfully
- both are about `6.8MB`
- full-text is no longer forced as a `31.5MB` first-load payload

So the major performance regression has been addressed.

The remaining blockers are product clarity and surface cleanup.

## Blocking Issues

### 1. Chinese localization is still incomplete

Visible / user-facing localization is not fully cleaned up.

Confirmed issue:

- Chinese `browseByCategory` copy is still `Field Boost`

Source:

- [src/lib/i18n.ts](/Users/xingmingcheng/workspace/github/innerca.github.io/src/lib/i18n.ts:30)
- [src/components/astro/CategorySection.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/astro/CategorySection.astro:21)

Required fix:

- replace `Field Boost` with a proper Chinese label
- check all zh homepage section headings, CTA labels, modal labels, and empty states for remaining English leakage
- do one final zh UI sweep in browser, not just source grep

Suggested direction:

- `分类发现`
- `按领域浏览`
- `研究方向`

Avoid decorative English section names in the zh version.

### 2. `Latest` category filtering is still too raw / not clean

This is currently exposing raw arXiv category codes directly as the main filter surface.

Observed behavior:

- `/zh/latest` renders a very long chip wall of low-level codes such as `astro-ph.CO`, `cond-mat.dis-nn`, `cs.AI`, `math.AT`, etc.
- this makes the page feel noisy and technical before the user has even started browsing papers
- it also conflicts with the intended role of `Latest` as a lighter-weight discovery surface

Source:

- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx:36)
- [src/components/react/LatestContent.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/LatestContent.tsx:137)

Required fix:

- do not render the entire raw category universe as the first filter surface on `Latest`
- either:
  - collapse to higher-level groups, or
  - show only a curated / top subset, with an expand action, or
  - move full taxonomy filtering to `Search` and keep `Latest` much lighter

Acceptance bar:

- `Latest` should feel scannable within a few seconds
- users should not be hit with a 100+ chip taxonomy wall above the first results

### 3. Search activation notice is still too weak before click

The modal copy is acceptable after the user clicks, but the default strip still does not clearly explain:

- quick search only covers lightweight fields
- full-text search will download extra search data

Current visible state on `/zh/search`:

- `当前：快速搜索`
- `启用全文搜索`

This is too thin for the decision being asked.

Source:

- [src/components/react/SearchPage.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/SearchPage.tsx:274)
- [src/components/react/SearchPage.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/SearchPage.tsx:283)

Required fix:

- strengthen the pre-click strip copy
- say what quick search includes
- say that full-text search loads additional data

Recommended copy shape:

- zh:
  - `当前为快速搜索：仅搜索标题、作者与标签`
  - `启用全文搜索后可搜索摘要和要点，首次会额外加载数据`
- en:
  - `Quick search: titles, authors, and tags only`
  - `Full-text search adds summaries and key points, and loads extra data on first use`

The modal should remain, but the strip must already set expectations.

### 4. `Hot / 值得关注` is still too heavy and not clear enough

The page is visually improved, but the interaction burden is still high.

Current problems:

- the header still explains `hot` mainly in internal ranking terms: `按热力分数排序`
- users still have to infer what that actually means
- the page opens with strong featured cards and then a long summary-heavy ranked list
- this makes the page feel dense and editorially overcommitted

Source:

- [src/pages/zh/hot.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/hot.astro:22)
- [src/pages/zh/hot.astro](/Users/xingmingcheng/workspace/github/innerca.github.io/src/pages/zh/hot.astro:32)
- [src/components/react/PaperCard.tsx](/Users/xingmingcheng/workspace/github/innerca.github.io/src/components/react/PaperCard.tsx:43)

Required fix:

- reduce explanation ambiguity
- reduce visual density for ranked browsing

Recommended direction:

- add one plain-language framing sentence:
  - zh: `这里展示近期更值得优先浏览的论文，综合考虑新近度、引用、来源信号与活跃度。`
  - en: `This view highlights papers that may be worth checking first, based on recency, citations, source signals, and recent activity.`
- make the long ranked list more compact than a normal summary feed
- reserve full summary-heavy cards for the top few entries only, or remove summaries from the rest list

Acceptance bar:

- `Hot` should read as an optional ranked shortcut, not as the heaviest page in the product

## Secondary Cleanup

These are not the main blockers, but should be checked while fixing the above:

- `Search` and `Latest` both still expose the full raw taxonomy chip set; consider aligning the cleanup strategy across both surfaces
- do one zh and one en browser pass after fixes, because current issues are mostly visible-product issues rather than type or build issues

## Re-Test Checklist

1. Open `/zh` and confirm no English section labels leak into the Chinese homepage.
2. Open `/zh/latest` and confirm the category area is materially lighter and cleaner.
3. Open `/zh/search` and confirm the default strip explains both search scope and extra-download behavior before click.
4. Click into full-text activation on `/zh/search` and confirm the modal still works.
5. Open `/zh/hot` and confirm the page reads more clearly and the ranked list is less dense.
6. Repeat a quick spot check on `/en/latest`, `/en/search`, and `/en/hot` to avoid language divergence.
