# Editorial Principles

> Module of the content-style skill · Load when: Step 4 of the workflow (always — every article, every workflow, no exceptions for bulk or automation)

## Purpose

This module holds the people-first editorial rules that govern every article the skill produces or edits. It answers one question: *is this article written for a human reader with a real question?* Structure, formatting, niche handling, and validation all hang off these principles — the other modules tell you *how* to satisfy them; this module tells you *why they exist*.

Rules are numbered EP-01 … EP-15. Each rule states the requirement in imperative form, explains the rationale (rules are followed reliably when the reason is understood), and where useful gives a one-line Bad/Good pair. Threshold-style detail (sentence lengths, headings, element mechanics) lives in the specialized modules and is cross-referenced rather than duplicated.

## Inputs

- Classification from Step 1: `content_type`, `niche`, `audience`, `tone` (see `NICHE-PATTERNS.md`)
- `target_word_count` (optional — see EP-09 for how it is treated)
- `source_material` (optional — see `FACTUAL-INTEGRITY.md` for its boundaries)

## Rules

### EP-01 — Write people-first

Write for the human reader who arrived with a question, not for a word count, a content quota, a template, or an algorithm.

Rationale: every downstream measure of content quality — reader trust, return visits, shares, search rankings — is a proxy for whether a real person got what they came for. Content written to satisfy a system first accumulates exactly the defects this skill exists to prevent: filler, padding, repetition, and hedged nothing-statements.

- Bad: "Moisture management is a critical consideration within the domain of fresh herb preservation."
- Good: "Fresh basil keeps for 7 to 10 days when you treat it like cut flowers: trim the stems and stand the bunch in water at room temperature."

### EP-02 — Serve one reader with one question

Before drafting, state (internally) who the reader is and what single question the article answers. Every section must serve that question; anything that does not is cut or moved to a separate article.

Rationale: an article that tries to serve every reader serves none. Specificity of audience is what makes depth decisions (EP-05), tone decisions (EP-06), and section ordering (`STRUCTURE.md` ST-06) resolvable instead of arbitrary.

### EP-03 — Get to the point quickly

The introduction must deliver at least one concrete, topic-specific element and make the article's value clear within the first two sentences. No scene-setting throat-clearing, no dictionary definitions, no "X has become increasingly popular."

Rationale: the reader clicked a title that made a promise. Every sentence before the promise is kept is a sentence the reader spends deciding whether to leave. This rule backs check CS-01; the three strong intro patterns with worked examples are in `STRUCTURE.md` (ST-07 to ST-09).

- Bad: "In today's fast-paced world, storage solutions have become increasingly important for modern households."
- Good: "A basil bunch stays fresh for a week or more on the counter in a glass of water — if you skip the fridge, which blackens the leaves within days."

### EP-04 — Make the introduction strong by criteria, not by feel

Judge every intro against three criteria before moving on:

1. **Specificity** — a number, a named thing, a concrete outcome, or a direct answer appears within the first two sentences.
2. **Value promise** — the reader can tell what they will be able to *do* or *know* after reading.
3. **Relevance to the title** — the intro is recognizably about the thing the title promised (check CS-03).

Rationale: "strong intro" is untestable; these three properties are. They map directly to checks CS-01 and CS-03 and to the intro patterns in `STRUCTURE.md`.

### EP-05 — Calibrate depth to the topic and the reader

Match depth to the complexity of the question and the stakes of getting it wrong, not to a word count or a template. Simple question, low stakes: short and complete (300–600 words can be a finished article). Complex question or high stakes: more detail, more sections, more caveats. When in doubt, cover the reader's decision path completely and stop there.

Rationale: uniform "depth" is a hallmark of mass-produced content — a 1,800-word answer to a 100-word question reads as padding (CS-21), while a 400-word answer to a genuinely complex question is thin. Depth calibration is the honest alternative to both.

### EP-06 — Use the appropriate tone

Default to the vertical's tone in `NICHE-PATTERNS.md` Part B unless the CMS configured `tone`. Stay in one register for the whole article. Tone is warm or neutral or technical — never hype, never salesy, never flippant on safety or YMYL topics (health, money, law).

Rationale: tone is a trust signal. A reader who came for a toilet repair and got stand-up comedy stops trusting the plumbing. Check CS-28 tests this.

### EP-07 — Keep the flow logical

Each section must follow from the previous one by topic logic — the reader should never have to re-orient mid-article. Order sections by reader need: answer first, then supporting detail, then extras (`STRUCTURE.md` ST-06, ST-15; checks CS-06, CS-29).

Rationale: AI-generated drafts often read as independently written blocks glued under headings. Logical flow is what makes an article feel written by one competent person (CS-30) rather than assembled.

### EP-08 — Every paragraph earns its place

Before keeping a paragraph, name its job in one short clause ("tells the reader which symptom means overwatering"). If the job cannot be named, or another paragraph already does that job, delete it.

Rationale: paragraphs are the unit of reader attention. A paragraph with no job costs attention and pays nothing back — that is the definition of filler (CS-20). This test is the primary prevention for CS-20 and CS-21.

### EP-09 — Respect the word count without ever padding

When `target_word_count` is configured, aim for it within **±15%**. NEVER pad to close a shortfall: no restating points in different words, no over-explaining obvious steps, no inflated intros or outros, no decorative sections. A short complete article beats a padded one, always. Record shortfalls in the editorial report `notes` (e.g., "delivered 640 words against 800 target without padding — shortfall flagged, not filled") instead of filling them; that is exactly what check CS-22 requires.

Rationale: padding converts the reader's time into filler to satisfy a number — the direct inversion of people-first writing (EP-01). Over-delivering substance is fine; inflating text is a FAIL (CS-21/CS-22). If the topic genuinely cannot support the target, say so in the report; the target, not the reader, absorbs the disappointment.

