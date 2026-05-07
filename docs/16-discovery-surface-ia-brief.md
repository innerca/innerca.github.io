# Discovery Surface IA Brief

## Purpose

This document is for the implementation AI.

The site currently has three overlapping discovery surfaces:

- `Search`
- `Latest`
- `Hot`

They are all useful, but their roles are not clearly separated from a user point of view.

Right now the system makes more sense to the builder than to the visitor.

This brief defines how these three surfaces should relate to each other.

Use this document together with:

- [docs/13-visual-interaction-upgrade-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/13-visual-interaction-upgrade-brief.md)
- [docs/14-search-index-splitting-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/14-search-index-splitting-brief.md)
- [docs/15-optional-fulltext-search-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/15-optional-fulltext-search-brief.md)

## Core Product Decision

These pages should not all feel like slightly different paper lists.

They need distinct user jobs:

- `Search` = I know roughly what I want
- `Latest` = I want to scan recent additions quickly
- `Hot` = I want a ranked recommendation view

If these roles are not obvious from the first screen, the IA is weak.

## Key Correction

`Latest` is not just a passive archive page.

It already has discovery and filtering behavior, and should be treated as a lightweight browsing search surface.

That means:

- it needs a stronger “browse recent papers” identity
- it may include scoped query/filter behavior
- it should not be documented as only a grouped list

At the same time:

`Hot` carries more cognitive burden because users must trust a ranking model.

Even if the heat-score logic is good, the page still asks the user to understand:

- what “hot” means
- why the ranking exists
- why one paper outranks another

So `Hot` should be treated as a secondary recommendation surface, not the default discovery path.

## Desired Role Split

### Search

User job:

- precise or semi-precise retrieval
- search by title, author, keywords, tags
- optionally expand into full-text search

Product posture:

- direct
- powerful
- tool-like

This is the best page for users who arrive with intent.

### Latest

User job:

- browse what is new
- quickly narrow recent papers by topic
- lightly search within recent additions

Product posture:

- fast
- low-friction
- editorial feed

This should be the easiest page for casual repeat visits.

### Hot

User job:

- see what the system recommends paying attention to
- explore papers with unusually strong recent momentum

Product posture:

- guided
- explainable
- selective

This should feel like a recommendation layer, not the main default path.

## Navigation / Emphasis Rules

The product should emphasize surfaces in this order:

1. `Latest`
2. `Search`
3. `Hot`

Reason:

- `Latest` is easiest to understand
- `Search` is the most universally useful
- `Hot` is the most opinionated and therefore the heaviest cognitively

This does not mean removing `Hot`.
It means reducing the chance that users must understand the ranking model before they can browse the site.

## Latest Requirements

### Latest should gain a clearer discovery role

`Latest` must not read as:

- a backup list
- an implementation detail of the data feed
- just date groups plus chips

It should read as:

- a recent papers feed
- a lightweight recent-discovery console

### Recommended first-screen structure for Latest

1. page title and short explanation
2. summary row
3. scoped browse controls
4. recent groups / cards

Summary row should include some combination of:

- papers shown
- active days
- latest update date
- selected topic count

Scoped browse controls may include:

- category filters
- source filters if cheap
- optional local query input for recent papers only

Important:

If a query input is added to `Latest`, it should not compete with the main global `Search` page.
Its framing should make scope explicit:

- `Search recent papers`
- `在最新收录中搜索`

## Search Requirements

`Search` remains the primary retrieval surface.

It should handle:

- broad search across the catalog
- optional full-text search
- the most complete filter controls

Do not weaken `Search` just because `Latest` also has lightweight retrieval.

The distinction should be:

- `Latest` searches within recency-oriented browsing
- `Search` searches the broader corpus

## Hot Requirements

### Hot should reduce user burden

The current problem with `Hot` is not necessarily the formula.
The problem is the amount of explanation the user has to infer.

Users should not need to reverse-engineer:

- whether Hot means citations
- whether Hot means recency
- whether Hot means social buzz
- whether Hot means editorial recommendation

### Required product treatment

`Hot` must explicitly frame itself as ranked guidance.

The page should:

- explain in one short line what the ranking reflects
- avoid overloading users with raw scoring language
- emphasize top recommendations, not just the existence of a score

### Recommended copy direction

Better framing:

- `Signals worth watching`
- `Recently rising papers`
- `Selected by recent heat signals`

Worse framing:

- long technical explanations above the fold
- forcing users to parse a score system before seeing value

### How much score detail to show

Do not foreground the numeric heat score as the main product.

Preferred:

- rank emphasis
- compact tag or short explanation
- optional “how this works” disclosure

Acceptable examples:

- `Rising fast`
- `Strong recent attention`
- `With code`
- `Top venue`

The score may still exist, but it should support interpretation, not dominate the page.

## Home Page Implications

The homepage should reflect this IA.

Preferred discovery entry order:

- primary: search
- secondary: latest
- tertiary: hot

Recommended modules:

- hero search
- latest / recent band
- one compact hot module

Do not let homepage discovery depend mainly on `Hot`.

## Cross-Linking Rules

The pages should reinforce each other.

Recommended links:

- `Latest` header or footer can link to `Search all papers`
- `Search` empty states can link to `Latest`
- `Hot` can link to `Latest` for users who want a simpler browse mode

Examples:

- `Want the freshest additions? View Latest`
- `Need a broader search? Open Search`
- `Prefer browsing by recency? Back to Latest`

## Optional Full-Text Scope

If optional full-text search is implemented, it should apply carefully.

### Search page

This is the primary place for optional full-text activation.

### Latest page

Do not blindly duplicate the same full-text prompt on `Latest`.

Preferred rule:

- `Latest` stays lightweight by default
- if it gains a query box, it should use quick-search fields only
- only add full-text activation here if there is a strong product reason

Default recommendation:

- full-text optional modal belongs on `Search`
- `Latest` should remain a lighter browsing surface

## What To Avoid

Reject implementations that do any of the following:

- make `Latest`, `Search`, and `Hot` feel interchangeable
- place equal visual emphasis on all three surfaces
- turn `Hot` into a score-explainer page
- turn `Latest` into a second copy of `Search`
- make users encounter ranking logic before they can simply browse recent papers

## Suggested Copy Direction

Use language users can understand quickly.

### Latest

- `Latest Papers`
- `Browse recent additions by date and topic`

### Search

- `Search Papers`
- `Find papers by title, author, topic, or keyword`

### Hot

- `Hot Papers`
- `Papers with strong recent attention signals`

Or a lighter alternative:

- `Trending Signals`
- `Recently rising papers across the catalog`

The exact wording can vary.
The role split cannot.

## Acceptance Criteria

Approve only if all of the following are true:

- `Latest` clearly reads as the easiest recent-discovery surface
- `Search` clearly reads as the strongest retrieval surface
- `Hot` clearly reads as an optional ranked recommendation surface
- users can understand each page’s role from the first screen
- the homepage does not over-prioritize `Hot`
- `Latest` is not treated as a dumb archive page

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. A short explanation of the final role split between `Latest`, `Search`, and `Hot`
2. Exact pages and components changed
3. New copy used for page headers and helper text
4. What was done to reduce `Hot` user burden
5. What was done to strengthen `Latest` as a discovery surface

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Check whether `Latest` gained stronger browse identity
2. Check whether `Hot` became easier to understand
3. Check whether `Search` still owns broad retrieval
4. Check whether the homepage reflects the new emphasis order
