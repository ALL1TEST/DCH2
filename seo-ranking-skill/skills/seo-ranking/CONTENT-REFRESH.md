# Content Refresh — Honest Decay Evaluation

> Module 16 of the seo-ranking skill · Pipeline phase: edit/improve operations + scheduled article reviews (article-level) · Load when: a published article is scheduled for review, decays in performance data, or an edit/improve operation asks for refresh recommendations

## Purpose

Decide, honestly, whether and how an existing article should be refreshed. Content decays: facts age, statistics stale, intent drifts, coverage standards move, and competitors publish. The refresh restores real value — or retires the page. What it never does: touch the date and call it fresh.

## Inputs

| Input | Required | If absent |
|---|---|---|
| Published `article` + its CMS metadata (dates, author, schema blocks) | Yes | Module cannot run |
| `cms_inventory` | Optional | Link fixes and merge evaluation → UNAVAILABLE |
| `search_console_data` (real API export) | Optional | Performance signals → UNAVAILABLE; evaluation proceeds on content evidence only |
| `serp_data` (current) | Optional | Title/meta comparison against current SERP expectations → UNAVAILABLE; intrinsic quality rules still apply |
| Fresh source material for outdated facts | As needed | Facts cannot be "updated" by invention — see Failure Handling |

## Procedure

1. Evaluate the decay dimensions in order: facts, statistics, coverage vs. current intent, internal linking, title/meta, schema, information gain, performance signals (SEO-CR-01..SEO-CR-09).
2. Record each finding with its evidence — a real quote from the article, a real Search Console number, a real SERP observation — or mark the dimension UNAVAILABLE.
3. Build the prioritization matrix: impact × effort (SEO-CR-11).
4. Choose the treatment: refresh, rewrite, or merge/redirect (SEO-CR-13).
5. Assemble the concrete action list (SEO-CR-10) and apply the never-fake-freshness rule to any date change (SEO-CR-12).
6. Emit the refresh checklist output.

## Rules

### What to evaluate in existing content

- **SEO-CR-01 · Outdated information and facts.** Versions, model years, discontinued products, changed prices, changed recommendations — anything falsifiable that time may have moved. Each outdated fact is a finding with its replacement's sourcing requirement attached.
- **SEO-CR-02 · Outdated statistics.** Every statistic has a vintage; flag statistics older than the topic's decay rate (technology and pricing decay aggressively; evergreen techniques decay slowly). Never replace an old statistic with an invented new one — a real sourced figure, an explicit estimate marker, or removal.
- **SEO-CR-03 · Weak or thin sections.** Sections that would today trigger `thin_coverage` / `lacking_specificity` at the gate (`VALIDATION.md` thresholds) — judged against current coverage standards, not the standards of the publication year.
- **SEO-CR-04 · Missing topics vs. current intent (intent drift).** What users search for NOW may differ from when the article was written: subtopics the current intent implies that the page lacks, subtopics it carries that no longer belong, and format expectations that have moved (a prose guide where the current intent expects a comparison table). Compare against a fresh intent analysis (`SEARCH-INTENT.md`), noting that its quality depends on available SERP data.
- **SEO-CR-05 · Poor internal linking.** Newer articles this page should link to (reverse recommendations never actioned), orphan status, links to pages that have since moved. Needs `cms_inventory`.
- **SEO-CR-06 · Weak title/meta.** Compared to current SERP expectations — WHEN SERP data is available. Without it, evaluate against the intrinsic quality rules of `ON-PAGE-SEO.md` only, and mark the SERP comparison itself UNAVAILABLE.
- **SEO-CR-07 · Outdated or invalid schema.** Schema that no longer matches visible content, has become syntactically invalid, or misses now-applicable types (the FAQ block that finally exists). Evaluate per `SCHEMA.md`.
- **SEO-CR-08 · Weak information gain.** The article now says nothing the current top results don't — the re-search test fails against TODAY's field, not the field it was written against (`INFORMATION-GAIN.md`).
- **SEO-CR-09 · Performance signals (real data only).** Declining clicks and positions from a real Search Console export (`site-level/INDEXING.md` is the data source — maintenance context only) — never estimated, never remembered, never invented.

### What to do

- **SEO-CR-10 · The refresh actions.** The action set: update facts WITH sourcing; add missing subtopics; strengthen information gain (new examples, comparisons, original synthesis); fix links, meta, and schema; restructure for current intent. Actions are concrete edits with locations — "improve the article" is not an action.
- **SEO-CR-11 · The never-fake-freshness rule.** A date change without substantive change is fake freshness. Update dates ONLY when the content substantively changed, and let the CMS's modified-date reflect real changes (Google's guidance: visibly accurate dates — see `GOOGLE-GUIDANCE.md`). Never bump a date to simulate recency on unchanged content; never rewrite history on the publish date either.
- **SEO-CR-12 · Prioritization matrix.** Rank refresh candidates by impact × effort. Declining traffic + outdated facts = HIGH priority. Healthy traffic + cosmetic gaps = LOW. Heavy rewrites with modest upside are scheduled deliberately, not rushed. Impact evidence comes from the findings; effort from the action list's size.
- **SEO-CR-13 · Refresh vs. rewrite vs. merge/redirect.** REFRESH when the structure and intent hold and the gaps are additive (facts, sections, links). REWRITE when the intent itself drifted or the structure fights the current format. MERGE/REDIRECT into a stronger page when duplication or cannibalization says the page should not stand alone (decision logic in `CANNIBALIZATION.md`).

