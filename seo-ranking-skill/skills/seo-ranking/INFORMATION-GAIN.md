# Information Gain

> Module 06 of the seo-ranking skill · Phase: WRITE · Load when: drafting sections, and again at validation, to test whether the article gives the reader something the obvious restatement does not

## Purpose

Run the dedicated information-gain validation system: the question set, the re-search test, and the obvious-statement test. This module decides whether the article merely restates what any article on the topic would say — or actually advances the reader's understanding. Its assessment feeds the Content Quality & E-E-A-T and Information Gain score categories.

WHY: a page whose content could be regenerated from common knowledge adds nothing to the web, and search engines have every reason not to reward it. Google's guidance frames the question directly: after reading your content, will the searcher leave with what they came for — or still need to search again? That question, made testable, is this module.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `intent_analysis` (main question) | Yes | Hard stop — gain is measured against the question |
| `content_brief` | Ideally | `information_gain_opportunities` are the planned gain; without a brief, assess against intent reasoning alone |
| `keyword_map` | Yes | Question queries define the sub-questions the re-search test walks through |
| Draft (in review mode) | Yes for review mode | Planning mode (choosing gain targets) runs on the brief alone |

## Procedure

1. Load the planned gain: the brief's `information_gain_opportunities` (from `SERP-ANALYSIS.md` when real data existed, otherwise from intent reasoning).
2. Answer the question set (SEO-IG-01) for the article as a whole — all eight questions, each with a yes/no and a one-line justification citing where in the draft the answer lives.
3. Run the re-search test (SEO-IG-02): walk the main question and each required subtopic and ask, "Does the reader still need to search again because the article failed to answer this?"
4. Run the obvious-statement test (SEO-IG-03): mentally strip every sentence that any generic article on the topic would contain; identify what remains.
5. Check the minimum floors (SEO-IG-04) for the article's topic type.
6. Separate gain from padding (SEO-IG-05): list what the article adds that the reader needs, and flag anything that adds words without adding need.
7. Emit the information-gain assessment: pass/fail per gain dimension, the re-search verdict, the gain remainder, and the overall level.

## Rules

**SEO-IG-01 — The question set.** For every article, answer each of these with evidence from the text:

1. Does the content provide useful **specifics** (numbers, durations, conditions, quantities)?
2. Does it provide **examples** (concrete instances a reader can recognize or replicate)?
3. Does it provide **comparisons** (this vs. that, with the differentiating dimensions stated)?
4. Does it provide **practical guidance** (what to actually do, in order, with the conditions that change the answer)?
5. Does it provide **decision criteria** (how to choose between the options the article presents)?
6. Does it provide **original synthesis** (structure, grouping, or judgment the article contributes, not common knowledge reshuffled)?
7. Does it provide **useful explanations** (why something works or fails, not just that it does)?
8. Does it provide information **beyond obvious statements** (anything a knowledgeable friend would not already know)?

A "no" is not automatically a failure — the floors (SEO-IG-04) decide which dimensions the topic type makes mandatory — but every "no" MUST be justified, not ignored.

**SEO-IG-02 — The re-search test (the killer test).** Ask: "Does the reader still need to search again because the article failed to answer the question?"

- If YES for the **main question** → **critical failure**. The article did not do its one job; this is `low_information_gain` at CRITICAL grade and zeroes the Information Gain score category.
- If YES for a **required subtopic** → **warning**. The reader got the core answer but must search again for a supporting piece; this is `thin_coverage` / `missing_subtopic` territory and a gain warning.

The test is reader-anchored, not author-anchored: "I mentioned freezing" does not pass if what the reader needed was how long frozen basil keeps and whether to blanch first.

**SEO-IG-03 — The obvious-statement test.** Strip every sentence that any generic article on the topic would contain — the definitions, the reassurances, the "it depends" filler. What remains is the article's information gain. If nothing remains, the article is `low_information_gain` regardless of its polish, length, or structure. Record the remainder explicitly: it is the article's reason to exist in search results.

**SEO-IG-04 — Minimum floors.** An article MUST offer at least:

- **specifics** where the topic is quantitative (durations, temperatures, amounts — or an honest statement of the range and what drives it);
- **examples** where the topic is procedural (a concrete worked instance of the steps);
- **decision criteria** where the topic is a choice (how to pick between the options presented).

Missing a mandatory floor is `lacking_specificity` (SEO-V06). The floors are topic-type-driven, not optional polish.

**SEO-IG-05 — Gain is not padding.** Gain adds what the reader needs; padding adds words. A longer version of an obvious statement is still an obvious statement. Every gain item should be traceable to a reader need (a question, a decision, a confusion); text that traces to no need is padding and SHOULD be cut — it taxes attention and feeds filler checks in the content-style skill, not this one.

