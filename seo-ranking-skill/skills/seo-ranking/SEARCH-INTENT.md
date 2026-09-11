# Search Intent Analysis

> Module 01 of the seo-ranking skill · Phase: PLAN · Load when: a topic or target query is promoted to an article, before any keyword, SERP, or brief work

## Purpose

Classify what the user actually wants when they type the target query, and extract the five analysis dimensions every later decision inherits: user goal, main question, expected content format, search journey stage, and important subtopics. The output is the intent-analysis JSON — the first artifact of the PLAN phase and the root of the article's structure.

WHY: an article that answers a question the user did not ask fails check SEO-V01 no matter how well it is written. Google's guidance centers on satisfying the searcher, so intent classification is the first gate, not a finishing touch. A mis-classification propagates into the keyword map, the brief, and the outline — fixing intent first is always cheaper than fixing structure last.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `topic` or `target_query` | Yes — one of them | Hard stop: there is nothing to classify |
| `serp_data` (real export or pasted results only) | No | `data_availability.serp_data = false`; classification proceeds on query-pattern reasoning with confidence capped per SEO-SI-10 |
| `cms_inventory` | No | Intent overlap with existing pages cannot be checked here; that check lives in `CANNIBALIZATION.md` |

Never treat an imagined SERP as input. If no real results were provided, `serp_data` is false — full stop.

## Procedure

1. Normalize the input. Given a topic ("storing fresh basil"), derive the most likely target query ("how to store fresh basil"). Given a query, use it verbatim as `query`.
2. Scan the query for intent signals using the recognition table in SEO-SI-02: modifiers, entities, phrasing patterns.
3. If real SERP data was provided, read what the live results actually reward (page types, formats) and let it confirm or overturn the pattern-based reading (SEO-SI-04). If not provided, proceed on pattern reasoning only.
4. Decide mixed intent (SEO-SI-03): does the query or the SERP suggest more than one intent? If yes, classify a dominant and a secondary intent.
5. Extract the five analysis dimensions (SEO-SI-05): user goal, main question, expected format, journey stage, important subtopics.
6. Choose the structure recommendation from the intent-to-structure mapping (SEO-SI-07) and write a one-sentence rationale.
7. Assign intent confidence honestly (SEO-SI-10).
8. Emit the intent-analysis JSON conforming to `schemas/intent-analysis.schema.json`.
9. If the outcome is transactional or navigational, apply the flags in SEO-SI-08 / SEO-SI-09 and stop the normal article pipeline — do not hand off to `CONTENT-BRIEF.md` until the route is resolved.

## Rules

### The four intents

**SEO-SI-01 — Classify before anything else.** Every target query MUST receive exactly one primary intent — informational, commercial, transactional, or navigational — before keyword work, SERP analysis, or brief generation begins. "Unclassified" is not an acceptable state downstream.

**SEO-SI-02 — Recognize intents by query pattern.** Use the signal table:

| Intent | The user wants | Typical query patterns / modifiers | Examples |
|---|---|---|---|
| Informational | To learn, understand, or do something | "how", "what", "why", "when", "which", "guide", "tutorial", "steps", "ideas", "tips", question phrasing | "how to store fresh basil", "what is cold brew coffee" |
| Commercial | To evaluate options before buying | "best", "review", "vs", "top", "comparison", "cheapest", "alternatives", "brands", "for [use case]" | "best herb garden kits", "basil vs mint for pesto" |
| Transactional | To buy or act now | "buy", "order", "price", "coupon", "discount", "near me", "download", "sign up", "book", brand + product | "buy basil plants online", "basil seeds near me" |
| Navigational | To reach a specific site or page | brand names, site names, exact page titles, "login", "official" | "usda plant hardiness zone map" |

Modifiers are signals, not verdicts: "best way to store basil" is informational (the user is learning how) despite the word "best". When modifiers conflict, weigh the user's end goal first, then apply SEO-SI-03.

**SEO-SI-03 — Resolve mixed intent explicitly.** When the query — or, if available, the SERP — suggests multiple intents (a bare head term like "basil" could mean grow-it, buy-it, or store-it), you MUST classify a dominant intent and a secondary intent, set `mixed_intent: true`, and record the secondary in `secondary_intent`. Serve the dominant intent in structure and coverage; acknowledge the secondary only where it naturally fits (a short section, a link, a mention). Never split focus 50/50 — a page that serves two intents fully usually serves neither.

