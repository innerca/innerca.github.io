# Brand / Copy / Typography Brief

## Purpose

This document is for the implementation AI.

The current project can look better only up to a point if the language layer stays generic.

Three things now feel under-designed:

- project name
- homepage copy
- typography system

These are not separate polish items.
They define whether the product feels like a real publication tool or a styled prototype.

Use this document together with:

- [docs/17-home-discovery-priority-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/17-home-discovery-priority-brief.md)
- [docs/18-art-direction-refresh-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/18-art-direction-refresh-brief.md)
- [docs/16-discovery-surface-ia-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/16-discovery-surface-ia-brief.md)

## Current Problems

### 1. Project name is functional, not brand-level

Current naming examples:

- `PAPER_RADAR`
- `AI Paper Radar`
- `AI 学术前沿雷达`

These are understandable, but still feel like placeholder product naming.

Problems:

- underscore wordmark reads like an internal codename
- English name is descriptive but generic
- Chinese name is understandable but slightly long and formal

### 2. Homepage copy is too abstract and infrastructure-heavy

Current lines like:

- `Daily Tracking · AI Translation · Open Knowledge Hub`
- `每日追踪 · AI 驱动翻译 · 开放知识中枢`

They describe platform capabilities, but not the user benefit clearly enough.

Problems:

- sounds like system capability text
- does not immediately tell the user what they can do here
- “Open Knowledge Hub” is broad and generic

### 3. Typography is too generic for the intended product quality

Current setup:

- `Inter`
- `JetBrains Mono`

This is acceptable technically but too default visually.

Problems:

- too similar to countless product demos
- not enough distinction between editorial hierarchy and technical metadata
- wordmark, hero, and page titles do not have a distinctive voice

## Product Positioning

The product should read as:

- a research discovery tool
- a curated paper feed
- a signal layer over noisy academic streams

It should not read as:

- a generic AI portal
- a backend dashboard
- a hacker side-project with a cool theme but no editorial voice

## Naming Direction

### Naming goals

The name should be:

- short
- memorable
- easy to render in zh/en
- compatible with a research / signal / radar identity

It should not feel:

- overly literal
- too infra-like
- too startup-generic
- too playful for the rest of the site tone

### Wordmark rule

Do not keep underscore styling as the core brand expression unless there is a very strong reason.

`PAPER_RADAR` currently reads more like a repo or internal tool than a polished product.

Preferred direction:

- cleaner wordmark
- optional small technical accent
- stronger title-case or compact all-caps system

### Acceptable naming directions

The implementation AI may propose one final direction, but it must be coherent in both languages.

Possible English directions:

- `Paper Radar`
- `Signal Papers`
- `Paper Signal`
- `Frontier Radar`
- `Research Radar`

Possible Chinese directions:

- `论文雷达`
- `前沿雷达`
- `研究雷达`
- `AI 论文雷达`

Important:

- do not over-index on “AI” if it makes the name clumsy
- do not choose a name that sounds like a VC fund or crypto product

### Naming recommendation

Preferred bias:

- simpler, cleaner, less repo-like

For example, a direction closer to:

- English: `Paper Radar`
- Chinese: `AI 论文雷达` or `前沿论文雷达`

is stronger than keeping:

- `PAPER_RADAR`

The implementation AI may propose a better final pair, but it must explain why.

## Homepage Copy Direction

### Copy goals

Homepage copy should answer:

- what this product helps me do
- why it is useful
- what I should click first

It should not sound like:

- feature checklist copy
- infrastructure copy
- generic AI slogan copy

### Hero copy requirements

Hero title can remain concise.
Hero subtitle must become more user-centered.

Preferred content themes:

- discover new papers faster
- cut through noisy feeds
- browse recent signals and research directions

### Good copy direction

English examples:

- `Track new AI papers without digging through noisy feeds`
- `Search, scan, and follow the papers worth your attention`
- `A cleaner way to discover recent AI research`

Chinese examples:

- `不用翻噪声信息流，也能快速发现新论文`
- `更高效地搜索、浏览并追踪 AI 研究`
- `用更清晰的方式发现最近的 AI 论文`

