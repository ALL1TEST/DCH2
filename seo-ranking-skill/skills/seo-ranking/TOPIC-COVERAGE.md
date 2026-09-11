# Topic Coverage

> Module 05 of the seo-ranking skill · Phase: WRITE · Load when: a draft or draft section is being planned or reviewed against the brief's required subtopics

## Purpose

Define what "covering the topic" means, derive the required-subtopic list, calibrate depth per subtopic, and output the coverage checklist. Coverage here is about the question space — everything the intent implies the reader needs — not about word count.

WHY: the two classic coverage failures are opposites. An article that misses a load-bearing subtopic leaves the reader searching again (an SEO and usefulness failure). An article that pads every subtopic equally buries the answer and adds words without adding help. Google's guidance asks for substantial, complete coverage of the topic — with no fixed ideal word count — which is exactly this module's position: depth follows the question, not a number.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `content_brief` | Ideally | Required subtopics come from the brief; without it, derive provisionally from intent (SEO-TC-12) and note the derivation |
| `intent_analysis` | Yes | Hard stop — coverage is defined by the intent's question space |
| `keyword_map` | Yes | Question queries and entities contribute required material |
| Draft (during WRITE review) | No | Module runs in planning mode (deriving the checklist) or review mode (scoring the draft) |

## Procedure

1. Collect the required-subtopic candidates: the intent's five dimensions (`important_subtopics` from `SEARCH-INTENT.md`), question queries and entities from `KEYWORD-STRATEGY.md`, and the brief's `required_subtopics` and `user_questions`.
2. Merge and dedupe into one required-subtopic list; mark each subtopic's importance: load-bearing (the main question cannot be answered without it) or supporting.
3. Attach depth notes: which subtopics get full treatment, which get deliberately short treatment, and why (depth calibration, SEO-TC-04).
4. In review mode, examine the draft section by section and score each required subtopic: `present` (real, useful treatment) / `partial` (mentioned but not usefully treated) / `thin` (generic treatment that could apply to any topic) / `missing` (absent).
5. Run the thin-content test (SEO-TC-06) on every `present` section: could this text apply to any topic? If yes, downgrade to `thin`.
6. Run the tangent test (SEO-TC-07) on every section not in the required list: does any reader of the main question need it? If not, cut it or spin it off as a separate article proposal.
7. Emit the coverage checklist with per-subtopic status and the overall verdict.
8. Map failures to issue types (SEO-TC-10) for the validation report.

## Rules

**SEO-TC-01 — Coverage is the question space.** An article covers the topic when: the intent's required subtopics are present with useful treatment, the user questions are answered, and there are no critical gaps. Word count is never the measure — a 900-word article that answers everything beats a 3,000-word article that circles everything.

**SEO-TC-02 — Derive required subtopics from four sources.** (1) The intent dimensions — what a satisfied reader must know; (2) question queries — the natural questions around the main question; (3) semantic entities — the named things the topic genuinely involves; (4) the brief's `required_subtopics`. When sources disagree, the intent module's list wins; the brief should already reflect it.

**SEO-TC-03 — The main question is answered first.** Before any subtopic depth, the main question MUST be fully answered — directly and findably, in the first section. Subtopic coverage that arrives while the core question dangles is misordered coverage.

**SEO-TC-04 — Depth is proportional to importance.** A subtopic's depth MUST match its importance to the main question: load-bearing subtopics get full treatment (steps, specifics, conditions); supporting subtopics get honest short treatments. The brief's depth notes (e.g., "freezing — short treatment acceptable") are the plan; the draft must honor them without silently dropping to zero.

**SEO-TC-05 — No thin critical sections.** A load-bearing subtopic with a generic, detail-free treatment is a thin critical section — it triggers `thin_coverage` at WARNING, escalating toward CRITICAL the more load-bearing the subtopic is.

**SEO-TC-06 — The thin-content test.** A section that could apply to any topic is thin. Test: strip the topic-specific nouns; if the remaining advice still "works" ("store it properly", "keep it in a good container", "check it regularly"), the section is thin. Thin sections must be rewritten with topic-specific specifics or folded into another section.

**SEO-TC-07 — The tangent test.** A subtopic that no reader of the main question needs is a tangent, regardless of how well it is written. Cut it, or spin it off as its own article proposal (and a possible internal link). Tangents dilute coverage: they consume attention and depth budget without serving the question.

**SEO-TC-08 — No fixed ideal word count.** Google's guidance calls for substantial, complete coverage — and sets no word-count target. Never prescribe or evaluate length as such; evaluate whether the question space is covered. Length is an output of depth decisions, never an input.

**SEO-TC-09 — The coverage checklist is the output.** Every required subtopic gets exactly one status: `present` / `partial` / `missing` / `thin`, plus a one-line note. The checklist is the evidence base for checks SEO-V03 and SEO-V04 — statuses without notes are not auditable.

**SEO-TC-10 — Failure mapping.** A load-bearing subtopic absent → `thin_coverage` (WARNING, CRITICAL when the subtopic is load-bearing and absent). A brief-required subtopic absent or uselessly present → `missing_subtopic` (WARNING each). A `partial` on a load-bearing subtopic → `thin_coverage`. Systematic absence of entities/semantic terms → `semantic_gap` (SEO-V20) via SEO-TC-11.

