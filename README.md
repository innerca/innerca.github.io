# Paper Radar / AI 论文雷达

A static AI paper discovery site focused on scanability, bilingual reading, and lightweight browsing.

`Paper Radar` tracks recent AI papers, groups them into clearer discovery surfaces, and publishes everything as a pure static site. The product is built around a simple principle: default to light, scannable information first; let deeper reading and heavier search happen on demand.

## What This Project Is

This is not a general academic database UI and not a backend-heavy paper platform.

It is a curated static discovery layer for recent AI research:

- `Home` gives a quick editorial overview of what is new and what is worth checking first.
- `Latest` is for date-based browsing of newly collected papers.
- `Rising Signals` highlights papers gaining attention based on multiple signals, not just raw recency.
- `Search` starts with lightweight metadata search and can optionally unlock heavier full-text search.
- `Paper Detail` provides bilingual summaries, metadata, and source links.

The site is fully static and deploys to GitHub Pages.

## Product Direction

The current product direction is:

- lightweight by default
- strong scanability on mobile and desktop
- bilingual `/en` and `/zh` routes
- human-readable grouped categories instead of raw taxonomy everywhere
- ranked surfaces that explain why something is worth opening
- optional depth instead of forcing every user to download or parse everything up front

## Data Pipeline

The data pipeline is build-time and repository-driven.

1. `scripts/fetch.js` pulls and merges recent papers.
2. `scripts/summarize.py` generates bilingual summaries and supporting metadata.
3. `scripts/pull_citation_signals.py` stores daily citation snapshots.
4. `scripts/pull_hf_signals.py` stores Hugging Face Daily Papers snapshots.
5. `scripts/compute_heat_scores.py` computes ranking signals for the recent window.
6. `scripts/export_heat_json.py` exports frontend-facing heat metadata.
7. GitHub Actions commits refreshed `src/data/**`, builds the site, and deploys `dist/`.

Core content lives in:

- `src/data/papers.json`
- `src/data/paper_heat_scores.json`
- `src/data/field_heat_topn.json`
- `src/data/heat_score_meta.json`
- `src/data/signals/**`

## Heat Model

`Rising Signals` and other ranked surfaces use a multi-signal heat model over the recent `180`-day window.

Base score combines:

- field-normalized citation signal
- Hugging Face community buzz
- venue authority
- freshness decay by age bucket
- a reserved code signal slot

Burst bonus adds extra lift when enough history exists, especially for citation deltas and recent community appearance.

The system also tracks warmup state:

- `cold`: no citation history yet
- `warmup`: `1-6` daily snapshots
- `ready`: `7+` daily snapshots, citation burst is fully enabled

That state is exported in `heat_score_meta.json` so the site can distinguish between early and mature ranking periods.

## Search Strategy

Search is intentionally split into two levels:

- default quick search over lighter metadata fields
- optional full-text search, activated by the user when they want deeper recall

This keeps the default experience lighter for a static site while still allowing deeper search when needed.

## Frontend Stack

- Astro 4
- React 18 islands
- Tailwind CSS 3
- TypeScript
- Framer Motion

The frontend is static-first. Interactive React islands are used only where they materially improve browsing or search.

## Deployment

The project deploys through GitHub Actions to GitHub Pages.

- `push` to `main`: build and deploy
- scheduled / manual workflows: refresh data, recompute heat, commit updated data, then deploy

This separation keeps normal code pushes fast while preserving a durable daily data pipeline.

## Local Development

```bash
npm install
npm run dev
```

Build locally:

```bash
npm run build
npm run preview
```

Run the data pipeline manually:

```bash
npm run fetch
python scripts/summarize.py
python scripts/pull_citation_signals.py
python scripts/pull_hf_signals.py
python scripts/compute_heat_scores.py
python scripts/export_heat_json.py
```

If you use AI summarization locally, set:

```bash
export GROQ_API_KEY="..."
```

## Repository Structure

```text
src/
  components/        UI components
  config/            category, site, and feature config
  data/              core paper data and derived ranking artifacts
  layouts/           Astro layouts
  lib/               search, heat, grouping, i18n helpers
  pages/             bilingual routes
  styles/            global styles

scripts/
  fetch.js
  summarize.py
  pull_citation_signals.py
  pull_hf_signals.py
  compute_heat_scores.py
  export_heat_json.py
```

## Status

The project is actively iterating on:

- lighter default browse flows
- clearer ranking surfaces
- optional-depth search
- stronger bilingual consistency
- better visual hierarchy across home, latest, and rising views

## License

MIT