**SEO-SI-04 — Real SERP behavior overrides pattern guesses.** If real SERP data shows the top results rewarding a different intent than the query pattern suggests, the SERP wins: it is observed behavior, patterns are inference. Record the flip in the structure rationale. Without real data this rule is void — never fabricate the observation.

### The five analysis dimensions

**SEO-SI-05 — Extract all five dimensions.** The output MUST contain:

1. `user_goal` — what the user is ultimately trying to accomplish, phrased from the user's perspective ("Keep fresh basil usable for as long as possible").
2. `main_question` — the single question the article must answer, phrased as the user would state it. This field drives check SEO-V02; it must be specific and answerable, not vague.
3. `expected_format` — the content format(s) the intent implies: how_to, list, comparison, definition, product_page, recipe, review, buying_guide, other. Derived from query phrasing and, when present, the formats the live SERP rewards.
4. `journey_stage` — one of: awareness (problem named, solution unknown) / consideration (options or methods being evaluated) / decision (choice imminent, wants to act) / retention (already owns or uses it, wants more). Depth and tone calibrate to this stage.
5. `important_subtopics` — the subtopics a fully satisfied reader expects to find. Derive them from the question space: what must someone with this goal still know? How these become required subtopics with depth calibration is defined in `TOPIC-COVERAGE.md`.

**SEO-SI-06 — Phrasing honesty.** The `main_question` MUST be a question a real user would type or hold in mind — never a content-team objective ("Demonstrate topical authority on basil storage"). Vague main questions make check SEO-V02 meaningless.

### Structure must match intent

**SEO-SI-07 — Structure is decided by intent, not preference.** The recommended structure MUST follow this mapping:

| Primary intent | Structure that MUST result | Archetype tokens |
|---|---|---|
| Informational | Guide / how-to / reference with answer-first structure: the direct answer to the main question appears in the first section, then depth follows | `guide`, `how_to`, `reference` |
| Commercial | Comparison or buying guide with explicit evaluation criteria, honest recommendations, and stated trade-offs | `comparison`, `buying_guide` |
| Transactional | **The CMS usually should NOT create an article.** Flag it: recommend a product/landing page approach instead | `product_landing` (flag) |
| Navigational | Brand / boilerplate page — the specific page the user wants. An article is rarely appropriate | `brand_page` (flag) |

**SEO-SI-08 — Transactional flag.** When the primary intent is transactional, this module MUST NOT hand off to `CONTENT-BRIEF.md` for a standard article. Emit the intent-analysis JSON with `structure_recommendation.recommended_archetype = "product_landing"` and let the pipeline owner decide: route to a product/landing workflow, or explicitly re-scope the topic to its informational shadow (e.g., "how to store fresh basil" instead of "buy basil plants"). Writing a "10 reasons to buy X" article for a "buy X" query is an intent mismatch — SEO-V01, CRITICAL.

**SEO-SI-09 — Navigational flag.** When the primary intent is navigational, an article almost never satisfies it: the user wants a specific page, not content about wanting that page. Flag it in the rationale and recommend the target page or a redirect. Proceed to a brief only if the query navigates to content this CMS genuinely owns and no existing page can serve it.

### Confidence

**SEO-SI-10 — Assign honest confidence.** `intent_confidence` MUST be:

- `high` — an unambiguous query pattern with a decisive modifier AND a single plausible user goal (SERP confirmation optional in this case), or any classification confirmed by real SERP data.
- `medium` — pattern-based reasoning only, with no SERP data; or real SERP data showing mixed formats but one dominant reading.
- `low` — mixed or contradictory signals without SERP data; or a bare head term admitting several intents.

Missing SERP data is the single biggest confidence reducer: observed search behavior outweighs inference, and its absence means the classification is an informed guess. `low` MUST be noted and SHOULD trigger either a request for SERP data or a re-scope of the topic to a narrower query.

**SEO-SI-11 — Data honesty.** The `data_availability.serp_data` boolean MUST reflect reality, and the notes MUST state what the classification rests on. Never describe an imagined SERP ("top results are listicles") unless real results were provided — inventing SERP observations violates the Data Availability Policy.