**SEO-IG-06 — Gain must be true.** Fabricated specifics are not gain — they are integrity failures (SEO-V09, `fabricated_data`, CRITICAL always). Specifics the source material does not support MUST either be sourced, marked honestly as estimates with their basis, or omitted. An honest "this varies with storage conditions; expect days, not weeks" is gain; an invented "studies show 87% longer shelf life" is a gate-failing fabrication.

**SEO-IG-07 — Output feeds two score categories.** The information-gain assessment (pass/fail per dimension, re-search verdict, gain remainder, overall level) feeds the Content Quality & E-E-A-T and Information Gain categories in `SCORING.md`. A CRITICAL-grade re-search failure zeroes Information Gain; warnings deduct proportionally.

**SEO-IG-08 — Run it twice.** The same tests run during WRITE (as a drafting self-check: is this section adding gain?) and during VALIDATE (as the gate's evidence). Applying the tests while drafting is cheaper than discovering the remainder is empty after the article is finished.

## Output

The information-gain assessment:

```json
{
  "main_question": "How do I keep fresh basil fresh for more than a few days?",
  "question_set": {
    "useful_specifics": { "pass": true, "evidence": "Shelf-life durations per method in the comparison table" },
    "examples": { "pass": true, "evidence": "Worked example of the paper-towel wrap for one bunch" },
    "comparisons": { "pass": true, "evidence": "Method table compares duration, effort, and best-for" },
    "practical_guidance": { "pass": true, "evidence": "Ordered steps for each method with conditions" },
    "decision_criteria": { "pass": true, "evidence": "'Use within days → jar; keep a week-plus → paper-towel fridge'" },
    "original_synthesis": { "pass": true, "evidence": "Method chooser grouped by reader situation, not alphabetically" },
    "useful_explanations": { "pass": true, "evidence": "Why uncovered refrigeration blackens leaves" },
    "beyond_obvious_statements": { "pass": true, "evidence": "When NOT to refrigerate; selection-at-store tips" }
  },
  "re_search_test": {
    "main_question": "pass",
    "required_subtopics": [
      { "subtopic": "freezing basil", "result": "warning — duration and blanch question unanswered" }
    ]
  },
  "obvious_statement_remainder": [
    "Shelf-life durations per method",
    "When not to refrigerate and why leaves blacken",
    "Selection-at-store tips"
  ],
  "minimum_floors": { "quantitative_specifics": "met", "procedural_examples": "met", "decision_criteria": "met" },
  "overall": "pass-with-warning",
  "issue_types": ["thin_coverage"]
}
```

For the shared scenario this is the strong-but-imperfect article: gain is real (the remainder is non-empty), the main question passes the re-search test, and the thin freezing section produces one warning — matching the expected gate output.

## Quality Checks

| Check | What this module feeds |
|---|---|
| SEO-V05 (information gain sufficient) | The re-search test and the obvious-statement remainder are the check's substance; CRITICAL `low_information_gain` when the reader must search again after reading |
| SEO-V06 (useful specifics) | The minimum floors decide whether the topic type demanded specifics, examples, or criteria that are absent → `lacking_specificity` |
| SEO-V07 (original synthesis) | The synthesis and beyond-obvious dimensions of the question set → `unoriginal_content` when the remainder is empty |
| SEO-V40 (unique information) | The gain remainder is exactly what an AI engine could cite as distinct → `no_unique_information` when empty |

## Failure Handling

- **Re-search test fails on the main question (critical):** stop and fix the article's core answer before any other work — on-page polish cannot compensate for an unanswered question.
- **Obvious-statement remainder is empty:** re-plan with `SERP-ANALYSIS.md` findings if real data exists, or widen the gain targets (specifics, examples, decision criteria per the floors). Do not pad: padding does not create remainder.
- **Floors unmet but data unavailable:** state honest ranges and conditions, or scope the claim down to what the source material supports (SEO-IG-06). Never invent specifics to pass a floor.
- **Gain present but buried:** an ordering problem, not a gain problem — restructure so the gain is findable (cross-reference the answer-first rule in `CONTENT-BRIEF.md` SEO-CB-05).
- **Assessment disagrees with the brief's planned gain:** the draft under-delivered the plan; re-check `information_gain_opportunities` coverage item by item before adjusting anything else.

## Cross-References

- `SKILL.md` — WRITE-phase module map, Data Availability Policy
- `SEARCH-INTENT.md` — the main question the re-search test anchors to
- `SERP-ANALYSIS.md` — real-data differentiation targets that become planned gain
- `CONTENT-BRIEF.md` — `information_gain_opportunities` are this module's plan
- `TOPIC-COVERAGE.md` — the companion completeness check; re-search warnings on subtopics overlap `thin_coverage`
- `EEAT-TRUST.md` — honest treatment of uncertainty in specifics
- `VALIDATION.md` — SEO-V05, SEO-V06, SEO-V07, SEO-V40; issue types `low_information_gain`, `lacking_specificity`, `unoriginal_content`, `no_unique_information`
- `SCORING.md` — Content Quality & E-E-A-T (weight 14) and Information Gain (weight 12) categories consume this assessment