## Prioritization matrix

| Impact (evidence) | Effort (action list) | Priority | Handling |
|---|---|---|---|
| Declining traffic + outdated facts | small (targeted edits) | HIGH | refresh now |
| Declining traffic + intent drift | large (restructure) | HIGH | schedule as a rewrite-sized refresh (SEO-CR-13) |
| Stable traffic + outdated statistic | small | MEDIUM | scheduled refresh |
| Stable traffic + link/schema fixes | small | MEDIUM | batch with the next edit pass |
| Healthy traffic + cosmetic gaps | any | LOW | backlog; revisit on the next cycle |

Impact evidence comes from the findings (SEO-CR-01..09); effort from the action list's size. Declining traffic plus outdated facts is the classic HIGH: the page is both losing ground and wrong.

## Worked example

Shared scenario article, one year after publication, with a real GSC export showing a six-week decline in clicks and position for "how to store fresh basil":

- Findings: the freezing section is thin by current coverage standards; an outdated statistic sits in the introduction (`outdated_content`); the current intent now implies a storage-methods comparison table that does not exist (`intent_drift`); the newer `/how-to-dry-herbs` article is not linked.
- Treatment: refresh — the structure and intent hold and the gaps are additive (SEO-CR-13).
- Actions: replace the statistic with a sourced current figure; expand the freezing subsection; add the comparison table; add the internal link.
- Date policy: the CMS modified-date updates when these substantive edits land; no manual bump (SEO-CR-11).

## Output

Refresh checklist:

```json
{
  "content_refresh": {
    "article": "/how-to-store-fresh-basil",
    "findings": [
      { "dimension": "outdated_statistics", "evidence": "section 2 cites a 2019 storage-duration figure", "severity": "WARNING", "issue_type": "outdated_content" },
      { "dimension": "intent_drift", "evidence": "current intent implies a storage-methods comparison table; none exists", "severity": "WARNING", "issue_type": "intent_drift" }
    ],
    "treatment": "refresh",
    "actions": [
      "Replace the section 2 statistic with a sourced current figure",
      "Add a storage-methods comparison table after section 3",
      "Link the newer /how-to-dry-herbs article from the drying section"
    ],
    "date_policy": "modified date updates when substantive edits land; no manual bump",
    "data_availability": { "search_console": true, "cms_inventory": true, "serp_data": false }
  }
}
```

## Quality Checks

| Aspect | Issue type (registry) | Meaning |
|---|---|---|
| Outdated facts/statistics | `outdated_content` | Falsifiable staleness, with evidence cited |
| Intent drift | `intent_drift` | The current intent implies content the page lacks |
| Weak title/meta (refresh context) | `weak_title_meta_refresh` | Title/meta no longer meet current expectations (SERP evidence when available) |

These refresh-phase types rank refresh priorities and feed `next_actions`; they do not retro-trigger the publish gate. The refreshed article re-enters the normal VALIDATE phase before republishing — refreshed content is new content to the gate.

## Failure Handling

- A replacement fact cannot be sourced: keep the old fact marked as needing verification, or remove the claim — never invent the update.
- No Search Console or SERP data: proceed on content evidence; record UNAVAILABLE for the performance and SERP-comparison dimensions.
- Refresh scope balloons past roughly half the article: treat it as a rewrite (SEO-CR-13) — piecemeal edits stop being coherent past that point.
- Date-only temptation (a request to "just bump the date"): refuse per SEO-CR-11 and record the request explicitly.
- Merge candidate discovered mid-refresh: pause and route through `CANNIBALIZATION.md` before editing — merges change URLs and link targets.

## Cross-References

- `site-level/INDEXING.md` — the real performance signals that trigger and rank refreshes (maintenance context only).
- `SEARCH-INTENT.md` — fresh intent analysis for drift detection.
- `SCHEMA.md` — schema staleness evaluation and the shared date-honesty rule.
- `INTERNAL-LINKING.md` — link fixes and orphan recovery during refresh.
- `ON-PAGE-SEO.md` — title/meta quality baseline.
- `CANNIBALIZATION.md` — merge/redirect decisions.
- `VALIDATION.md` — `outdated_content` / `intent_drift` / `weak_title_meta_refresh` registry entries.
- `GOOGLE-GUIDANCE.md` — visibly accurate dates guidance.
