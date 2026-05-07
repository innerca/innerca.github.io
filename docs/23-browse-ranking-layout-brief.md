## Browse Ranking And Layout Brief

This brief answers the remaining product questions around:

- whether `Search` should prioritize heat
- whether `Latest` / `Rising Signals` should show fewer papers
- how `Latest` and `Rising Signals` should align in layout
- whether category filtering needs two levels
- whether the homepage is currently too heavy

This brief is intentionally explicit so it can be implemented without visual back-and-forth.

## Short Answers

### Should Search prioritize heat?

Yes, but only as a secondary ranking signal.

Do not let heat override search relevance.

Use:

- primary: text relevance
- secondary: heat
- tertiary: recency

If the user searches an exact title, author, or keyword, that should still win over a hotter but less relevant paper.

### Is `Latest` too heavy at 332 papers in one day?

Yes.

`Latest` cannot default to showing an effectively unlimited day feed.

It should show a curated first slice and hide the rest behind explicit expansion.

### Are category colors too weak?

Yes, but color is not the core issue.

The bigger issue is that low-level category controls are too numerous and too exposed.

Improve both:

- stronger selected/inactive states
- less taxonomy exposed by default

### Does filtering need two levels?

Yes.

Use:

- Level 1: major domain filters
- Level 2: advanced/raw category filters

### Is AI overweighted?

Yes.

Any frequency-based top-category system will overproduce `cs.LG`, `cs.CV`, `cs.CL`, `cs.AI`.

Do not let raw arXiv frequency directly define the browse IA.

### Are `Top Fields` useful?

No, not in the current form.

If `Top Fields` is only decorative or frequency-based, remove it.

If kept, it must be:

- actionable
- user-readable
- tied to filters

### Should Latest and Rising Signals show fewer papers?

Yes.

Both should shift from “long feed” to “selective shortlist + explicit expansion”.

### Is the homepage currently heavy?

Structurally, yes.

Even though production JS is not catastrophic, the homepage still renders too much content and hydrates too many interactive pieces for a landing page.

## Search Ranking

### Recommended sort logic

When query is present:

1. text relevance
2. heat score
3. recency

When query is empty:

- do not show a giant raw category wall
- show a lightweight browse state instead

Recommended empty state:

- `Rising now`
- `Recently added`
- `Browse by domain`

This makes better use of heat than globally sorting every search result by heat.

### Why not make heat primary?

Because `Search` is still a search surface, not a recommendation surface.

If heat becomes primary:

- exact matches can get buried
- author/title lookup becomes less predictable
- the page starts acting like `Rising Signals`

That collapses the role split between surfaces.

## Category System

### Two-level filter model

Use a two-level filter hierarchy everywhere filtering is exposed.

#### Level 1: domain filters

Human-readable buckets only.

Recommended examples:

- `All`
- `Language`
- `Vision`
- `Agents`
- `Multimodal`
- `Robotics`
- `Audio`
- `Science / Math`

These should be the default visible controls.

#### Level 2: advanced category filters

Only after choosing `More filters` or `Advanced`.

This level can contain:

- `cs.CL`
- `cs.CV`
- `cs.LG`
- `math.OC`
- `stat.ML`
- etc.

Do not expose this full level inline on first paint.

### Why this matters

Raw taxonomy codes are:

- too technical
- too dense
- too visually repetitive

They are useful as a power-user control, not as the primary browse surface.

## AI Weighting

### Current issue

Raw top primary categories are heavily AI-skewed:

- `cs.LG`
- `cs.CV`
- `cs.CL`
- `cs.AI`

That means any naïve “top fields” or “category preview” will become mostly the same AI cluster.

### Required correction

Build browse groups from a curated mapping, not direct frequency.

Example mapping approach:

- `Language` = `cs.CL`
- `Vision` = `cs.CV`
- `Foundation / Learning` = `cs.LG`, `cs.AI`
- `Agents / IR` = `cs.IR`, `cs.MA`, `cs.RO`
- `Audio / Speech` = `eess.AS`, `eess.SP`
- `Science / Math` = selected `physics`, `math`, `stat`, `q-bio`

