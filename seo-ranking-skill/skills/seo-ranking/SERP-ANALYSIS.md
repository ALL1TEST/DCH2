# SERP Analysis

> Module 04 of the seo-ranking skill · Phase: PLAN · Load when: real SERP data (API export or pasted results) has been provided for the target query — or when its absence must be recorded

## Purpose

Read what the live search results for the target query actually reward, and turn that reading into brief inputs: intent confirmation, competitor structure, covered topics, missing topics (gaps), visible questions, useful formats, featured snippet types, content gaps, and information-gain opportunities. When no real SERP data exists, this module's job is the opposite of analysis: it marks the input `UNAVAILABLE` and gets out of the way.

WHY: the SERP is the only direct observation of what search engines currently reward for this query. It is also the most tempting thing to fabricate — "the top results probably cover X" is not analysis, it is invention, and it violates the Data Availability Policy. This module runs on real data or it does not run.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `serp_data` | Yes for analysis — a real API export or pasted results, including a capture date | Analysis does not run; brief proceeds from intent + keyword reasoning with lower confidence (SEO-SA-13) |
| `intent_analysis` (from `SEARCH-INTENT.md`) | Yes | Hard stop — the SERP is read against a hypothesis |
| `keyword_map` (from `KEYWORD-STRATEGY.md`) | Yes | Provides the entities and question queries to look for in results |

A SERP dataset without a capture date is still usable, but the brief MUST record that the snapshot time is unknown (SEO-SA-02).

## Procedure

1. **Validate the data is real.** Confirm the results came from an export or paste, not from memory or plausible-sounding reconstruction. If it did not, apply SEO-SA-13 and stop.
2. **Record the snapshot.** Note when the SERP was captured. If it is older than ~90 days, flag it for re-fetching before trusting it (SEO-SA-03).
3. **Confirm intent.** Read what the live SERP actually rewards: the page types and formats in the top results. Confirm or overturn the intent analysis's classification; the SERP wins over pattern guesses (cross-reference `SEARCH-INTENT.md` SEO-SI-04).
4. **Map competitor structure.** For the top results: content formats (how-to, list, comparison, product page), section patterns (answer-first? steps? tables?), and rough relative depth. This is input to the brief's outline.
5. **List covered topics.** The subtopics that appear across the top results — the baseline any competitive article is expected to reach.
6. **Find missing topics.** Subtopics users plausibly need that the top results collectively do not cover. These are the differentiation targets → brief's `content_gaps`.
7. **Harvest visible questions.** People-also-ask style questions present in the SERP → brief's `user_questions` and the keyword map's question queries.
8. **Note useful formats.** Tables, step lists, definitions — the structures the SERP visibly rewards for this query → outline format guidance.
9. **Identify featured snippet types present.** Definition boxes, lists, tables, step sets → brief's `serp_feature_opportunities`.
10. **Synthesize information-gain opportunities.** Where the top results are collectively shallow, generic, or silent → brief's `information_gain_opportunities`. Apply the goal rule (SEO-SA-12): the plan is to be MORE USEFUL, not merely similar.

## Rules

**SEO-SA-01 — Real data or nothing.** SERP analysis runs ONLY on results actually provided through a real channel (API export, pasted results). There is no "estimated SERP", no "typical results for this kind of query". Absent data is a state, not a gap to fill with imagination.

**SEO-SA-02 — A SERP is a snapshot.** Record when the data was captured. Every conclusion drawn from it is time-stamped by that capture; results pages change, and stale observations quietly become wrong observations.

**SEO-SA-03 — Staleness threshold.** SERP data older than ~90 days SHOULD be re-fetched before use; if re-fetching is impossible, the brief MUST carry a staleness flag and the findings' confidence drops accordingly. Never present aged findings as current fact.

**SEO-SA-04 — Intent confirmation.** Report what the live SERP rewards for page type and format, and reconcile it with the intent analysis. Divergence between pattern reasoning and observed behavior resolves in favor of the SERP — but the flip MUST be recorded, not silently absorbed.

**SEO-SA-05 — Competitor structure analysis.** Describe the formats and section patterns of the top results as observed facts ("7 of 10 top results open with a direct answer block"), not as judgments ("competitors are weak"). The brief's outline uses this as its structural baseline.

**SEO-SA-06 — Covered topics baseline.** List the subtopics present across the top results. This is the coverage floor: an article missing what the SERP universally covers is behind before it starts.

**SEO-SA-07 — Missing topics are the prize.** Subtopics the target reader plausibly needs that the top results collectively omit are the article's differentiation targets. They flow into the brief's `content_gaps` and become information-gain opportunities.

**SEO-SA-08 — Harvest visible questions.** Question phrasings visible in the SERP (people-also-ask style) are real user language; capture them verbatim into `user_questions` rather than paraphrasing them into marketing tone.

**SEO-SA-09 — Useful formats.** If the SERP rewards tables for this query, the brief plans a table; if it rewards step lists, the brief plans steps. Format decisions are observations of the live results, not aesthetic preferences.

**SEO-SA-10 — Featured snippet types.** Record which snippet types are actually present (definition, list, table, steps). Absent snippet types are not opportunities — only present types (or clearly adjacent ones) go into `serp_feature_opportunities`.

**SEO-SA-11 — Information-gain direction.** For each collective weakness observed (generic advice, no specifics, unanswered adjacent questions), state what this article will do instead. The direction is specific: "add expected shelf-life durations per method", never "be more comprehensive".

