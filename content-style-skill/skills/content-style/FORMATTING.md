# Formatting

> Module of the content-style skill · Load when: Step 4 of the workflow (always — every article, every workflow)

## Purpose

This module defines the element-level mechanics of every supported formatting element: when to use it, when not to, and how it must be built. The governing principle is FM-01 — formatting is contextual. A table, list, callout, FAQ, or heading level exists in an article only when it improves the reader's experience; check CS-08 exists to punish forced formatting, never its absence. This module supplies the "how" that `STRUCTURE.md` ST-13's decision framework gates.

## Inputs

- The outline from Step 3 (sections and their content plans)
- The element decisions made through the ST-13 decision framework
- Vertical context (safety-relevant verticals legitimately use more Warning callouts — NP-05)

## Rules

### FM-01 — Formatting is contextual, never forced, never forbidden

Use an element only when the ST-13 decision framework admits it. An article with no table, no FAQ, no pros/cons, no callout, and no H3 is a valid article — absence of an element is never a defect. Presence of a decorative element is (CS-08). Conversely, never forbid an element wholesale: DIY safety needs Warning callouts; comparisons need tables. Rationale: element quotas produce decorative furniture; element bans amputate genuine utility. The reader's task decides, not a template.

### FM-02 — Paragraphs are the default element

Prose is the default; every other element must justify itself against prose per ST-13. Paragraph mechanics (2–5 sentences, one idea) are WQ-05's; here the rule is the priority order: when in doubt, write a paragraph. Rationale: paragraphs carry reasoning, nuance, and connection — everything lists and tables cannot. Elements are for scannable structure, not for avoiding the work of writing connected prose.

### FM-03 — Bullet lists: parallel, one idea per bullet

Use a bullet list for 2–7 scannable, non-sequential, non-tabular items — requirements, options, characteristics. Mechanics:

- **Parallel structure:** every bullet starts in the same grammatical form (all nouns, all imperative verbs, all short clauses). A typical bullet opens with a 2–7 word lead phrase, then optionally elaborates.
- **One idea per bullet:** if a bullet contains "and" joining two ideas, it wants to be two bullets (or a paragraph).
- **No nesting beyond one level** unless the hierarchy is genuine; a nested list under a nested list is almost always a table or a restructure in disguise.
- **No single-bullet lists** and no full-sentence bullets doing prose's job.

Rationale: bullets trade connectedness for scannability — a fair trade only when items are truly parallel and atomic. Misused bullets fragment reading without adding scan value (CS-08 territory when decorative).

### FM-04 — Numbered lists and step-by-step instructions

Use numbered steps only for sequential actions the reader performs in order. Mechanics:

- **One action per step.** "Pat the thighs dry with paper towels" is one action; "pat dry, salt, and heat the pan" is three.
- **Imperative voice.** Steps start with the verb ("Turn…", "Press…", "Check…"), never with "You should now…" or "The next thing to do is…".
- **Steps are sequentially complete.** The reader never infers an intermediate state — if the pan needs to be hot before the butter goes in, the step that ends with a hot pan comes first.
- **Quantities and conditions live inside the step**, not after it: "Sear skin-side down for 7 to 9 minutes without moving them", not "Sear the thighs. (For 7–9 minutes. Don't move them.)"
- Where a step has a verifiable end state, the step includes it: "…until the water line sits about an inch below the overflow tube's top."

Rationale: instructions are the highest-stakes format in the skill — a reader mid-task with wet hands follows them literally. Ambiguity here is not a style issue; it is a failure of the article's core job. Feeds CS-07 (steps are critical for how-tos) and CS-08 (fragmenting steps into a table fails).

### FM-05 — Tables

Use a table when comparing **3+ items on 2+ attributes**, or **exactly 2 options on 4+ attributes** (the head-to-head comparison table). Never a table for two trivial items — that is what a sentence is for. Mechanics:

- **Max ~5 columns** for mobile readability; more columns means fewer readers who can parse the table at phone width.
- **A clear header row** that names each attribute as the reader thinks of it ("Typical capacity", not "Parameter 2").
- Cell content is short — fragments, not sentences; the prose around the table carries the reasoning.
- Attribute columns must be decision-relevant (what the reader chooses on), not marketing-relevant (what a seller would list).

