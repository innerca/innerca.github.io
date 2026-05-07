## Data Pipeline And GitHub Actions Execution Brief

This brief defines how the project should evolve from a single-source static site into a multi-source, AI-enriched, failure-tolerant data product.

This is not a loose design note.

It is an execution document.

The implementation must prioritize:

- heat-score cold start correctness
- replay and backfill safety
- workflow separation
- idempotent daily updates
- failure visibility

The governing rule is:

- assume daily jobs will partially fail
- assume APIs will rate-limit
- assume data will be missing
- assume a successful deploy can still contain incorrect derived data

Design for recovery first.

## Priority Order

The work should be done in this order:

1. heat-score cold start and missing-signal behavior
2. replay and backfill mechanics
3. workflow separation in GitHub Actions
4. AI summary / translation enrichment
5. multi-source expansion

Do not start by wiring more sources or more AI calls if the heat pipeline cannot survive missing days and partial history.

## Current Constraints

The repo already has:

- `fetch.js` as the multi-source fetch coordinator entry
- `summarize.py` for Groq-based summary generation
- `pull_citation_signals.py`
- `pull_hf_signals.py`
- `compute_heat_scores.py`
- `export_heat_json.py`
- `deploy.yml`
- `tag-maintenance.yml`

The repo already preserves these heat metadata fields and they must continue to survive every export:

- `warmup_days`
- `warmup_mode`
- `missing_signals`

These fields are not optional polish.

They are required product truth.

## Product Rule: Data Layers

Separate the system into four layers:

1. raw ingest
2. normalized paper store
3. derived signals and AI enrichment
4. frontend export artifacts

Do not mix these layers together in one opaque step.

Examples:

- fetching arXiv or future sources belongs to raw ingest
- deduped `papers.json` belongs to normalized paper store
- summaries, translations, citation snapshots, HF snapshots, heat scores belong to derived signals
- `search-index.json`, `paper_heat_scores.json`, `field_heat_topn.json`, page-specific browse JSON belong to frontend export artifacts

If one layer fails, the system must preserve the last known good outputs from the other layers.

## Required Workflow Split

Do not keep one giant daily workflow that fetches, enriches, scores, commits, builds, and deploys as a single indivisible run.

Split the automation into separate concerns.

### 1. `push main`

Purpose:

- validate and deploy code changes fast

Must do:

- checkout
- install Node
- install dependencies
- build
- deploy

Must not do:

- fetch new papers
- call Groq
- refresh citations
- refresh HF signals
- recompute heat

This path is for frontend and code shipping only.

### 2. `daily-ingest`

Purpose:

- acquire and normalize new data

Must do:

- fetch enabled sources
- dedup and merge
- update `papers.json`
- update basic stats
- commit `src/data/**`

Must not depend on:

- Groq availability
- citation API availability
- HF availability

The site must still be able to ingest new papers even if every external enrichment source is down.

### 3. `daily-enrich`

Purpose:

- fill summaries and translations incrementally

Must do:

- process only papers missing required enrichment
- enforce per-run cap
- record failures without killing the whole run
- commit only changed derived data

Must not:

- resummarize already-complete papers
- block deployment of raw ingest updates

### 4. `daily-signals`

Purpose:

- update citation and HF signals
- compute heat scores
- export frontend heat artifacts

Must do:

- pull citation snapshots
- pull HF snapshots
- compute heat
- export heat JSON
- refresh derived stats if needed
- commit changed data

Must preserve:

- prior signal history
- warmup metadata
- last known good exports when new scoring cannot complete

### 5. `monthly-maintenance`

Purpose:

- deep repair and cleanup

May do:

- tag review
- historical re-fetch
- consistency repair
- signal gap backfill
- expensive audits

This is the only workflow allowed to run heavier maintenance by default.

## Recommended Trigger Strategy

Preferred structure:

- `push main` for code deploy
- cron or `workflow_dispatch` for `daily-ingest`
- `workflow_run` from ingest success into `daily-enrich`
- `workflow_run` from enrich success into `daily-signals`
- optional deploy after signal refresh if data changed

Do not rely purely on one long cron chain when the pipeline has distinct failure modes.

Separate workflows make it obvious what failed:

- fetch failed
- Groq failed
- citation failed
- heat export failed

That is more important than having fewer YAML files.

## Cold Start: Must-Fix First

Cold start is currently the highest-priority engineering concern.

The system must behave correctly under all three states:

1. `cold`
2. `warmup`
3. `ready`

### Required meaning

`cold`

- no citation snapshots
- burst scoring disabled
- UI and metadata must say signals are incomplete

`warmup`

- fewer than 7 citation snapshots
- burst scoring is partial or reduced-confidence
- UI and metadata must say warmup is in progress

`ready`

- 7 or more snapshots
- burst scoring fully active

### Required implementation behavior

- `compute_heat_scores.py` must never fake burst behavior when history is insufficient
- `export_heat_json.py` must never erase warmup metadata
- frontend must be able to read and expose warmup state
- ranking should degrade gracefully, not pretend to be fully mature