**SEO-SA-12 — The goal rule.** The objective is to create something MORE USEFUL than what the SERP currently rewards — not merely similar. Differentiate through depth, specificity, better structure, or unanswered subtopics — never through length alone. A 3,000-word restatement of what ten results already say is not competition; it is padding with ambition.

**SEO-SA-13 — The unavailable path.** If no real SERP data was provided: mark `serp_data: false` in the brief's `data_availability` block with a note; do NOT fabricate competitor data — no invented "top results cover X", no imagined gaps; let the brief proceed from intent + keyword reasoning, with the reduced confidence noted. This path is normal and honest, not a degraded failure mode.

**SEO-SA-14 — The SERP informs; the intent governs.** SERP mimicry never overrides the reader's main question. If every top result buries the answer, the plan still answers first and THEN differentiates — the goal rule upgrades usefulness, it does not license copying the SERP's defects.

## Output

This module emits no standalone schema. Its findings are structured inputs into the content brief (`CONTENT-BRIEF.md`):

| SERP-analysis finding | Brief field it feeds | Downstream check that reads it |
|---|---|---|
| Intent confirmation (observed formats/page types) | `intent_summary` confirmation + rationale | SEO-V01 |
| Competitor structure / useful formats | `outline` (section patterns, formats) | SEO-V21, SEO-V39 |
| Covered topics baseline | `required_subtopics` sanity check | SEO-V03 |
| Missing topics | `content_gaps` | SEO-V03, SEO-V05 |
| Visible questions | `user_questions` | SEO-V36 context, `people_also_ask` opportunities |
| Featured snippet types present | `serp_feature_opportunities` | SEO-V39 context |
| Information-gain direction | `information_gain_opportunities` | SEO-V05, SEO-V07, SEO-V40 |

Every finding must be traceable to a specific observed result — if a "finding" cannot cite which captured result it came from, it is invention and MUST be deleted.

### Worked example — the unavailable path (shared scenario)

For "how to store fresh basil", no SERP export was provided. This module's entire contribution to the brief is therefore an honest absence record:

```json
{
  "serp_analysis_status": "UNAVAILABLE",
  "brief_fields_affected": {
    "content_gaps": [],
    "serp_feature_opportunities": ["featured_snippet_steps", "people_also_ask"],
    "data_availability": {
      "serp_data": false,
      "notes": "SERP data UNAVAILABLE (no export provided) - content gaps not derived; brief built from intent and keyword reasoning at reduced confidence"
    }
  }
}
```

Two details in that record are deliberate:

- `content_gaps` is an **empty array**, not a reasoned guess — no invented "top results cover the jar method but miss freezing" is permitted, because no results were observed.
- `serp_feature_opportunities` still carries two entries — but they are justified by the *planned content's own shape* (step-list how-to structure, answered user questions), not by observed snippet boxes. The reason lives in `FEATURED-SNIPPETS.md` reasoning; nothing here claims a SERP observation.

The snippet opportunities in the final brief (`examples/content-brief-example.json`) trace to that reasoning, and the brief's `data_availability.notes` states the reduced confidence out loud. That is the whole job on the unavailable path: mark it, don't fake it.

## Quality Checks

The quality of this module is measured by the brief fields it feeds (table above) and, through them, by the validation checks those fields support at gate time. Two standing quality bars:

- **Traceability:** each finding maps to an observed result in the captured data. Invented findings are Data Availability Policy violations and poison `content_gaps` and `information_gain_opportunities` downstream.
- **Honest absence:** when data is missing, `data_availability.serp_data = false` with a note — and every SERP-derived brief field stays empty rather than plausible-filled. Check SEO-V01 (intent match) then runs against intent reasoning alone, which the intent module's confidence field already reflects.

## Failure Handling

- **No SERP data:** apply SEO-SA-13 — mark `UNAVAILABLE`, fabricate nothing, proceed at lower confidence. Do not stall the pipeline.
- **Suspected fabricated or truncated data:** treat as absent (SEO-SA-13) and tell the pipeline owner why; a partial real export is usable for what it covers, with its limits noted.
- **SERP older than ~90 days:** request a re-fetch; if impossible, use the findings with an explicit staleness flag and reduced confidence (SEO-SA-03).
- **SERP contradicts the intent classification:** the SERP wins for observed behavior (SEO-SA-04); re-run `SEARCH-INTENT.md` with the observation recorded, then rebuild the affected brief fields.
- **SERP is mixed (several intents visibly rewarded):** treat as mixed intent — dominant + secondary per `SEARCH-INTENT.md` SEO-SI-03; the brief serves the dominant intent and acknowledges the secondary.

## Cross-References

- `SKILL.md` — Data Availability Policy (§7)
- `SEARCH-INTENT.md` — intent confirmation interplay (SEO-SI-04), mixed-intent handling
- `KEYWORD-STRATEGY.md` — question queries and related queries sourced from observed SERP items
- `CONTENT-BRIEF.md` — the consumer of every finding this module produces
- `INFORMATION-GAIN.md` — the WRITE-phase enforcement of the differentiation planned here
- `schemas/content-brief.schema.json` — the fields this module feeds (`content_gaps`, `serp_feature_opportunities`, `data_availability`)
- `examples/content-brief-example.json` — shows the honest-unavailable path: `serp_data: false`, empty `content_gaps`, lower confidence noted
- `VALIDATION.md` — checks SEO-V01, SEO-V03, SEO-V05, SEO-V07, SEO-V40 that ultimately read the fields this module feeds
