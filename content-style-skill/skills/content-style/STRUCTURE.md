# Structure

> Module of the content-style skill · Load when: Steps 2–3 of the workflow (always — skeleton selection and outline ordering)

## Purpose

This module defines article anatomy: heading hierarchy, section ordering, the three strong introduction patterns, the three natural conclusion patterns, the formatting decision framework, and section-count guidance. Structure exists so the reader reaches the answer in the order they need it — answer first, then detail, then extras.

Rules are numbered ST-01 … ST-18. Which sections an article *contains* (as opposed to how it is built) comes from the vertical × archetype skeleton in `NICHE-PATTERNS.md`; this module governs the shared anatomy underneath.

## Inputs

- The chosen skeleton from Step 2 (`NICHE-PATTERNS.md` Part A, refined by Part B)
- Classification: `content_type`, `niche`, `audience`
- `target_word_count` (drives section-count guidance, ST-14)

## Rules

### Heading hierarchy

**ST-01 — Exactly one H1.** The article has a single `#` heading matching its title. Zero H1s or multiple H1s is a structural FAIL (CS-04). Rationale: the H1 is the shared contract with the SEO layer and the document's anchor; duplicates break both.

**ST-02 — Never skip heading levels.** Heading depth may increase by at most one step at a time (H1 → H2 → H3). An H3 must live under an H2. Skipped levels and decorative heading use (a heading as emphasis, a heading inside a list) fail CS-05. Rationale: skipped levels break the document outline that readers, screen readers, and CMS parsers all navigate by.

**ST-03 — H2 for major sections.** Each H2 is one major stage of the article's job (e.g., Ingredients, Instructions, Troubleshooting). One idea per section, one section per idea. Rationale: H2s are the reader's scan path; mixed-topic sections defeat scanning.

**ST-04 — H3 only for genuine subdivision.** Add an H3 under an H2 only when that H2 covers two or more distinct subtopics that each need their own block (e.g., one cause per H3 under "Common Causes"). Never use H3 decoratively, never to vary typography, never as a pseudo-bold paragraph label. Rationale: decorative H3s inflate the outline with noise and trigger CS-08 (forced formatting). Guideline: an H2 earns H3s when it would otherwise run past roughly six paragraphs on genuinely different subtopics.

**ST-05 — Heading text rules.** Headings must be descriptive and scannable: name the section's actual content ("Troubleshooting a Leak That Persists", not "Other"), keep parallel grammatical structure across sibling headings ("Best for Small Kitchens" / "Best for Big Families" — not "Small Kitchens" / "What About Large Households?"), and phrase question headings the way readers actually ask ("How Long Does Fresh Basil Last?" not "Basil Longevity Considerations"). No clickbait, no vagueness, no trailing colons announcing a list. Rationale: readers navigate by headings before reading prose; parallel, descriptive headings let them. Feeds CS-04/CS-05 context and the scannability half of CS-01.

### Section ordering

**ST-06 — Order sections by reader need.** Answer first, then the supporting detail, then extras. A how-to reaches its steps before its history; a comparison states the quick answer before the detailed table; an informational piece answers the title's question in the first section. Reader-need order is the default; the archetype skeletons in `NICHE-PATTERNS.md` encode it per type, and check CS-06 verifies it. Rationale: the reader came for the answer; everything before it is a toll.

**ST-07 … ST-09 — Introduction patterns.** Use one of three named patterns. Every intro also satisfies the EP-04 criteria (specificity, value promise, title relevance).

**ST-07 — Direct answer intro.** Open with the answer itself, stated plainly, then immediately qualify its scope. Works best for informational and comparison pieces.

> Fresh basil keeps for 7 to 10 days when you treat it like cut flowers — stems trimmed, standing in water at room temperature. Refrigeration blackens the leaves within days, so the counter jar beats the crisper drawer.

**ST-08 — Specific promise intro.** Open with exactly what the article will deliver, in concrete terms (methods, count, time, outcome). Works best for how-tos, guides, and listicles.

> This article covers three basil storage methods ranked by how long they keep the bunch usable: the counter jar, the paper-towel fridge method, and freezing. Each takes under ten minutes of prep and uses supplies you already own.

**ST-09 — Problem/solution intro.** Open with the reader's concrete pain, then name the fix and the article's role in delivering it. Works best for troubleshooting, repairs, and fixes.

> Basil sold in its plastic sleeve wilts within a day or two — the sleeve traps moisture and crushes the stems. Two small changes, trimming the stems and standing them in water, keep a bunch fresh for a week or more.

All three patterns reach a specific element within two sentences (EP-03, CS-01). Anything else — dictionary definitions, popularity claims, "in today's world" — is throat-clearing and is cut on sight.

**ST-10 … ST-12 — Conclusion patterns.** End with one of three natural patterns. Never open the final section with "In conclusion", "In summary", or "To sum up" (CS-26).

**ST-10 — Tight answer restatement.** Restate the direct answer in one or two sentences, compressed and decision-ready, with the key numbers or names intact.

> For most kitchens the counter jar wins: ten minutes of prep, a week of usable basil, no equipment. Freeze whole leaves in oil only when the week's cooking will outrun the bunch.

**ST-11 — Next steps.** Close with what the reader should do now — the first action, in order, concrete.

> Start with the drainage check: before your next watering, press a finger two inches into the soil. If it comes out damp, skip the watering and check again in three days.

**ST-12 — Decision criteria.** Close with the conditions that decide between the article's options, phrased as an if/then the reader can apply to their own situation.

> Pick the air fryer if you cook for one or two and value speed; pick the convection oven if you already own one and capacity matters more than preheat time.

