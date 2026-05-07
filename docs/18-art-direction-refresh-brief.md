# Art Direction Refresh Brief

## Purpose

This document is for the implementation AI.

The site already has a recognizable dark cyber direction.
The problem is not lack of style.
The problem is that the current style language is too close to a generic neon-tech demo.

This brief defines how to make the site look better without changing its identity.

Use this document together with:

- [docs/13-visual-interaction-upgrade-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/13-visual-interaction-upgrade-brief.md)
- [docs/16-discovery-surface-ia-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/16-discovery-surface-ia-brief.md)
- [docs/17-home-discovery-priority-brief.md](/Users/xingmingcheng/workspace/github/innerca.github.io/docs/17-home-discovery-priority-brief.md)

## Current Visual Problem

The current site has:

- dark background
- cyan / purple glow
- glass panels
- particles
- mono accents

Those ingredients are fine.
What is weak is the composition and restraint.

Current risks:

- too much similar glow treatment across all components
- default-looking sans typography
- card surfaces that feel interchangeable
- particles and glass doing more work than layout and type
- pages reading as “styled components on a dark background” instead of a cohesive editorial product

The fix is not to add more effects.
The fix is to make the visual system more intentional and more selective.

## Target Aesthetic

Target feeling:

- research terminal meets editorial publication
- calm, precise, premium
- atmospheric but not noisy

Keywords:

- restrained
- sharp
- layered
- technical
- curated

Avoid:

- gamer neon
- random sci-fi chrome
- everything glowing equally
- over-animated dashboard energy

## What To Keep

Keep these core brand ingredients:

- dark base
- cyan-led accent system
- secondary violet accent
- technical monospace moments
- subtle ambient motion

Do not replace the brand with:

- plain SaaS white cards
- default startup gradients
- soft pastel AI branding

## What To Change

### 1. Cyan should lead, purple should support

Right now cyan and purple are often treated as equal accents.
That makes the UI feel louder and less directed.

Preferred rule:

- cyan = primary highlight
- purple = secondary highlight
- warm accent only for alerts or special ranking emphasis

Use less simultaneous cyan-plus-purple on routine controls.
Reserve two-color gradients for hero moments and special emphasis.

### 2. Reduce always-on glow

Glow should be present, but not constant everywhere.

Preferred rule:

- low ambient glow by default
- brighter glow on focus, hover, or hero moments
- almost no glow on dense content lists

If every card edge and every title glows, nothing feels special.

### 3. Introduce a stronger surface hierarchy

Not every panel should look like the same glass box.

Define at least three surface levels:

- background / canvas
- standard content surface
- featured / spotlight surface

Featured modules should feel materially different from ordinary list cards.

### 4. Typography must carry more of the identity

The current default `Inter + JetBrains Mono` pairing is serviceable but too generic for the site's ambition.

The implementation AI should improve the typography system deliberately.

Acceptable direction:

- use a more distinctive display face for headings
- keep a clean readable sans for body copy
- keep monospace only for metadata, counters, and control labels

Rules:

- headlines should feel more editorial
- metadata should feel more technical
- body text should remain quiet and readable

Do not set large paragraphs in monospace.
Do not let every heading use the same gradient treatment.

## Recommended Visual System

### Palette

Base:

- near-black navy background
- slightly lighter blue-black panels

Primary accent:

- bright cyan for active state, search, focus, key links

Secondary accent:

- muted electric violet for tags, secondary emphasis, featured accents

Support neutrals:

- cool gray text hierarchy
- softer muted line color

Optional warm accent:

- coral or amber only for “hot”, alerts, or exceptional attention states

### Background

The background should feel layered, not flat.

Recommended structure:

- deep base color
- one or two large soft atmospheric gradients
- subtle particle field or noise layer
- dark readability veil under content

Important:

- particles should be quieter than today if they compete with reading
- avoid obvious “screen saver” behavior

### Panels

Preferred panel character:

- deeper contrast
- less milky glass
- more crisp edges
- slightly varied opacity by context

Standard panels:

- subtle border
- limited blur
- restrained hover response

Featured panels:

- richer border treatment
- stronger internal gradient or light wash
- more breathing room

### Borders

Avoid making every border neon.

Preferred:

- default border is cool and quiet
- active border gains cyan
- featured border may use a controlled gradient edge

### Shadows

Shadows should feel like depth, not fog.

Preferred:

- tighter shadows
- more directional glow
- less wide blurred halo

## Component Art Direction

### Hero

The hero should feel like a cover, not a utility banner.