### Required product behavior

If the system is in `cold` or `warmup`, the product must not present the resulting list as if it were fully trustworthy momentum ranking.

The UI can still show hot papers, but it must truthfully indicate incomplete signal maturity where applicable.

## Backfill And Replay Requirements

The pipeline must support re-running history safely.

This is mandatory.

### Required replay scenarios

1. one day of citation snapshots missing
2. several consecutive HF daily snapshots missing
3. Groq failed for a batch and must resume later
4. fetch succeeded but commit failed
5. a bad data deploy must be repaired by replaying derived stages

### Required properties

- replay must be idempotent
- re-running a day must not duplicate papers
- re-running enrichment must not overwrite good fields with empty fields
- re-running signals must not destroy older snapshots
- re-exporting frontend artifacts must be deterministic from the same inputs

### Required operational model

Do not think in terms of “today’s run only”.

Think in terms of:

- rebuild from current raw store
- replay missing derived steps
- restore last good derived state

## Summary And Translation Enrichment

Groq is an enrichment layer, not the spine of the system.

### Required state tracking

Per paper, track at minimum:

- summary presence
- translation presence
- last enrichment attempt timestamp
- enrichment model identifier
- failure count or last failure reason if practical

This can be stored either inline in `papers.json` or in a separate derived-state file.

The key requirement is resumability.

### Required rules

- only process missing or stale records
- impose a per-run cap
- on per-item failure, mark and continue
- on quota failure, stop gracefully and preserve progress

Do not make a free API quota problem look like a pipeline corruption problem.

## Multi-Source Expansion Rules

New data sources should be added behind the existing coordinator, not as bespoke one-off scripts glued directly into deploy.

### Required source contract

Each source adapter must output a normalized record shape before merge.

Each normalized record should preserve:

- source key
- source record ID
- source URL
- fetched timestamp
- source-specific metadata if relevant

### Required dedup contract

Dedup must be stable across:

- repeated ingest from the same source
- same paper arriving from multiple sources
- later enrichment updates

If dedup is ambiguous, preserve raw source provenance rather than silently dropping it.

## Failure Scenarios To Explicitly Design For

The implementation must explicitly handle these failure classes:

### Fetch failures

- source unavailable
- partial source response
- malformed source response
- dedup merge interruption

### Enrichment failures

- Groq quota exhausted
- request timeout
- malformed model response
- translation only partially filled

### Signal failures

- Semantic Scholar temporarily down
- HF Daily Papers unavailable
- only one of the signal sources updated
- snapshots written but compute step failed afterward

### Workflow failures

- commit step failed
- deploy step failed after data commit
- one workflow succeeded and the next never triggered

### Data integrity failures

- snapshot exists but contains partial data
- exported heat JSON no longer matches current meta
- fields silently regress to zero or empty strings

For each failure class, implementation should favor:

- preserve prior good state
- emit visible logs
- permit replay

## Validation Strategy

GitHub Actions is hard to validate by inspection alone.

Therefore the implementation must provide a local simulation path.

This is mandatory.

### Required local validation capability

You must be able to simulate:

1. an empty initial repo state
2. papers arriving one day at a time
3. citation snapshots accumulating one day at a time
4. missing one or more days
5. replaying the missed days
6. recomputing heat after replay

### Recommended validation shape

Provide a local script or documented command sequence that can:

- move or subset papers into staged daily batches
- run fetch-normalize-enrich-signal-export stages independently
- inspect `heat_score_meta.json` after each stage
- confirm transition:
  - `cold -> warmup -> ready`

### Required validation outputs

At minimum, validation must prove:

- warmup metadata is correct after each simulated day
- rankings remain stable under re-run
- no duplicate papers appear
- missing-day replay improves warmup state instead of corrupting it
- exported frontend artifacts still build

## Acceptance Criteria

This work is not done until all of the following are true:

1. code deploy no longer depends on data refresh jobs
2. data ingest can succeed even when Groq is unavailable
3. signal refresh can fail without destroying existing heat artifacts
4. cold start, warmup, and ready states are preserved in metadata
5. missing signal days can be replayed without duplication
6. local simulation exists for day-by-day validation
7. workflow boundaries make it obvious which stage failed
8. derived data commits remain scoped to `src/data/**`

## Non-Negotiable Rules

- Do not merge more sources before cold-start and replay logic are solid.
- Do not treat free-model quota failures as hard pipeline failures.
- Do not let export steps erase warmup metadata.
- Do not build a system that only works when every daily job succeeds perfectly.
- Do not call the pipeline “done” until replay and warmup states are locally validated.

## Deliverable Expectation For The Next Implementation Round

The next engineering pass should produce:

- updated workflow files
- clear workflow separation
- resumable enrichment behavior
- documented replay path
- documented local validation path
- explicit heat cold-start acceptance notes

If the implementation only adds more data sources or more AI calls without these controls, it should be rejected.
