# Indexing — Search Console Truth (Real Integration Only)

> Module 18 of the seo-ranking skill · Location: `site-level/` · **OPTIONAL MAINTENANCE REFERENCE — never auto-runs when an article is generated** · Load when: indexation or search-performance reporting is explicitly requested AND a real Search Console (or equivalent API) integration exists

## Purpose

Report what the site's pages are actually doing in Google's index and in search performance — using ONLY real Search Console data. This module is the feedback loop of the whole skill: it turns indexing status and performance trends into concrete next actions (refresh candidates, coverage optimization, title/meta rewrites). It only runs when a real integration exists; without one, everything here is UNAVAILABLE and this module says so plainly — no estimated clicks, no remembered rankings, no invented positions.

The module's discipline is hygiene: consistent windows, recorded export dates, reason strings reported verbatim. Every number in its output is traceable to the API export that produced it.

## Inputs

| Input | Required | If absent |
|---|---|---|
| Real Search Console API integration (verified) | Yes — hard precondition | Module does not run; every output is UNAVAILABLE |
| GSC export: sitemap + indexation data | Yes | Sitemap/indexation reporting → UNAVAILABLE |
| GSC export: performance data (clicks, impressions, CTR, position, per-query) | Yes | Performance reporting → UNAVAILABLE |
| `cms_inventory` | Optional | Per-page joins degrade; note it |
| Consistent comparison windows (e.g., last 28 days vs. previous 28 days) | Yes for trends | Trend statements impossible — snapshots only, labeled as such |

## Procedure

1. Verify the integration is real and the export is fresh: record the export date; GSC sampling delays run ~2–3 days, so data younger than that is incomplete (SEO-IX-09).
2. Report sitemap status: submitted / discovered / indexed / error counts per sitemap.
3. Report indexation: indexed pages; NOT-indexed pages WITH Google's reason strings.
4. Report indexing errors: server errors, redirect errors, 404s — with counts and affected URLs.
5. Report performance metrics: clicks, impressions, CTR, average position — totals plus per-query breakdowns.
6. Read trends, not snapshots: compare consistent windows; treat a single day as noise; annotate seasonality where known (SEO-IX-06).
7. Translate the data into decisions per the mapping in SEO-IX-07; emit the report with the data freshness timestamp.

## Rules

- **SEO-IX-01 · Real integration or nothing.** This module ONLY runs when a real Search Console (or equivalent API) integration exists. Otherwise everything here is UNAVAILABLE — stated plainly in the output. WHY: "indexed pages", "clicks", and "position" are measurements; a fabricated measurement poisons every downstream decision (refresh priorities, optimization targets) and violates the Data Availability Policy at its strictest.
- **SEO-IX-02 · Sitemap status.** Report submitted/discovered/indexed/error counts per sitemap from the real API. A sitemap with large numbers of pages stuck in "discovered—currently not indexed" is a finding that feeds the Sitemap & Indexation technical category.
- **SEO-IX-03 · Not-indexed pages WITH reasons.** Every not-indexed page is reported WITH its reason string: "crawled—currently not indexed", "discovered—currently not indexed", "duplicate without canonical", "redirected", "noindex". The reason drives the fix: quality/consolidation for the first two; canonical correction for the third; redirect-map review for the fourth; intended-versus-unintended review for the fifth.
- **SEO-IX-04 · Indexing errors.** Server errors, redirect errors, and 404s on submitted/indexed URLs — with counts and URLs, feeding `broken_link` / `redirect_chain` findings where appropriate.
- **SEO-IX-05 · Performance metrics.** Clicks, impressions, CTR, average position — totals plus per-query breakdowns. All numbers come from the real API export, and the report carries the data freshness timestamp.
- **SEO-IX-06 · Trend rules.** Read trends, not snapshots: compare consistent windows (like-for-like day counts); a single day proves nothing; annotate seasonality where it explains movement. A 3-day dip during a holiday week is noise; a 6-week decline across consecutive windows is a signal.
- **SEO-IX-07 · Data feeds decisions (deterministic mapping).**
  - Declining clicks AND declining position on a page → refresh candidate → `CONTENT-REFRESH.md`.
  - Queries where the page ranks ~8–20 with impressions → optimization candidates → coverage and intent-alignment work (`TOPIC-COVERAGE.md`, `SEARCH-INTENT.md`).
  - Queries with impressions but ~zero clicks → title/meta rewrite candidates → `ON-PAGE-SEO.md`.
- **SEO-IX-08 · Never fabricate Search Console data.** Numbers must come from the real API export. No estimates, no "typical" values, no plausible-looking gap fillers — these numbers steer real work and real budgets.
- **SEO-IX-09 · Data hygiene.** GSC sampling delays run ~2–3 days; record the export date on every report; do not compare windows of different lengths; do not treat a mid-week partial export as complete.

## Not-indexed reasons → fixes

