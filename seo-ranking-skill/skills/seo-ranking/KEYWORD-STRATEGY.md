# Keyword Strategy

> Module 02 of the seo-ranking skill · Phase: PLAN · Load when: the intent analysis exists and the article's keyword plan is needed, before brief generation

## Purpose

Derive the article's keyword tiers — primary, secondary, long-tail, semantic, question queries, related queries, entities, and supporting topics — and enforce the natural-usage and anti-stuffing rules that govern how they appear on the page. Keyword strategy in this skill means topical relevance engineering, not metric chasing.

WHY: Google's guidance rewards pages that demonstrate topical relevance and answer the searcher, and it explicitly prohibits keyword stuffing. Both facts shape every rule below. A keyword map without a single metric is still complete and useful: tiers optimize relevance and intent match, which require no volume data.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `intent_analysis` (from `SEARCH-INTENT.md`) | Yes | Hard stop — every tier derives from intent |
| `serp_data` (real export or pasted results only) | No | `derivation_basis` falls back to `intent_reasoning`; related queries are reasoned, not observed |
| `cms_inventory` | No | Existing primary keywords unavailable for overlap checks; that check lives in `CANNIBALIZATION.md` |
| `keyword_metrics` (real integration export only) | No | Every metrics field MUST be `UNAVAILABLE` (SEO-KW-15) |

## Procedure

1. Take `intent_analysis.query` as the primary keyword candidate; confirm it is exactly one query (SEO-KW-01).
2. Derive 2–5 secondary keywords from the intent's `important_subtopics` and `main_question` — each secondary is a supporting angle of the same intent, never a different intent (SEO-KW-02).
3. Derive question queries from the question space around `main_question` (SEO-KW-06).
4. Derive long-tail keywords as longer, narrower phrasings of the same intent; prefer real SERP-visible related queries when data exists, otherwise reason them (SEO-KW-03, SEO-KW-05).
5. Extract semantic keywords and entities — the terms and named things that co-occur naturally with this topic (SEO-KW-04, SEO-KW-07).
6. List supporting topics: page-level topics this article touches but does not own, sourced from the CMS inventory when available (SEO-KW-08).
7. Dedupe against the CMS inventory's existing primary keywords when available; flag any collision to `CANNIBALIZATION.md` instead of silently proceeding.
8. Fill the `metrics` object: every field either a real number with its source recorded, or the exact string `UNAVAILABLE` (SEO-KW-15).
9. Set `derivation_basis` to `serp_data`, `inventory`, or `intent_reasoning` — whichever primarily fed the tiers.
10. Emit the keyword-map JSON conforming to `schemas/keyword-map.schema.json`.

## Rules

### Tiers and derivation

**SEO-KW-01 — Exactly one primary keyword.** The primary keyword IS the article's main query, taken verbatim from the intent analysis. One article, one primary keyword, one main question. Two primaries means two articles — or a cannibalization problem for `CANNIBALIZATION.md` to resolve.

**SEO-KW-02 — Secondary keywords: 2–5, same intent.** Secondaries are supporting angles of the same intent, derived from the intent's subtopics and main question. A keyword with a different intent is not a secondary — it belongs to a different article. Record each with its role (`close_variant`, `subtopic`, `supporting_angle`, or `other`).

**SEO-KW-03 — Long-tail keywords.** Longer, narrower phrasings of the same intent ("how to keep basil from wilting in the fridge"). They typically map to individual sections or FAQ answers, not to the H1. Derive them from the subtopics; never manufacture variants by mechanical word-swapping.

**SEO-KW-04 — Semantic keywords.** Terms that co-occur naturally with the topic ("stems", "paper towel", "airtight container", "shelf life"). They are coverage material: they appear because the content genuinely covers the topic, never as insertion targets (see SEO-KW-10).

**SEO-KW-05 — Related queries.** Queries adjacent to the primary ("how to dry basil", "basil turning black in fridge"). When real SERP data exists, prefer its visible related-query and people-also-ask items; otherwise derive them by reasoning and let `derivation_basis: intent_reasoning` say so.

**SEO-KW-06 — Question queries.** The natural-language questions users ask around the main question ("how long does fresh basil last?", "can you freeze basil?", "should you refrigerate basil?"). These flow into the brief's `user_questions` and become answer targets inside the article.

**SEO-KW-07 — Entities.** Named things search engines recognize about the topic: the subject entity and its formal name, methods, conditions, tools. For basil: basil, Ocimum basilicum, refrigeration, freezing. Entities MUST be named unambiguously and consistently in the article (check SEO-V37 reads them from here).

**SEO-KW-08 — Supporting topics.** Page-level topics the article touches but does not own ("growing basil indoors", "drying herbs"). These are internal-link candidates; only real inventory URLs may back them (cross-reference `INTERNAL-LINKING.md`).

**SEO-KW-09 — Inventory dedupe.** When the CMS inventory is available, compare the primary keyword against existing pages' primary keywords. Overlap is not this module's problem to solve — flag it and route to `CANNIBALIZATION.md`.

### Natural usage

**SEO-KW-10 — Alignment over ritual.** The primary keyword SHOULD appear naturally in the title or H1 and within the first ~150 words — as a guideline about subject alignment, not a placement ritual. A close natural variant ("storing fresh basil") serves alignment as well as the exact string. Semantic keywords and entities SHOULD be woven through topical coverage: present because the topic is genuinely covered, never inserted to rank. Field-level placement rules live in `ON-PAGE-SEO.md` (SEO-OP-15, SEO-OP-16).

### Anti-stuffing (deterministic where possible)

**SEO-KW-11 — Density ceiling.** Exact-match primary keyword density above ~1% of body words = stuffing. Compute it: exact occurrences divided by body word count. Close variants do not count toward the threshold. This is the number that turns check SEO-V19 CRITICAL.