- Bad: repeating the storage method summary three times to reach 800 words.
- Good: 640 words, everything said once, report note records the shortfall.

### EP-10 — Practical value is the measure of every section

Every section must leave the reader with something usable: an action, a decision criterion, a concrete fact, or a fix. Sections that only praise the topic, announce what other sections will do, or restate the title fail this test.

Rationale: "value" is the only defensible reason a section exists. This rule is the editing lens for CS-20, CS-26, and CS-27 — conclusions are the most common place value dies quietly.

### EP-11 — End naturally, not ceremonially

Conclude with one of the three natural patterns defined in `STRUCTURE.md` ST-10 to ST-12: restate the direct answer tightly, give next steps, or give decision criteria. Never open the final section with "In conclusion", "In summary", or "To sum up"; never end by restating the intro with nothing added.

Rationale: formulaic closers signal templated writing and waste the reader's last moment of attention, which is the best place to leave them with a next action. Checks CS-26 and CS-27 test this directly.

### EP-12 — Prefer the specific over the generic

Choose concrete numbers, named entities, and worked examples over vague claims wherever the topic honestly supports them — and stay silent rather than vague where it does not. Techniques and their limits: `WRITING-QUALITY.md` WQ-13; the honesty boundary: `FACTUAL-INTEGRITY.md`.

Rationale: specifics are how readers verify that the writer knows the subject; vagueness is how they detect an impostor. Check CS-18 tests specificity; FI rules keep it from becoming fabrication.

- Bad: "Proper watering is important for plant health."
- Good: "Water when the top inch of soil is dry to the touch — roughly every 7 to 10 days for a 6-inch pot indoors."

### EP-13 — Be honest about limits and missing information

If a fact is unavailable, say so plainly or omit the claim entirely — never paper over the gap with a plausible-sounding invention. If a value genuinely varies (prices, bloom times, model specs), hedge it explicitly.

Rationale: an honest "we don't know" costs one sentence; a fabricated certainty costs the reader's trust and triggers an automatic gate FAIL (CS-23/CS-24). Phrasings and examples: `FACTUAL-INTEGRITY.md` FI-05 and FI-04.

### EP-14 — Keep one voice and one person

Pick one grammatical person (usually "you"-addressed guidance voice) and stay in it for the whole article. Do not drift between "I", "we", and "you"; do not adopt firsthand experience the AI does not have (FI-07).

Rationale: person drift is a leading indicator of stitched-together drafting and fails CS-30. The only first-person voice permitted is real author experience supplied by the CMS, attributed to that author (see `FACTUAL-INTEGRITY.md` FI-07).

### EP-15 — Revise targeted, not wholesale

When validation flags issues, fix the flagged issues in place. Do not rewrite passing sections unless CS-30 (overall flow) also failed. Re-run the full gate after the fix — local edits routinely break global checks (CS-14, CS-29, CS-30).

Rationale: wholesale rewrites discard what already passed and introduce new defects; targeted fixes keep the diff reviewable in CMS edit workflows. This mirrors SKILL.md §11 failure handling.

## Examples

Turning a weak paragraph into an EP-compliant one (all rules acting together):

> **Before (violates EP-01, EP-03, EP-10, EP-12):** "In today's fast-paced world, houseplant care has become increasingly popular. Whether you're a beginner or an experienced plant owner, yellow leaves are a common concern that many people encounter. It's important to note that proper care is essential for keeping plants healthy and thriving."
>
> **After:** "Yellow lower leaves that soften one at a time usually mean overwatering — the single most common cause of yellowing in houseplants. Check the soil before watering: if the top two inches are still moist, wait, and cut back on your watering interval rather than your water amount."

The rewrite names a specific symptom, gives a testable action, and drops every sentence that carried no information.

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-01 Introduction strength | EP-03, EP-04 |
| CS-03 Intro–title alignment | EP-04 (criterion 3) |
| CS-17 Empty claims | EP-10, EP-12 |
| CS-18 Specificity | EP-12 |
| CS-20 Filler sentences | EP-08, EP-10 |
| CS-21 Word-count padding | EP-08, EP-09 |
| CS-22 Word-count target handling | EP-09 |
| CS-26 / CS-27 Conclusion quality | EP-11, EP-10 |
| CS-28 Tone fit | EP-06 |
| CS-30 Overall editorial flow | EP-02, EP-07, EP-14 |

## Failure Handling

- If the draft cannot satisfy EP-03 and EP-04 simultaneously (the topic resists any specific intro), the topic is too vague to publish — return to the CMS with that finding instead of writing a generic intro.
- If EP-09 conflicts with a workflow instruction ("hit 1500 words no matter what"), follow EP-09 and record the conflict in the report per SKILL.md §11. Core rules 7 and 8 are not negotiable by workflows.
- If depth calibration (EP-05) and a configured word target cannot both be honored, deliver the calibrated depth and flag the shortfall (EP-09), never the padding.

## Cross-References

- `STRUCTURE.md` — how intro/conclusion strength is built (ST-07 … ST-12) and how sections are ordered (ST-06)
- `NICHE-PATTERNS.md` — tone defaults and skeletons per vertical and archetype
- `WRITING-QUALITY.md` — sentence- and paragraph-level mechanics for EP-12 and the AI-pattern catalog behind strong intros
- `FACTUAL-INTEGRITY.md` — the honesty boundary for EP-12 and EP-13
- `VALIDATION.md` — CS-01, CS-03, CS-17, CS-18, CS-20, CS-21, CS-22, CS-26, CS-27, CS-28, CS-30