| GSC reason string | What it means | Typical fix route |
|---|---|---|
| "Crawled—currently not indexed" | Google crawled the page and chose not to index it (selection/quality signal) | `CONTENT-REFRESH.md` for quality; consolidation for near-duplicates |
| "Discovered—currently not indexed" | Known URL, not yet crawled (crawl budget / queue) | internal linking (`INTERNAL-LINKING.md`), sitemap hygiene (`TECHNICAL-SEO.md`) |
| "Duplicate without canonical" | Another URL was selected as the canonical | canonical correction (`TECHNICAL-SEO.md`, audit item 5) |
| "Redirected" | The URL redirects; the destination is indexed instead | verify the redirect map is intentional |
| "noindex" | A noindex directive is in effect | intended → keep; unintended → `noindex_unintended` CRITICAL |

## Trend reading, in practice

- Compare like-for-like windows (28 days vs. 28 days); never 28 vs. 21.
- Judge direction over at least 3 consecutive windows before acting on it.
- Annotate known seasonality (holiday topics, gardening cycles, tax season) before interpreting dips and spikes.
- Separate brand queries from non-brand when the breakdown allows it — brand declines mean something different from visibility declines.
- Respect GSC's anonymization of rare queries: tiny-count rows are noisy by construction; do not build decisions on single-digit impressions.

## Worked mini-example

Shared scenario article with a real GSC export (numbers illustrative of shape only — a real report carries the API's numbers):

- Query "how to store fresh basil": impressions rising, average position 9.2, clicks flat → a page-8–20 optimization candidate: coverage and intent-alignment work (`TOPIC-COVERAGE.md`, `SEARCH-INTENT.md`).
- Query "how long does fresh basil last": impressions 640, CTR 0.3% → title/meta rewrite candidate (`ON-PAGE-SEO.md`): the current title does not answer the duration question searchers see in the snippet.
- Page-level clicks declining while position holds → refresh candidate (`CONTENT-REFRESH.md`): the page stays visible but loses appeal — usually a snippet/freshness problem, not a ranking problem.

## Output

```json
{
  "indexing_report": {
    "integration": "verified",
    "data_freshness": { "exported_at": "2025-01-15T10:30:00Z", "sampling_note": "GSC data lags ~2-3 days" },
    "sitemaps": [ { "path": "/sitemap.xml", "submitted": 120, "indexed": 104, "errors": 1 } ],
    "not_indexed": [ { "url": "/old-guide", "reason": "redirected" } ],
    "indexing_errors": [ { "url": "/broken-page", "type": "404", "occurrences": 12 } ],
    "performance": {
      "window": "2024-12-18..2025-01-14 vs previous 28 days",
      "clicks": 1840,
      "impressions": 41200,
      "ctr": 4.47,
      "average_position": 12.8,
      "trend": "clicks declining six consecutive weeks; no known seasonality for the topic"
    },
    "decisions": [
      { "signal": "declining clicks and position on /how-to-store-fresh-basil", "action": "refresh candidate", "module": "CONTENT-REFRESH.md" }
    ]
  }
}
```

Illustrative shape only — every number in a real report comes from the API export, never from this example. When no integration exists, the entire output is `{ "indexing": "UNAVAILABLE", "reason": "no verified Search Console integration" }`.

## Quality Checks

This module reports measurements; it owns no SEO-Vxx checks of its own. Its findings feed the Technical Score's **Sitemap & Indexation** category (`SCORING.md`, weight 20) via issue types such as `sitemap_missing_page`, and its decisions route to `CONTENT-REFRESH.md` / `ON-PAGE-SEO.md` / `TOPIC-COVERAGE.md`. Without the integration, the correct output is UNAVAILABLE — never a failure verdict, but also a hard bar: no indexation or performance claims of any kind may appear anywhere in the report chain (the evidence rule of `TECHNICAL-SEO.md` applies here too).

## Failure Handling

- **No integration:** emit the UNAVAILABLE object and stop. Do not approximate, do not "estimate from rankings", do not fill from memory.
- **Export older than ~3 days with fresh activity expected:** note the staleness; every decision carries the caveat.
- **Partial API scopes** (performance available, indexation not): report the available half; mark the other UNAVAILABLE.
- **Numbers that look impossible** (CTR > 100%, trends on pages published yesterday): re-export before concluding — measurement artifacts come from sampling and window mismatches, not from the site.
- **Reason strings outside the known list:** report them verbatim; do not silently remap them to friendlier labels.
- **A decision's underlying query is anonymized or aggregated:** state the limitation in the decision's entry rather than narrowing the claim to fit.

## Cross-References

- `SKILL.md` — Data Availability Policy (§7); `search_console_data` input row (§6); optional maintenance context (§8).
- `TECHNICAL-SEO.md` — the audit this data feeds (Sitemap & Indexation category); shared evidence rule.
- `CONTENT-REFRESH.md` — refresh candidates from declining performance.
- `ON-PAGE-SEO.md` — title/meta rewrite candidates from zero-CTR queries.
- `TOPIC-COVERAGE.md` / `SEARCH-INTENT.md` — optimization candidates from page-8–20 queries.
- `VALIDATION.md` — technical issue types; NOT_MEASURABLE / UNAVAILABLE semantics.
- `SCORING.md` — Sitemap & Indexation category (weight 20).