### Bad copy direction

Avoid copy like:

- capability triples split by dots
- “open knowledge hub”
- “AI-powered translation” as the lead promise

Those can still exist deeper in the site if needed, but should not lead the homepage.

## Navigation Copy

Navigation labels should be short, stable, and low-friction.

Current direction is acceptable:

- `Latest`
- `Search`
- `Hot`

But the implementation AI may improve labels if it strengthens comprehension.

Examples:

- `Hot` could remain `Hot`
- or become `Signals` / `Trending`

Only change it if the new label is clearly easier to understand.

Do not rename things casually and create inconsistency across pages.

## Module Copy

### Latest

Should sound easy and useful.

Good direction:

- `Latest Additions`
- `Browse recent papers by topic and date`

### Search

Should sound precise and capable.

Good direction:

- `Search Papers`
- `Find papers by title, author, topic, or keyword`

### Hot

Should sound guided, not algorithm-worshipping.

Good direction:

- `Rising Signals`
- `Papers with strong recent attention`

Avoid:

- over-explaining heat score in primary copy
- abstract quant language above the fold

## Typography System

### Core requirement

Typography must do more of the aesthetic work.

The implementation AI should not rely only on glow, blur, and particles to create identity.

### Desired type roles

Define at least three distinct roles:

- display / brand
- body / interface
- metadata / technical

### Recommended structure

1. Display face

Use for:

- wordmark
- hero headline
- major section titles

This should feel more distinctive than `Inter`.

2. UI/body sans

Use for:

- body text
- summaries
- general interface copy

This should stay highly legible.

3. Monospace

Use for:

- metadata
- filters
- counters
- secondary labels

This should remain restrained.

### Font direction

The exact font choice is implementation detail, but the character should be:

- editorial-tech
- crisp
- not default corporate SaaS

The implementation AI may use hosted web fonts if they are reasonable in weight and performance.

### Typography rules

- hero headline should not look like a default product header
- page titles should be calmer than hero, but still distinctive
- metadata must not overpower summaries
- monospace should not dominate long lines of explanatory copy
- gradient text should be selective, not universal

## Wordmark Rules

If the project name changes, the wordmark treatment must also improve.

Requirements:

- cleaner lockup
- less repo-like formatting
- better relation between brand text and navigation

The wordmark should feel like a publication masthead or research label, not a GitHub folder name.

## Scope Of Rename

If the implementation AI changes the product name, it must update it consistently across:

- `src/config/site.ts`
- navbar
- footer
- page titles
- hero
- metadata where visible

Do not partially rename the product and leave mixed branding everywhere.

## What To Avoid

Reject implementations that do any of the following:

- keep the generic homepage copy unchanged
- swap one generic slogan for another generic slogan
- keep typography functionally identical while claiming brand improvement
- use an over-stylized display font that hurts readability
- rename the product without coherent zh/en treatment
- keep `PAPER_RADAR` only because it already exists in code

## Suggested File Targets

The implementation AI will likely need to touch:

- `src/config/site.ts`
- `src/lib/i18n.ts`
- `src/layouts/BaseLayout.astro`
- `src/components/astro/Navbar.astro`
- `src/components/astro/HeroSection.astro`
- `src/styles/global.css`

Potentially also:

- any page title strings
- footer copy

## Acceptance Criteria

Approve only if all of the following are true:

- the project name feels more product-grade than `PAPER_RADAR`
- homepage copy becomes user-centered, not infrastructure-centered
- the hero promise is clearer and more compelling
- typography changes are visible and intentional
- display, body, and metadata type roles are clearly separated
- zh/en naming and copy are consistent in tone and quality

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. Final project name and zh/en rationale
2. Updated homepage headline and subtitle in both languages
3. New nav / module labels if changed
4. Final font stack and role mapping
5. Exact files changed

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Check whether branding feels less like a codename
2. Check whether homepage copy became materially clearer
3. Check whether typography now contributes real identity
4. Check whether zh/en treatment stays coherent