Then apply diversity caps:

- do not let one super-domain occupy most visible browse modules
- ensure at least one non-core-AI bucket is visible in homepage/category discovery

## Remove Or Replace Top Fields

`Top Fields` is weak if it only says:

- these categories happen to be frequent

That gives the user little value.

Replace with one of:

- `Browse by domain`
- `Today’s active areas`
- `Focus areas`

But only if those labels are clickable and actually narrow content.

Otherwise remove the module.

## Exact Layout Alignment

This section is intended for implementation without visual ambiguity.

### Shared shell for Latest and Rising Signals

Both pages should use the same vertical rhythm:

1. header block
2. overview strip
3. filter row
4. featured zone
5. expandable compact list

### Header block

Use:

- `max-w-3xl`
- title
- one-line explanation
- one supporting link only if necessary

Do not let header copy spill into multiple explanatory layers.

### Overview strip

Use one horizontal band immediately below the header.

Desktop:

- 3 small stat pills

Mobile:

- 2 rows max

Recommended content:

For `Latest`:

- `Today: 332`
- `Yesterday: 370`
- `This week: 1812`

For `Rising Signals`:

- `Top picks: 12`
- `New and rising`
- `Based on recency + citations + activity`

### Filter row

Directly under the overview strip.

Visible by default:

- 5 to 7 domain chips max
- one `More filters` button

Not visible by default:

- raw taxonomy wall

### Featured zone

#### Desktop

Use a `12-column` grid:

- left `7 columns`: one featured large card
- right `5 columns`: 4 compact rows stacked vertically

#### Mobile

- one featured card
- then 4 compact rows

This creates a strong starting point without dumping a full feed.

### Compact list section

Below the featured zone:

- use compact rows, not full summary cards
- each row should include:
  - rank or label
  - title
  - authors
  - one metadata line
  - one short reason cue if on `Rising Signals`

No long summary blocks here.

## Quantity Limits

### Latest page

Default visible count:

- `Today`: `8` papers max
- `Yesterday`: `4` preview papers max
- older days: collapsed count only

Expansion:

- `Load 8 more`
- `View all 332 from today`

Do not auto-render 300+ papers.

### Rising Signals page

Default visible count:

- `3` featured
- `9` compact rows

Total first-load visible:

- `12`

Expansion:

- `Load 12 more`
- optional `View full ranking`

Do not render `100` papers by default.

### Homepage

Current homepage is structurally too busy.

Right now it renders:

- `6` latest preview cards
- `6` rising preview cards
- `24` category papers (`4 groups * 6`)

That is roughly `36` paper cards on the landing page.

Reduce it.

Recommended homepage target:

- `Latest`: `4`
- `Rising Signals`: `4`
- `Browse by domain`: `2 to 3` groups, `2` papers each

That brings homepage paper exposure down to about `12` to `14` items.

## Homepage Weight Assessment

### What was observed

Local dev HTML for `/zh` is about `368KB`, but that includes dev-mode inline CSS, so it is not a clean production metric.

More importantly, the structure is still heavy:

- homepage renders many full paper cards with summaries
- category section hydrates many cards with `client:load`
- global particle background hydrates on page load
- three external font families are loaded from Google Fonts

Production client chunks are not huge by themselves, but the landing page is still heavier than it needs to be for its job.

### Practical conclusion

Homepage is not “catastrophically slow” by JS bundle size alone.
But it is too heavy in:

- HTML content volume
- information density
- number of cards
- eager hydration footprint

So yes, it should be slimmed down.

## Implementation Priorities

1. Make `Search` sort by relevance first, heat second.
2. Introduce two-level filtering: domain first, raw taxonomy second.
3. Remove the full raw category wall from default `Latest` and `Search`.
4. Cap `Latest` and `Rising Signals` default visible counts aggressively.
5. Align both pages to the same shell: header, overview, filters, featured, compact list.
6. Reduce homepage from ~36 visible cards to ~12-14.
7. Do not use frequency-only `Top Fields` as a homepage information module.