**SEO-SI-12 — Re-classify on scope change.** If the topic, target query, or article angle changes materially after planning (a pivot from "store basil" to "grow basil"), re-run this module on the new query. Stale intent produces intent drift — issue type `intent_drift` in `VALIDATION.md`.

## Output

A single intent-analysis JSON object conforming to `schemas/intent-analysis.schema.json`.

### Worked example — shared scenario

Query: **"how to store fresh basil"**

1. Pattern scan: "how to" is a decisive informational modifier (SEO-SI-02). The end goal is keeping an existing ingredient usable — not buying, not comparing products, not reaching a site.
2. Mixed intent: none. A commercial shadow exists ("best herb storage containers"), but it is not what this query asks; it can be acknowledged later with one internal link, not a section.
3. Five dimensions: user goal — keep fresh basil usable for as long as possible; main question — "How do I keep fresh basil fresh for more than a few days?"; expected format — `how_to` (steps plus decision criteria between methods); journey stage — consideration (the user has the basil and is evaluating storage methods); important subtopics — room-temperature bunch method, paper-towel refrigerator method, freezing, drying, common mistakes.
4. Structure: `how_to`, answer-first — the direct answer leads, then per-method depth. Freezing and drying get deliberately short treatments (depth calibration lives in `TOPIC-COVERAGE.md`).
5. Confidence: `high` — decisive modifier, single plausible goal. No SERP data, recorded honestly.

Resulting JSON:

```json
{
  "query": "how to store fresh basil",
  "primary_intent": "informational",
  "intent_confidence": "high",
  "mixed_intent": false,
  "secondary_intent": null,
  "user_goal": "Keep a bunch of fresh basil usable for as long as possible after buying or harvesting it",
  "main_question": "How do I keep fresh basil fresh for more than a few days?",
  "expected_format": ["how_to"],
  "journey_stage": "consideration",
  "important_subtopics": [
    "room-temperature bunch method",
    "paper-towel refrigerator method",
    "freezing basil",
    "drying basil",
    "common storage mistakes"
  ],
  "structure_recommendation": {
    "recommended_archetype": "how_to",
    "rationale": "Procedural 'how to' query with a decisive modifier and a single plausible user goal; answer-first how-to structure per the intent-to-structure mapping"
  },
  "data_availability": {
    "serp_data": false,
    "notes": "No SERP export provided; intent derived from query-pattern reasoning with a decisive modifier"
  },
  "generated_at": "2025-01-15T08:50:00Z"
}
```

## Quality Checks

| Check | What this module feeds |
|---|---|
| SEO-V01 (intent match) | The gate tests the finished article against this module's `primary_intent`, `expected_format`, and structure recommendation. An informational query answered by a product comparison fails here — and the failure originates in this module's output, not in the writing |
| SEO-V02 (main question answered) | The gate searches for a direct, findable answer to `main_question`. Write it as a real user question (SEO-SI-06) so the check is meaningful |

When validation flags SEO-V01 or SEO-V02, re-run this module before touching the draft: the article may be faithfully serving a wrongly classified intent.

## Failure Handling

- **Ambiguous head term, no SERP data (`low` confidence):** do not guess silently. Either request SERP data, or re-scope the topic to a narrower query with a decisive modifier — and state which path was taken in the rationale.
- **Transactional or navigational result:** stop the article pipeline per SEO-SI-08 / SEO-SI-09 and emit the flagged intent-analysis JSON so the pipeline owner can reroute. Never generate a brief that papers over the mismatch.
- **SERP contradicts the pattern:** the SERP wins (SEO-SI-04); record the flip in the rationale. If the flipped intent is transactional or navigational, apply the flags as usual.
- **No query derivable from the topic:** ask for clarification, or derive the most likely query and set confidence `low`.

## Cross-References

- `SKILL.md` — phase workflow, Data Availability Policy
- `KEYWORD-STRATEGY.md` — consumes `primary_intent`, `main_question`, `important_subtopics`
- `SERP-ANALYSIS.md` — intent confirmation when real SERP data exists
- `CONTENT-BRIEF.md` — embeds this module's output as `intent_summary`
- `TOPIC-COVERAGE.md` — turns `important_subtopics` into required subtopics with depth calibration
- `schemas/intent-analysis.schema.json` — the output contract
- `VALIDATION.md` — SEO-V01, SEO-V02; issue types `intent_mismatch`, `main_question_unanswered`, `intent_drift`