**ST-13 — The formatting decision framework.** Choose every element (table, steps, callout, FAQ, pros/cons, list, H3) through this decision tree; anything that fails it is prose:

```
Do I have 3+ items to compare on 2+ attributes?
  → yes: TABLE (FM-05). Exactly 2 options? A table is still right when the
    head-to-head spans 4+ attributes — that is the comparison archetype's core table.
  → no: write prose, or bullets if scannable but non-tabular.

Am I describing sequential actions the reader must perform in order?
  → yes: NUMBERED STEPS, one action per step (FM-04)
  → no: prose or bullets (FM-03)

Is this a genuine caution, notice, or tip the reader could act on incorrectly without?
  → yes: CALLOUT (`> **Warning:**` / `> **Note:**` / `> **Tip:**`, FM-07)
  → no: fold it into the adjacent prose

Is this a question real readers of this topic actually ask repeatedly, whose
answer is not already stated verbatim nearby?
  → yes: FAQ section
  → no: no FAQ (an FAQ that answers nothing new fails CS-08)

Am I describing genuine tradeoffs where getting one thing means giving up another?
  → yes: PROS/CONS, short and parallel (FM-09)
  → no: prose

Does this H2 cover 2+ distinct subtopics that each need their own block?
  → yes: H3 subdivision (ST-04)
  → no: keep it flat
```

**ST-14 — Scale section count to article length.** Guidance, not law — a section that earns its place stays even if the count runs high, and a padded one is cut even if the count runs low:

| Article length | Typical H2 count |
|---|---|
| Under 800 words | 2–4 H2s |
| 800–1500 words | 3–6 H2s |
| 1500+ words | 5–9 H2s |

Rationale: eight H2s under 600 words means fragmenting (or empty sections); three H2s across 2,000 words means walls of text. Both patterns predict reader abandonment.

**ST-15 — Write transitions, don't bolt them on.** Each section's first sentence should connect to the previous section by topic logic — by continuing a chain the reader is already following (problem → cause → check → fix), not by connector words alone. Explicit transition openers ("Moreover", "Furthermore", "Additionally") start at most one in five paragraphs (CS-16). Rationale: logical continuity reads as one writer; connector-word glue reads as assembly (CS-29, CS-30).

**ST-16 — Never force an element.** Articles MUST NOT be forced to contain a table, FAQ, pros/cons block, callout, list, or H3. Use a format only when it improves the reader's experience per ST-13. A short article can legitimately be headings plus prose and nothing else — that is not a defect, and a validator that treats "no table" as a defect is wrong (CS-08 exists to punish forced formatting, never its absence). Rationale: templated element quotas produce decorative furniture — the 2-column table that repeats two sentences, the FAQ that answers nothing. The element catalog and mechanics: `FORMATTING.md`.

**ST-17 — Skeleton before draft.** Select the vertical × archetype skeleton (`NICHE-PATTERNS.md`) before writing, then order its sections by reader need (ST-06) and cut any section that fails EP-08's earns-its-place test. Rationale: drafting without a skeleton is how articles end up with history sections before their steps (a CS-06 FAIL) and intros that don't know what they're introducing.

**ST-18 — Keep depth shallow.** H3 is the deepest heading in normal use. H4 and below are reserved for genuinely deep reference material and are rare; if you find yourself at H4, usually the content wants to be its own article or a flat list instead. Rationale: deep heading trees are a navigation tax, and every level multiplies the outline the reader must track.

## Examples

Skeleton → outline for a how-to (Gardening × How-to, "How to Prune Tomatoes"):

```
H1  How to Prune Tomatoes
    intro (problem/solution: airflow + fruit size, what this takes, ST-09)
H2  What You'll Need               ← requirements
H2  Steps: Pruning Suckers         ← steps (critical)
H2  What to Cut, What to Keep      ← detail on judgment calls
H2  Troubleshooting                ← recommended
H2  When to Stop Pruning           ← conclusion as next-step guidance (ST-11)
```

No H3s anywhere — none of the H2s covers two distinct subtopics — and no table, FAQ, or pros/cons: nothing in the content earns them (ST-16). This is a complete, correct outline.

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-01 Introduction strength | ST-07 … ST-09 |
| CS-04 / CS-05 headings | ST-01 … ST-04, ST-18 |
| CS-06 Logical section order | ST-06, ST-17 |
| CS-07 Required niche sections | ST-17 (skeleton selection) |
| CS-08 No forced formatting | ST-13, ST-16 |
| CS-16 Excessive transitions | ST-15 |
| CS-26 / CS-27 Conclusion quality | ST-10 … ST-12 |
| CS-29 Logical transitions | ST-15 |

## Failure Handling

- **CS-04/CS-05 FAIL (broken hierarchy):** renumber the outline level by level; never patch one heading in isolation.
- **CS-06 FAIL (wrong order):** reorder sections; do not add bridging text to disguise the order — the order itself is the defect.
- **CS-08 FAIL (forced element):** delete the element or convert it to prose per ST-13; do not "enrich" it to justify it.
- **Intro that fits no pattern (ST-07 … ST-09):** rewrite using the pattern closest to the reader's need; if none fits, the title is probably wrong, not the intro.

## Cross-References

- `NICHE-PATTERNS.md` — which sections exist for each vertical × archetype (CS-07's source of truth)
- `FORMATTING.md` — element mechanics for everything ST-13 admits (FM-03 … FM-11)
- `EDITORIAL-PRINCIPLES.md` — EP-04 intro criteria, EP-11 conclusion rules, EP-08 earns-its-place test
- `WRITING-QUALITY.md` — sentence-level transitions within sections
- `VALIDATION.md` — CS-01, CS-04, CS-05, CS-06, CS-07, CS-08, CS-16, CS-26, CS-27, CS-29