Rationale: tables earn their space through comparison density; below the threshold they are slower to read than prose and impossible to skim on small screens. Feeds CS-08.

### FM-06 — Comparison tables

Comparison-archetype tables follow FM-05 and add:

- A **verdict row or "best for" follow-up** — the table must not simply end; the reader gets the conclusion the data points to, in or directly after the table.
- Hedged entries for variable attributes ("varies by model", "typically 10–15 min") rather than invented precision (FI-04).
- If one attribute actually decides the comparison, the surrounding prose says so — tables inform the decision; they don't make it alone.

Rationale: a table without a verdict transfers the analytical work back to the reader, which is the job the article was clicked for. Feeds CS-07 (the comparison table is critical for comparisons) and CS-08.

### FM-07 — Callouts: the portable convention

Use the exact portable syntax — `> **Note:**`, `> **Warning:**`, `> **Tip:**` — one callout per caution, placed where the content becomes live (not in an end-of-article dump):

- **`> **Warning:**`** — genuine hazards and irreversible-consequence cautions: safety (electrical, gas, toxic foods to a species), data loss, damage risk, "stop here and call a professional". Safety warnings in DIY, Pets, Food, and Parenting SHOULD use Warning callouts (NP-05).
- **`> **Note:**`** — neutral information the reader could otherwise miss: a variation, a definition with consequences, spoiler labels in Gaming.
- **`> **Tip:**`** — genuine shortcuts and improvements, never generic advice ("Tip: read carefully").

Never promote a Tip to a Warning or vice versa — a diluted severity scale trains readers to ignore it. Integrating agents may remap these markers to CMS components (an aside, a styled admonition); the semantics — genuine caution, placed at the point of risk — must survive the remap. Rationale: callouts work by contrast with surrounding prose; fake or misgraded callouts exhaust the reader's alarm budget before the real one arrives. Feeds CS-08.

### FM-08 — Examples

Label examples explicitly ("Example:", "For instance:") and keep them short and concrete: one worked instance, not a survey of possible instances. Where an example uses numbers, they are either well-known constants, supplied data, or clearly illustrative values labeled as such ("say, a 6-inch pot"). Rationale: examples transfer understanding (WQ-14) and unlabeled illustrative numbers drift into looking like data (FI-03). Labeling keeps the example honest and reusable.

### FM-09 — Pros and cons

Use a pros/cons block only for genuine tradeoffs — where getting one benefit means giving something up. Mechanics: two short parallel lists (2–5 items each), matched grain (a "faster preheat" pro pairs against a "smaller capacity" con — not against "bad"), no filler entries to balance the sides. Rationale: balanced-looking pros/cons on a one-sided verdict is a formatting lie; the reader smells it and stops trusting the block. Feeds CS-08 (decorative pros/cons fail).

### FM-10 — Notes

Inline notes stay in prose — parenthetical or an em-dash clause — unless they qualify as a genuine callout (FM-07). Do not create a "Notes" H2 as a junk drawer for content that didn't fit elsewhere; if a note doesn't belong where it lands, it belongs in a different section or nowhere (EP-08). Rationale: "Notes" sections are where drafts hide their structural mistakes.

### FM-11 — Summaries and key takeaways

Use a "Key takeaways" or summary block only when both conditions hold: the article is roughly 1200+ words AND reference-shaped — the kind readers return to (multi-cause explainers, decision guides). Takeaways are 3–6 bullets, each a compressed decision-relevant claim, no new information, no "in summary" phrasing. Rationale: a summary of a 700-word article just repeats it (CS-20/CS-26 territory); a summary of an argumentative piece substitutes for reading it. Reference material is the one shape where a takeaways block pays rent.

### FM-12 — Emphasis rules

- **Bold, sparingly:** genuinely key terms at first use, and verdicts/decisions ("Best for small kitchens: the air fryer"). Not for emphasis-by-shouting.
- **No bold-entire-sentences** and no bold-entire-paragraphs. If a whole sentence needs weight, it needs rewriting, not formatting.
- **Italics almost never for emphasis.** Italics are for titles of works, botanical Latin (Dracaena trifasciata), and words-as-words. Emphasis italics read as marketing voice.