**SEO-TC-11 — Entities are coverage too.** The entities and semantic keywords from the keyword map SHOULD appear through natural topical coverage — a basil-storage article that never mentions stems, moisture, or refrigeration conditions has a semantic gap regardless of its section count. Weaving rules live in `KEYWORD-STRATEGY.md` (SEO-KW-04, SEO-KW-10).

**SEO-TC-12 — No brief, provisional derivation.** For legacy content without a brief, derive the required subtopics in-gate from the intent analysis alone, mark the derivation as provisional in the coverage checklist, and let the validation report note it. Lower certainty, same honesty.

## Output

The coverage checklist (part of the WRITE-phase working notes and the evidence base for the validation report):

```json
{
  "required_subtopics": [
    {
      "subtopic": "room-temperature bunch method",
      "importance": "load-bearing",
      "depth_plan": "full",
      "status": "present",
      "note": "Steps, water-change routine, and when to choose it over refrigeration"
    },
    {
      "subtopic": "freezing basil",
      "importance": "supporting",
      "depth_plan": "short",
      "status": "thin",
      "note": "Mentioned in one sentence without method specifics — needs two or three concrete sentences or an explicit hand-off link"
    }
  ],
  "user_questions_answered": ["how long does fresh basil last?", "can you freeze basil?", "should you refrigerate basil?"],
  "tangents_found": [],
  "verdict": "WARNING — one thin supporting subtopic",
  "issue_types": ["thin_coverage"]
}
```

The `thin` status on freezing mirrors the shared scenario's intentionally imperfect article: strong overall, one thin supporting subtopic → one WARNING `thin_coverage` at the gate.

### Worked example — applying the tests (shared scenario)

**Thin-content test** on a candidate sentence from the refrigerator-method section:

```
"Make sure you store your basil properly so it stays fresh as long as possible."
```

Strip the topic-specific nouns ("basil") and the sentence still applies to any storage topic on earth — it is thin filler. Replace with topic-specific substance:

```
"Wrap dry basil leaves in a paper towel, slide the bundle into a partly open
bag, and keep it in the warmest part of the fridge (the door shelf); expect
about a week before the leaves darken."
```

The rewritten sentence could not be transplanted onto another topic — it passes.

**Tangent test** on a proposed section, "The History of Basil in Mediterranean Cooking": no reader asking "how do I keep fresh basil fresh for more than a few days?" needs this to act. Verdict: cut it, or spin it off as its own article proposal routed through the PLAN phase (where `CANNIBALIZATION.md` checks it against the inventory first).

**Depth calibration** on the freezing subtopic: the brief marks it "short treatment acceptable" because the reader's dominant path is short-term freshness, not preservation. Two or three concrete sentences (whole frozen leaves vs. frozen puree, expected freezer life) satisfy the plan; a 600-word freezing treatise would be bloat, and a single uninformative mention is the `thin` failure the scenario's article exhibits.

## Quality Checks

| Check | What this module feeds |
|---|---|
| SEO-V03 (topical coverage complete) | The gate reads this module's checklist; `thin`/`missing` on load-bearing subtopics produce `thin_coverage`, CRITICAL when the subtopic is load-bearing and absent |
| SEO-V04 (brief subtopics present) | Every brief `required_subtopic` must land `present`; anything else produces `missing_subtopic` per item |
| SEO-V20 (semantic coverage) | Entities and semantic keywords must appear through natural coverage (SEO-TC-11); systematic absence is `semantic_gap` |

## Failure Handling

- **Load-bearing subtopic missing:** fix the draft (add the section) or, if the topic genuinely cannot support it, re-scope the intent — do not quietly drop the subtopic from the checklist.
- **Thin critical section:** rewrite with topic-specific specifics (numbers, conditions, steps). If specifics are unknown, state the limits honestly rather than padding — an honest short section beats a padded long one, and padding feeds `low_information_gain` instead.
- **Tangent discovered:** cut it, or spin it off as a new topic proposal (route through the PLAN phase, including cannibalization). Never leave a tangent because "it is already written".
- **Brief and intent disagree on required subtopics:** the intent module's list wins (SEO-TC-02); note the disagreement — it usually means the brief is stale and needs regeneration (`CONTENT-BRIEF.md` SEO-CB-15).
- **No brief for legacy content:** derive provisionally (SEO-TC-12), mark lower certainty, proceed.

## Cross-References

- `SKILL.md` — WRITE-phase module map
- `SEARCH-INTENT.md` — the intent dimensions that define the question space
- `KEYWORD-STRATEGY.md` — question queries, entities, and semantic terms as coverage material
- `CONTENT-BRIEF.md` — the brief's `required_subtopics` and depth notes are this module's plan
- `INFORMATION-GAIN.md` — depth quality inside a `present` section is gain, measured there
- `VALIDATION.md` — SEO-V03, SEO-V04, SEO-V20; issue types `thin_coverage`, `missing_subtopic`, `semantic_gap`
- `SCORING.md` — Topic Coverage category (weight 12) deducts from the checklist's failures
