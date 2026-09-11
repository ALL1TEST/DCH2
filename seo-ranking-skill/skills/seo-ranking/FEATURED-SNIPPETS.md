# Featured Snippets — Concise Answers Worth Extracting

> Module 13 of the seo-ranking skill · Phase: WRITE · Load when: snippet opportunities from the brief are being applied to a draft, or answer-position formatting is being revised

## Purpose

Shape content so its best answers can be extracted cleanly — as a featured snippet, as a citation inside an AI answer, or simply as the fastest possible answer for a skimming reader. The doctrine: formatting removes friction; it never manufactures value. A snippet is earned by being the best answer on the page, and this module's job is to stop the article's best answer from being buried under preamble.

Snippet opportunities are IDENTIFIED in the brief (PLAN phase), APPLIED during WRITE, and their structural effects are VERIFIED by the gate (SEO-V36/V39). This module is not a post-hoc decoration pass — it defines the shapes to build while writing.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `content_brief` with its `snippet_opportunities` list | Preferred | Identify opportunities in-draft; note lower confidence |
| `intent_analysis` (main question + question space) | Yes | Definition and concise-answer shapes cannot be targeted without the main question |
| `article` draft | Yes | Module cannot apply formatting |

## Procedure

1. Collect the natural question space: the intent's main question plus the sub-questions users actually ask (from intent analysis and the brief).
2. Classify each opportunity by type: definition, concise answer, list, table, steps, or question-answer section.
3. Apply the type's formatting mechanics (Rules below) at the right position in the draft.
4. Apply the usefulness test (SEO-FS-08): does the formatted answer genuinely answer, or does it tease?
5. Skip opportunities the content does not naturally support (SEO-FS-09) and record each decline with its reason in the brief notes.

## Rules

### Opportunity types and their mechanics

- **SEO-FS-01 · Definitions.** For "What is X" opportunities: a 40–60 word self-contained definition immediately under the question heading. The definition must stand alone — no pronouns pointing upward, no "as mentioned above" — because extraction severs it from its context.
- **SEO-FS-02 · Concise answers.** For direct question headings: the direct answer comes FIRST, elaboration after. The answer paragraph must stand alone as a complete, correct statement; the detail follows in subsequent paragraphs, not inside the answer unit.
- **SEO-FS-03 · Lists.** Ordered steps or unordered item lists that extract cleanly: parallel grammatical structure, one item = one point, no items that only make sense mid-sentence.
- **SEO-FS-04 · Tables.** Comparison and specification tables with clean header rows, one entity per row, one attribute per column, and the compared entity named in the first column.
- **SEO-FS-05 · Steps.** Numbered instructions aligned with HowTo markup (`SCHEMA.md`): the visible step list and the schema's `HowToStep` entries describe the same steps in the same order.
- **SEO-FS-06 · Question-answer sections.** H2/H3 headings phrased as the real questions users ask ("How long does fresh basil last?"), each followed immediately by its answer.

### Mechanics common to all types

- **SEO-FS-07 · Formatting mechanics.** The answer unit lives within roughly 40–60 words, immediately after its heading, with no throat-clearing before it ("Great question", "In this section we will..."), and tables carry clean header rows. Placement and self-containment are the mechanics; the word count is guidance for the answer unit, not a cap on the section's total depth.

### The honesty constraints

- **SEO-FS-08 · The usefulness rule.** Optimize for usefulness, not manipulation. No snippet-bait: a "definition" that is actually a teaser forcing the click ("keep reading to find out the real answer") violates people-first principles; doorway and bait patterns are against this skill, full stop. If the extracted answer would leave the reader misled or incomplete by design, the formatting is wrong.
- **SEO-FS-09 · Skip when the content resists.** Narrative, opinion, or exploratory content that does not naturally suit snippet extraction is left alone — do not contort it into fake Q&A shapes. A recorded decline is a correct outcome.
- **SEO-FS-10 · Earned, not tricked.** Featured snippets are earned by being the best answer, not by formatting tricks. Formatting only removes friction for the extractor and the reader; substance comes from `INFORMATION-GAIN.md`. No formatting rescues an answer that is not the best on the page.

## Opportunity type selection

Map the question to its natural shape before formatting anything — the shape follows the question, never the reverse:

| Question shape | Example | Opportunity type |
|---|---|---|
| "What is X?" | "What is basil blight?" | definition (SEO-FS-01) |
| "How long / how much / how many?" | "How long does fresh basil last?" | concise answer with explicit figures (SEO-FS-02) |
| "How to X?" | "How to store basil in the fridge" | steps (SEO-FS-05) |
| "X vs. Y" / "best X for Y" | "Fridge vs. freezer storage for herbs" | table (SEO-FS-04) |
| "Types of / examples of / ways to X" | "Ways to store fresh herbs" | list (SEO-FS-03) |
| Any real user question with its own demand | "Does basil last longer in water?" | question-answer section (SEO-FS-06) |

A question that fits no shape honestly is declined (SEO-FS-09) — forcing a shape onto resistant content produces contorted prose that serves neither the reader nor the extractor.

## Worked example

Shared scenario, opportunity: "How long does fresh basil last?" (type: concise answer, question heading).

Applied shape:

```markdown
## How long does fresh basil last?

Fresh basil lasts 5–7 days at room temperature and 7–10 days in the refrigerator
when wrapped in a damp paper towel. Freezing extends it to around 4 months for
cooked uses, though the leaves darken.

The room-temperature method keeps the bunch alive like cut flowers...
```

The answer paragraph is self-contained, states explicit durations and conditions, and sits immediately under the heading; the elaboration follows in the next paragraph. The same block satisfies SEO-FS-02 and the explicit-statement discipline of `AI-SEARCH-GEO.md` — one shape, two systems served.

## Output

Snippet opportunity decisions, recorded in the brief and reflected in the draft:

```json
{
  "featured_snippets": {
    "opportunities": [
      { "question": "How long does fresh basil last?", "type": "concise_answer", "status": "applied", "placement": "section 1, first paragraph" },
      { "question": "What is the best way to store basil?", "type": "definition", "status": "declined", "reason": "question space better served by the concise answer; duplicate target" }
    ]
  }
}
```

## Quality Checks

The gate verifies the structural effects of this module — never snippet presence, which no one can promise:

| Check | Verifies here | Result |
|---|---|---|
| SEO-V36 | A concise, self-contained answer to the main question appears early (first ~150 words or first section) | `no_direct_answer` WARNING |
| SEO-V39 | Headings/lists/tables make the key facts extractable | `weak_structure_for_ai` WARNING |

Snippet opportunities belong in the brief: when PLAN identified an opportunity and WRITE leaves it unapplied without a recorded decline reason, flag it in `next_actions`. Scoring: findings feed the **AI Search Readiness** category (weight 6) via V36/V39 (`SCORING.md`); this module adds no separate score category of its own.

What this module does not promise: snippet placement. No formatting guarantees a featured snippet — extraction is the engine's decision. What the formatting guarantees is that the article's best answer is extractable and immediately useful the moment a human or a machine goes looking for it.

## Failure Handling

- Opportunity identified but the draft cannot honestly support the shape (data unknown, answer genuinely contested): decline with a recorded reason — never fabricate the missing specificity to complete a shape.
- Two opportunities target the same question: keep the stronger, decline the duplicate (competing shapes dilute both).
- A table would require invented data cells: do not build the table — the fabrication rule outranks the formatting rule.
- The CMS strips tables or lists in some views: keep the answer paragraph self-contained so extraction survives the strip.
- The honest answer is genuinely longer than 60 words: write the true answer first, compact where compaction loses nothing, and accept the length — accuracy outranks the word-count guidance.

## Cross-References

- `SKILL.md` — module map (this module's slot in WRITE) and the brief contract.
- `CONTENT-BRIEF.md` — where snippet opportunities are recorded during PLAN.
- `AI-SEARCH-GEO.md` — the same clarity serves AI answers; mechanics are shared, effort is not duplicated.
- `SCHEMA.md` — steps (SEO-FS-05) align with HowTo markup; Q&A sections align with FAQPage (visible-questions rule).
- `INFORMATION-GAIN.md` — the substance requirement behind SEO-FS-10.
- `VALIDATION.md` — SEO-V36 / SEO-V39 definitions and severities.
- `SCORING.md` — AI Search Readiness category (weight 6).