Rationale: emphasis is a currency; printing more of it inflates it. When everything is bold, the reader's eye finds nothing. Feeds CS-30 (voice consistency) indirectly and CS-08 (decorative formatting).

### FM-13 — No emoji, no decorative dividers

No emoji anywhere in article body content. No decorative horizontal rules inside the article (`---` between sections), no ASCII art dividers, no decorative symbols standing in for structure. The one legitimate horizontal rule is in the source format of example files separating metadata from content. Rationale: emoji and dividers are typography doing structure's job — the heading hierarchy already provides separation, and every CMS theme renders emoji inconsistently. Package convention: no emojis in any file (SKILL.md conventions; worklog).

### FM-14 — Markdown purity

Standard Markdown only:

- **No HTML** unless the CMS explicitly requires it at integration; if the CMS's flavor needs HTML elements, that remap lives in the integration layer, not in generated articles.
- **Images** are referenced with a descriptive context sentence immediately before and after the embed, so the image never interrupts a logical step, and the alt text has prose to lean on. (Alt-text keyword strategy belongs to the seo-ranking skill; the sentence here is editorial context.)
- **Standard syntax only:** ATX headings (`#`, `##`, `###`), pipe tables, `-` bullets, `1.` numbering, `>` blockquotes for callouts. No nested blockquote tricks, no definition-list approximations, no custom syntax a future CMS parser will mangle.

Rationale: generated articles flow through unknown parsers (CMS field, RSS, AI search extraction, email). Every nonstandard construct is a corruption risk at one of those hops. Feeds CS-04/CS-05 mechanics and SKILL.md §9.1's output contract.

## Examples

**Callout grading (FM-07) — same article, three correctly graded callouts:**

> **Warning:** Shut off the toilet's supply valve before removing the fill valve. Water under household pressure will otherwise spray from the connection.

> **Tip:** A few drops of food coloring in the tank will tell you in about 20 minutes whether the flapper is leaking — if color appears in the bowl, it is.

> **Note:** Tank lids are heavy ceramic with no handle. Set yours on a towel, flat side down, where it cannot be knocked.

**Table threshold (FM-05) — two trivial items stay prose:**

- Bad (table): a 2-column, 1-attribute "table" comparing matte vs. satin paint on "appearance".
- Good (prose): "Matte hides wall imperfections but scuffs easily; satin has a soft sheen that resists scuffs and cleans better — the usual pick for hallways."

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-08 No forced formatting | FM-01, FM-03, FM-05, FM-06, FM-09, FM-11 |
| CS-07 Required niche sections | FM-04 (steps), FM-06 (comparison table) as the elements critical sections are made of |
| CS-09 Paragraph length | FM-02 (prose default discipline, with WQ-05) |
| CS-26 Conclusion quality | FM-11 (takeaways that repeat the article instead of closing it) |
| CS-30 Overall flow | FM-13, FM-14 (mechanical noise that breaks the single-writer illusion) |

## Failure Handling

- **CS-08 FAIL (decorative element):** delete it or convert to prose per ST-13. Never "improve" a decorative table by adding columns — decorative means the comparison was never needed.
- **Element split across a needed refactor (e.g., 6-column table on mobile):** restructure the table (split by attribute group, move detail to prose), don't just shrink cells.
- **Callout inflation found (Warnings that are tips):** regrade each against FM-07's severity scale in one pass, then re-run CS-08.
- **CMS requires HTML:** keep the generated layer pure Markdown and convert in the integration layer; record the conversion in the CMS integration notes, not per-article.

## Cross-References

- `STRUCTURE.md` — ST-13 decision framework (the gate this module implements), ST-16 (never force)
- `WRITING-QUALITY.md` — WQ-05 paragraph mechanics, WQ-13 specificity inside lists and cells
- `FACTUAL-INTEGRITY.md` — FI-04 hedged table entries; FM-08's illustrative-number labeling
- `NICHE-PATTERNS.md` — NP-05 safety callouts by vertical; archetype element expectations (A-2 tables, A-4 numbered items)
- `VALIDATION.md` — CS-07, CS-08, CS-09, CS-26, CS-30
