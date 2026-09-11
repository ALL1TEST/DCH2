# Writing Quality

> Module of the content-style skill · Load when: Steps 4–5 of the workflow (always — drafting and the self-review sweep)

## Purpose

This module governs the human voice: sentence and paragraph mechanics, specificity, the AI-pattern catalog, and the detection procedures that feed checks CS-02, CS-10, CS-11, CS-12, CS-14, CS-15, CS-16, CS-17, CS-18, CS-19, and CS-20. Its goal is prose that reads like one competent, knowledgeable human wrote it in one sitting — because that is the reader's default trust heuristic, and every deviation from it costs credibility.

The single most important rule here is WQ-07: pattern detection is **contextual, never a mechanical word ban**. Read it before using the catalog.

## Inputs

- The draft article (Step 5 sweeps the finished draft)
- Classification (drives tone register and jargon tolerance, CS-13)

## Rules

### WQ-01 — Write in a direct, confident voice

State things plainly and commit to them. Prefer "Do X" and "X causes Y" over "It could be said that X may cause Y." Confidence comes from being right and specific, not from adjectives. Rationale: hedged, qualified prose reads as either uncertainty or evasion; readers extend trust to writing that commits. (Confidence never overrides honesty — see FI rules when the facts are genuinely uncertain.)

### WQ-02 — Prefer active voice

Default to active constructions; keep passive below roughly 40% of sentences in non-technical niches (CS-12). Passive is acceptable where the actor is genuinely irrelevant ("The plants were watered twice weekly during the trial period" in a research recap). It is never acceptable in instructions: "The switch should be flipped" fails CS-12 outright. Rationale: active voice names the actor, which is how readers know who does what — the difference between instructions and atmosphere.

### WQ-03 — Keep sentences disciplined

Target an average of 15–22 words per sentence. Flag any sentence over 35 words for review; rewrite any sentence over 60 (CS-10). Rationale: long sentences hide their verbs, and the reader loses the thread mid-clause; the thresholds are statistical guides, not hard walls — one 38-word sentence in a varied article is fine, a pattern of them is not.

### WQ-04 — Vary sentence length deliberately

Mix short and long sentences on purpose: a 5–8 word sentence after two 20-word ones lands a point; a run of them becomes choppy. Rationale: uniform sentence length produces the droning rhythm readers associate with machine-generated text (CS-11); deliberate variation is what makes prose feel spoken by a person.

### WQ-05 — Keep paragraphs disciplined