**SEO-KW-12 — Heading stuffing.** The exact-match primary keyword in every or most H2s = stuffing. Headings describe their sections: the freezing section is "How to Freeze Basil", not "How To Store Fresh Basil By Freezing It To Store Fresh Basil".

**SEO-KW-13 — No keyword lists.** Keyword lists in body text or in alt text = stuffing, always. "Basil storage, storing basil, keep basil fresh, basil preservation" as running text or as an alt attribute is a stuffing pattern, not coverage.

**SEO-KW-14 — Reads-aloud test.** If the keyword usage does not read naturally aloud, rewrite it. Google's guidance explicitly prohibits keyword stuffing — this is a hard line, not a style preference.

### The metrics policy

**SEO-KW-15 — Real numbers or UNAVAILABLE.** Search volume, keyword difficulty, CPC, competition, rankings, and traffic estimates MUST each be either (a) a number actually received from a real integration, with its source recorded in `metrics_sources`, or (b) the exact string `UNAVAILABLE`. Never estimate, never round-guess, never fill in a "typical value", never infer volume from SERP position. A fabricated number is worse than no number: it poisons every decision built on it.

**SEO-KW-16 — Metrics are optional; the strategy is not.** Keyword strategy without metrics still works: it optimizes topical relevance and intent match, which do not require volume data. Tiers are derived from intent and content reasoning; metrics only prioritize between already-valid targets. State this plainly in outputs — an all-`UNAVAILABLE` metrics block is an honest limitation, not a defective map.

## Output

A single keyword-map JSON object conforming to `schemas/keyword-map.schema.json`.

### Worked example — shared scenario

From the basil intent analysis (informational, "how to store fresh basil"):

```json
{
  "primary_keyword": "how to store fresh basil",
  "secondary_keywords": [
    { "keyword": "keep basil fresh", "role": "close_variant" },
    { "keyword": "store basil in the fridge", "role": "subtopic" },
    { "keyword": "freeze basil", "role": "subtopic" }
  ],
  "long_tail_keywords": [
    "how to keep basil from wilting in the fridge",
    "how to store basil after harvesting",
    "how to keep cut basil fresh longer"
  ],
  "semantic_keywords": [
    "fresh herbs",
    "herb storage",
    "stems",
    "paper towel",
    "airtight container",
    "blackening leaves",
    "shelf life",
    "jar of water"
  ],
  "question_queries": [
    "how long does fresh basil last?",
    "can you freeze basil?",
    "should you refrigerate basil?"
  ],
  "related_queries": [
    "how to dry basil",
    "how to store cilantro",
    "why is my basil turning black in the fridge"
  ],
  "entities": [
    "basil",
    "Ocimum basilicum",
    "refrigeration",
    "freezing"
  ],
  "supporting_topics": [
    "growing basil indoors",
    "drying herbs",
    "herb garden kits"
  ],
  "metrics": {
    "search_volume": "UNAVAILABLE",
    "keyword_difficulty": "UNAVAILABLE",
    "cpc": "UNAVAILABLE",
    "competition": "UNAVAILABLE",
    "ranking": "UNAVAILABLE",
    "traffic_estimate": "UNAVAILABLE"
  },
  "derivation_basis": "intent_reasoning",
  "generated_at": "2025-01-15T08:55:00Z"
}
```

All metrics are `UNAVAILABLE` because no metrics integration provided data (SEO-KW-15) — and the map is still fully actionable for the brief.

## Quality Checks

| Check | What this module feeds |
|---|---|
| SEO-V18 (primary keyword natural presence) | The gate verifies natural presence of the primary keyword or a close variant in title/H1 and early content, per SEO-KW-10 — presence serves alignment, not ritual |
| SEO-V19 (no keyword stuffing) | The gate applies this module's deterministic thresholds: density above ~1% (SEO-KW-11), exact-match in most headings (SEO-KW-12), keyword lists in text or alt (SEO-KW-13) — any hit is CRITICAL `keyword_stuffing` |
| SEO-V20 (semantic coverage) | The gate verifies that the entities and semantic keywords mapped here appear through natural topical coverage; systematic absence surfaces as `semantic_gap` |

## Failure Handling

- **No metrics integration:** expected default, not a failure — all fields `UNAVAILABLE`, map proceeds (SEO-KW-16).
- **Partial metrics (some fields real, some not):** record real numbers with sources, mark the rest `UNAVAILABLE` individually. Never average or extrapolate across the gap.
- **Primary keyword collides with an inventory page:** stop and route to `CANNIBALIZATION.md` before brief generation; do not quietly pick a "slightly different" primary to dodge the check.
- **Fewer than two honest secondaries exist:** the topic may be too narrow; either accept a thinner map with the deviation noted, or widen the topic — do not pad with different-intent keywords.
- **Intent analysis is low-confidence:** keyword tiers inherit that uncertainty; note it and consider resolving intent first rather than layering keywords on a guess.

## Cross-References

- `SKILL.md` — phase workflow, Data Availability Policy
- `SEARCH-INTENT.md` — supplies the query, main question, and subtopics every tier derives from
- `CONTENT-BRIEF.md` — consumes primary keyword, secondaries, entities, and question queries
- `ON-PAGE-SEO.md` — field-level placement rules (SEO-OP-15, SEO-OP-16) that implement SEO-KW-10
- `INTERNAL-LINKING.md` — supporting topics become inventory-driven link candidates
- `CANNIBALIZATION.md` — resolves primary-keyword overlap against the inventory
- `schemas/keyword-map.schema.json` — the output contract
- `VALIDATION.md` — SEO-V18, SEO-V19, SEO-V20; issue types `keyword_missing_naturally`, `keyword_stuffing`, `semantic_gap`