Requirements:

- larger visual tension between heading and supporting copy
- stronger negative space
- one focal action
- one atmospheric visual gesture behind or around the text

Possible gestures:

- orbital line pattern
- abstract signal grid
- subtle radar sweep
- layered gradient disc

Do not add decorative illustration that fights the text block.

### Search Input

The search box is one of the product's signature controls.
It should feel premium and precise.

Requirements:

- slightly heavier visual presence than normal inputs
- crisp border
- clearer inner padding
- refined focus ring
- icon and placeholder alignment that feels intentional

### Paper Cards

Cards need more variety by context.

Current issue:

- many cards feel like the same container repeated

Required distinction:

- list card
- featured card
- ranked hot card

Each should differ in:

- padding
- title scale
- metadata density
- border energy

### Tags and Chips

Tags should feel informative, not toy-like.

Preferred direction:

- smaller
- cleaner
- more typographic
- less puffy

Filter chips may be more interactive.
Passive tags should be quieter.

### Stats

Stats should not look like crypto dashboard counters.

Preferred direction:

- concise labels
- cleaner numerals
- less animation theater
- use alignment and spacing to create authority

### Hot Module

Because `Hot` has heavier cognitive load, its visual language should be warmer and more selective.

Recommended:

- small touches of warm accent
- stronger rank treatment
- less generic cyan glow

This will help it read as a recommendation surface instead of just another list.

### Latest Module

`Latest` should feel sharper and lighter than `Hot`.

Recommended:

- cleaner list rhythm
- cooler tones
- less dramatic emphasis
- stronger date grouping

## Motion Direction

Motion should feel like interface signal, not spectacle.

Preferred motion types:

- fade and lift
- soft reveal
- cursor-like focus energy
- subtle background drift

Avoid:

- large looping animations in content-heavy areas
- exaggerated hover jumps
- flashy stagger on every list

## Typography Direction

The implementation AI should define a clearer type scale.

At minimum:

- hero display size
- page title size
- section title size
- card title size
- metadata size

Suggested behavior:

- hero and top-level headings may use a more expressive typeface
- body and UI copy must stay highly legible
- metadata remains mono but used sparingly

Do not:

- keep every level too close in size
- use gradient text for all headings
- let metadata visually overpower summaries

## Spacing Direction

The site needs stronger rhythm.

Requirements:

- larger vertical spacing between major homepage modules
- tighter spacing inside dense cards
- clearer separation between header copy and filters
- more controlled content widths

The goal is to make the page feel designed, not merely padded.

## Implementation Guidance

The implementation AI should start by defining a small design token layer.

At minimum:

- background tokens
- panel tokens
- line / border tokens
- accent tokens
- text hierarchy tokens
- shadow / glow tokens

This likely belongs in:

- `src/styles/global.css`

Do not scatter visual values randomly across many components if a shared token can express the pattern.

## Suggested File Targets

The implementation AI will likely need to touch:

- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- `src/components/astro/HeroSection.astro`
- `src/components/astro/Navbar.astro`
- `src/components/astro/StatsBar.astro`
- `src/components/astro/TrendingSection.astro`
- `src/components/react/PaperCard.tsx`
- `src/components/react/SearchPage.tsx`
- `src/components/react/LatestContent.tsx`
- `src/components/react/ParticleBackground.tsx`

This is not permission to repaint every component with random new colors.

## What To Avoid

Reject implementations that do any of the following:

- add more glow everywhere without changing hierarchy
- keep all cards visually identical
- leave typography generic and untouched
- make the particle background more obvious instead of more refined
- turn the product into a noisy cyberpunk mockup
- add multiple unrelated accent colors

## Acceptance Criteria

Approve only if all of the following are true:

- the site still feels like the same product, but more refined
- typography feels more intentional than the current default stack
- cyan leads and purple supports
- glow usage is more selective
- featured surfaces and standard surfaces are visually distinct
- the background atmosphere supports reading instead of competing with it
- homepage, search, latest, and hot each gain a cleaner visual identity

## Deliverables Required From The Implementing AI

The implementing AI must provide:

1. The updated color and surface system
2. Typography changes and rationale
3. Which components received featured vs standard treatment
4. How particle/background intensity was adjusted
5. Desktop and mobile visual verification notes

## Reviewer Notes

I am reviewing this work, not implementing it.

Review order:

1. Check whether the visual system became more restrained and intentional
2. Check whether typography improved materially
3. Check whether card and module hierarchy became clearer
4. Check whether background and motion got quieter, not louder