Paragraphs run 2–5 sentences typically, 6 sentences maximum, and carry one idea each (CS-09's word ceiling is 150 per paragraph, 250 as an absolute wall). A new idea, a new example, a turn in the argument — any of these starts a new paragraph. Rationale: the paragraph is the reader's unit of comprehension; over-stuffed paragraphs bury the idea they're carrying, and one-idea paragraphs make the idea findable on a scroll back.

### WQ-06 — Vary openers

Vary both sentence openers (subject-verb, prepositional phrase, dependent clause, question, imperative) and paragraph openers across each 5-sentence window (CS-11, CS-14). Rationale: repetition at the *start* of units is the most perceptible repetition — readers notice paragraph openers before they notice anything else (see the detection procedure below; CS-14 fails at 3+ consecutive same-opener paragraphs).

### WQ-07 — Detect AI patterns contextually, never mechanically

The catalog below lists phrases strongly associated with mass-generated text. The detection rule is **contextual, not a word ban**:

- **Flag** a catalog phrase when it appears in an **opening or closing position** (first/last two sentences of the article or a section) **or does transition work with no specific content around it** — announcing, promising, or hand-waving instead of informing.
- **Do NOT flag** a listed word used with specific meaning mid-sentence. "Robust" describing a tested tomato variety, "seamless" describing a genuinely seamless join, "the ultimate guide" in a title where the article really is a comprehensive reference — all fine. The pattern is the empty use, not the string.

This rule backs CS-02 (intro/conclusion positions) and CS-19 (body-wide density): 1–2 instances in weak positions warn; 3+ distinct patterns across intro+conclusion, catalog-as-connective-tissue, or an intro made entirely of catalog phrases fail. When a flag is genuinely ambiguous, prefer WARNING over FAIL (VALIDATION.md failure handling).

### WQ-08 — No rhetorical template loops

Never repeat a rhetorical shape across consecutive paragraphs — especially the classic generated loop: `claim → "Whether you're X or Y" → "It's important to note" → restate claim`. Each paragraph must advance, not re-tread. Rationale: template loops are the strongest machine-writing signal readers have; they also waste the paragraph slot that a new idea should occupy (CS-15 fails at one template used by >50% of body paragraphs, or even 3+ consecutive).

### WQ-09 — Spend transitions economically

Let logic, not connector words, carry the reader between sentences and sections. Explicit transition openers ("Moreover", "Furthermore", "Additionally", "That said", "In addition") start at most one paragraph in five (CS-16). Rationale: connectors are scaffolding; when the underlying logic works, most can be deleted without loss — and a draft that leans on them is telling you its logic doesn't work yet.

### WQ-10 — No filler: apply the delete-without-loss test

For each sentence, ask: if I deleted this, would the reader lose any information, promise, or necessary tone? If no, delete it. Filler archetypes and their rewrites are tabulated in the filler catalog below. Rationale: filler converts reader attention into nothing; it is the prose form of padding (CS-20 warns at 1–2 per 500 words and fails past 10% of sentences or at whole filler paragraphs).

### WQ-11 — No padding: never restate to inflate length

Restating a point in different words, over-explaining an obvious step, and inflating intros/outros are padding, not emphasis (CS-21, CS-22, and EP-09). Emphasis is earned by *position* and *brevity* (one short restatement of the core answer in the conclusion is the ST-10 pattern); everything else is length-filling. Rationale: the reader pays for every word with time; padding charges them and delivers nothing.

### WQ-12 — No empty claims

Superlatives and unsupported assertions ("the best", "industry-leading", "proven to", "everyone knows") either get support, get specific, or get cut (CS-17). Rationale: an empty claim is a check the reader can't cash — and the one a skeptical reader always tries to cash first. If support doesn't exist in source material or common knowledge, the claim is fabrication-adjacent (see FI-01).

### WQ-13 — Be specific with technique, not decoration

Replace vague claims with concrete specifics wherever the topic honestly supports them:

- **Concrete numbers** — quantities, durations, temperatures, sizes ("water when the top inch of soil is dry", not "water appropriately").
- **Named entities** — real tools, plants, mechanisms, species ("Dracaena trifasciata", not "certain foliage species").
- **Examples** — one worked instance instead of an abstraction.
- **Scope statements** — honest boundaries instead of universals ("in most temperate zones", not "everywhere").

Rationale: specifics are how a reader verifies the writer knows the subject (CS-18); they are also the raw material of practical value (EP-12). Specifics must stay inside the honesty boundary — never invent a number to be specific (FI-08).

- Bad: "Basil requires proper moisture management for optimal freshness."
- Good: "A basil bunch keeps 7 to 10 days in a jar of water on the counter; the fridge blackens the leaves in 2 to 3 days."

### WQ-14 — Show, don't summarize

Prefer one concrete demonstration (a worked example, a mini-dialogue of the failure mode, a before/after) over a paragraph of abstract summary. Rationale: examples transfer skill; summaries transfer vocabulary. Over-indexing on abstraction is also a generated-text tell — models summarize beautifully and demonstrate rarely.

### WQ-15 — One person, one voice

Address the reader as "you" and stay there. Do not drift into "I" or "we", and never adopt experience the AI does not have — "in our testing", "after years of", "my favorite" are fabrication unless the CMS supplied real author experience, in which case they are attributed to that author (FI-07). Rationale: person drift breaks the single-writer illusion (CS-30) and fake experience is an integrity FAIL (CS-24).

### WQ-16 — Match jargon to the reader

Use technical terms when the audience uses them; define each term at first use when the default-audience is a beginner (CS-13). In between: term first, plain-language gloss in apposition ("deadheading — removing spent blooms —"). Rationale: unexplained jargon excludes the reader; over-explained jargon patronizes the expert. The audience from Step 1 decides which failure to avoid.

## The AI-pattern catalog

~25 phrases and constructions strongly associated with mass-generated text. Position and emptiness decide the flag (WQ-07); the string alone never does.

| # | Pattern | Why it reads as AI-generated | Rewrite direction |
|---|---|---|---|
| 1 | "In today's world" / "In today's fast-paced world" | Universal preface that adds no information; pure scene-setting | Open with the article's actual fact or answer |
| 2 | "In the ever-evolving landscape of X" | Vague dynamism claim doing transition work with no content | Name what actually changed, or cut the sentence |
| 3 | "In the realm of X" / "in the world of X" | Inflated register where a plain "in X" does the job | "In home brewing, …" |
| 4 | "Whether you're a beginner or…" / "whether you're X or Y" | Fake audience-inclusion that splits a claim so it means nothing | Address the actual reader the article targets |
| 5 | "It's important to note that…" | Importance asserted instead of demonstrated; the note that follows is usually the sentence | State the thing directly, without the preamble |
| 6 | "It's worth noting" / "It goes without saying" | Same empty importance gesture; "goes without saying" is self-refuting | Cut the frame; keep the content if any |
| 7 | "In conclusion" / "In summary" / "To sum up" | Templated closer announcing what the final paragraph should just do | End with the tight restatement or next step itself |
| 8 | "Let's dive in" / "Let's explore" / "Let's delve" | Tour-guide announcement of action instead of action | Start the actual content |
| 9 | "Dive deep into" / "deep dive" (as verb-frame) | Engagement-bait framing for ordinary coverage | "This section covers …" or just cover it |
| 10 | "game-changer" | Hype adjective with no falsifiable content | State the concrete change: what it does that prior options didn't |
| 11 | "unlock the potential of" / "unlock the power of" | Marketing metaphor replacing a mechanism | Say what the reader gains and how |
| 12 | "elevate your X" | Lifestyle-ad register; promises status, delivers nothing verifiable | "Improves X by …" or describe the actual upgrade |
| 13 | "When it comes to X, …" | Stalling opener that re-announces the topic already in the heading | Start at the verb: "X needs …" |
| 14 | "Look no further" | Sales-page urgency frame | Present the option with its honest tradeoffs |
| 15 | "The ultimate guide to X" | In titles: sometimes legitimate when coverage is genuinely comprehensive; as body-text promise: hype | Title use OK if the article is the real thing; in prose, describe actual scope |
| 16 | "X is key/crucial/essential" (empty predicate) | Importance asserted with zero mechanism | Say what X does: "X controls drainage, which is what kills these roots" |
| 17 | "Navigate the world of X" / "navigate the complexities of" | Journey metaphor replacing actual guidance | Give the decision path itself |
| 18 | "a testament to" | Boilerplate significance frame | State the causal link plainly |
| 19 | "revolutionize" / "revolutionary" | Hyperbolic changelog language; almost never literally true | Describe the delta concretely |
| 20 | "seamlessly" (buzzword use) | Claims frictionlessness no product or process actually has | If the join matters, describe it; if not, cut the adverb |
| 21 | "robust" (buzzword use) | Filler intensity adjective when no robustness was tested | Keep only with specific meaning: "a robust variety that survived …" |
| 22 | "At the end of the day" | Rhetorical throat-clear before the actual point | Just make the point |
| 23 | "Buckle up" / "Grab your [tool]" | Personality-borrowing openers that delay content | Open with the first fact |
| 24 | "Harness the power of" | Same as unlock-the-potential, different costume | Describe the mechanism and payoff |
| 25 | "In the digital age" / "In an era where…" | Epoch framing instead of a topic sentence | Name the specific current condition that matters |

## Detection procedures (Step 5 self-review)

Run these three sweeps on the finished draft, in order. They are written so a validating agent can execute them mechanically enough to be reproducible; every flag then gets the WQ-07 context judgment before it is reported.

### Sweep 1 — Repetition detection (feeds CS-14 / CS-15)

1. **Paragraph-opener n-grams.** Collect the first 3 words of every paragraph and the first sentence of every H2/H3 section. Count duplicates. Report: 3 consecutive paragraphs sharing an opener, or 5+ article-wide → CS-14 WARNING; ≥50% of paragraphs, or 4+ consecutive → CS-14 FAIL.
2. **Consecutive same-opener counting.** Walk the paragraphs in order; note the longest run of identical openers. A run of 4 is already FAIL territory — fix before validation, not after.
3. **Rhetorical template detection.** For each body paragraph, sketch its shape as a 4-slot pattern: [opener type] → [claim/none] → [audience-split phrase present?] → [restatement present?]. Flag the classic loop shape: claim → "whether you're X or Y" → "It's important to note" → restate. Same 4+ word non-technical phrase repeated 4+ times article-wide, or one template across 3+ consecutive paragraphs → CS-15 WARNING; >50% of body paragraphs on one template → CS-15 FAIL.
4. **n-gram repetition.** Scan for any non-technical 4+ word phrase occurring 4+ times. Technical terms of art ("turn the shut-off valve clockwise") get an exemption; marketing phrases never do.

### Sweep 2 — AI-pattern sweep (feeds CS-02 / CS-19)

1. Scan the **first 2 and last 2 sentences** of the article and of each major section against the catalog. Count distinct patterns. Apply WQ-07's context test to each hit before counting it.
2. Scan the **whole body** and compute catalog density. Over 1 per 300 words concentrated in openers → CS-19 WARNING; catalog phrases serving as the article's connective tissue (present in most sections, doing transition work) → CS-19 FAIL.
3. For each hit, decide: delete it, rewrite it toward its content, or (rare, defensible) keep it because it carries specific meaning mid-sentence.

### Sweep 3 — Filler detection: the delete-without-loss test (feeds CS-20)

For every sentence, attempt deletion. The sentence survives only if removal loses information, a promise the reader needs, or necessary tone. The recurring filler archetypes and their fixes:

| Filler archetype | Example | Rewrite |
|---|---|---|
| Topic praise | "Proper storage is an essential part of every kitchen." | Delete. If the section needs an opener, open with the first fact instead |
| Announcement of what was just shown | "As you can see, these steps make the process straightforward." | Delete; the reader just saw it |
| Announcement of what comes next | "Now let's look at some tips." | Delete the announcement; the H2 "Tips" already said it |
| Synonym restatement of the previous sentence | "Trimming the stems matters. Cutting the stem ends is important." | Keep one — the more specific one |
| Permission/audience filler | "Whether you're a novice or an expert, this applies to everyone." | Delete, or replace with the actual scope: "This works for both gas and charcoal grills" |

Thresholds: 1–2 survivors per 500 words → CS-20 WARNING; more than 10% of sentences, or any whole paragraph that survives deletion → CS-20 FAIL (a whole surviving paragraph also means CS-21 territory — check whether padding is present).

## Examples

A paragraph before and after the full sweep set (WQ-03, WQ-06, WQ-10, WQ-13):

> **Before:** "In the ever-evolving landscape of modern gardening, plant care has become increasingly important for enthusiasts. Whether you're a seasoned gardener or a complete beginner, it's important to note that proper watering practices are essential for healthy houseplants. At the end of the day, water is a key factor when it comes to plant health. Let's dive in and explore this crucial topic."
>
> **After:** "Overwatering kills more houseplants than drought does. The fix is a finger test: press two inches into the soil, and water only when what comes out is dry."

The rewrite deletes four catalog patterns, one filler sentence, and two empty claims, then adds the specifics (a mechanism, a test, a threshold) that make the paragraph worth reading.

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-02 / CS-19 AI-pattern detection | WQ-07, catalog, Sweep 2 |
| CS-10 / CS-11 sentence mechanics | WQ-03, WQ-04, WQ-06 |
| CS-12 active voice | WQ-02 |
| CS-13 reading level | WQ-16 |
| CS-14 / CS-15 repetition | WQ-06, WQ-08, Sweep 1 |
| CS-16 transitions | WQ-09 |
| CS-17 empty claims | WQ-12 |
| CS-18 specificity | WQ-13, WQ-14 |
| CS-20 filler | WQ-10, Sweep 3 |
| CS-21 / CS-22 padding | WQ-11 |
| CS-30 flow and person | WQ-15 |

## Failure Handling

- **Self-review flags (Step 5):** fix before validation — Step 6 should mostly confirm, not discover. Re-run the sweep after fixes; rewrites introduce new openers.
- **Ambiguous catalog hit:** apply WQ-07 literally — mid-sentence with specific meaning is not a flag. If still ambiguous, report WARNING, never FAIL (VALIDATION.md).
- **Template loop found in regeneration mode:** compare against the original article; if the regenerated text reproduces the original's paragraph shapes, that is CS-15 FAIL even with all-new words (SKILL.md §11).

## Cross-References

- `EDITORIAL-PRINCIPLES.md` — EP-08 (earns-its-place), EP-12 (specificity principle), EP-14 (person discipline)
- `STRUCTURE.md` — ST-15 (transitions between sections)
- `FACTUAL-INTEGRITY.md` — the boundary specifics must not cross (FI-01, FI-08); fake experience phrasing (FI-07)
- `VALIDATION.md` — CS-02, CS-10, CS-11, CS-12, CS-13, CS-14, CS-15, CS-16, CS-17, CS-18, CS-19, CS-20, CS-21, CS-22
