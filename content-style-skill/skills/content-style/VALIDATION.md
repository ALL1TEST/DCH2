# Content Style Validation — The Editorial Quality Gate

> Module of the content-style skill · Load when: Step 6 of the workflow (always, for every article, in every workflow — including bulk and automation)

## Purpose

This is the final gate between a draft and a publishable article. It defines the 30 validation checks (`CS-01 … CS-30`), how each is detected, the thresholds that separate PASS / WARNING / FAIL, the aggregation logic that produces the verdict, and the editorial report format the CMS stores with the article.

The validator must run as a **separate pass from generation** (see SKILL.md §12): the agent that wrote the article should not grade it in the same context.

## Inputs

- The finished article (Markdown)
- The classification from Step 1 (`content_type`, `niche`, `audience`, `tone`)
- `target_word_count` (if configured)
- For regeneration mode: the original article (for CS-15 comparison)
- `NICHE-PATTERNS.md` skeleton for the classified vertical × archetype (for CS-07)

## How to read the check tables

Each check is a row with: what it detects, the detection method, and the result conditions. Thresholds are defaults — an integration may tune the numbers, but the check IDs, result scale, and aggregation logic stay stable so reports remain comparable.

Result scale (per check): `PASS` / `WARNING` / `FAIL`. A check that does not apply (e.g., CS-09 on a table-only section) is omitted from the report rather than forced to PASS.

## Check catalog

### Group A — Introduction

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-01 | Introduction strength | Does the first paragraph contain at least one concrete, topic-specific element (a number, a named thing, a specific outcome, a direct answer) and make the article's value clear within 2 sentences? | Intro is on-topic but takes 3+ sentences to reach anything specific, or promises value without signaling what it is | Intro could be prepended to any article on any topic unchanged (fully generic), or buries the actual answer below irrelevant scene-setting |
| CS-02 | Generic AI opener | Scan the first 2 sentences and the last 2 sentences for catalog phrases (see `WRITING-QUALITY.md` WQ-07 list: "In today's world", "In the fast-paced/digital/ever-evolving …", "Whether you're a beginner or …", "Look no further", "Let's dive in", "Unlock/elevate/delve …"). Contextual, not mechanical: a listed phrase used with specific meaning is fine | 1–2 catalog patterns present in intro/conclusion without specific content around them | 3+ distinct catalog patterns across intro+conclusion, or the intro consists entirely of catalog patterns with zero specifics |
| CS-03 | Intro–title alignment | Compare the intro's promise against the H1/title. A reader who clicked the title should recognize the intro as being about that thing | Intro drifts from the title's promise (related but different angle) | Intro is about a different topic than the title promises |

### Group B — Structure

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-04 | Single H1 | Count `#` headings. Exactly one must exist, matching the article title | — | Zero H1, or more than one H1 |
| CS-05 | No skipped heading levels | Walk the heading tree; level may increase by at most 1 (H1→H2→H3) | One skipped level (H1→H3) present | Multiple skipped levels, or heading levels used decoratively/for emphasis |
| CS-06 | Logical section order | Sections should follow the reader's need order per `STRUCTURE.md` (answer first, then detail, then extras) | One section out of reader-need order (e.g., FAQ before the answer it references) | Structure forces the reader through unrelated sections before the main answer (e.g., long history section before a how-to's steps) |
| CS-07 | Required niche sections present | Compare actual H2/H3 set against the skeleton in `NICHE-PATTERNS.md` for the classified vertical × archetype. Each skeleton marks sections `critical` or `recommended` | A `recommended` section is missing | A `critical` section is missing (e.g., recipe without ingredients or instructions; how-to without steps; comparison without the comparison itself) |
| CS-08 | No forced formatting | For each table, FAQ block, pros/cons, callout, and H3: does it serve the reader (comparison of 3+ items on 2+ attributes; genuine recurring question; real tradeoff; real caution; real subdivision)? | One decorative element present (e.g., a 2-column table that repeats two sentences, or an FAQ that answers nothing not already stated) | Multiple decorative elements, or a format actively obscures the answer (e.g., steps fragmented into a table) |

### Group C — Readability

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-09 | Paragraph length | Measure words and sentences per paragraph | Any paragraph > 150 words or > 6 sentences (flag each instance with location) | 3+ paragraphs exceed both limits, or a single paragraph > 250 words (wall of text) |
| CS-10 | Sentence length | Count words per sentence; compute the share > 35 words | 10–20% of sentences > 35 words | > 20% of sentences > 35 words, or any single sentence > 60 words |
| CS-11 | Sentence variety | Look at sentence-length distribution and opening structures over each 5-sentence window | A window where 4+ of 5 sentences share the same length band (±3 words) and same opener pattern (e.g., all start subject-verb) | Monotone rhythm across the whole article (same pattern in most windows) |
| CS-12 | Active voice dominance | Estimate active vs. passive share (domain-aware: scientific/legal content tolerates more passive) | Passive > 40% of sentences in non-technical niches | Passive constructions obscure the actor in instructional content ("The switch should be flipped" in a step list) |
| CS-13 | Reading level fit | Estimate complexity against the audience from Step 1 | Jargon used without first-use explanation for a beginner-default audience; or over-simplified for a clearly technical audience | Consistent mismatch (dense unexplained jargon throughout a general-audience piece, or vice versa) |

### Group D — Writing quality

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-14 | Repetitive sentence openers | Collect the first 3 words of each paragraph and each H2's first sentence | Same opener used in 3 consecutive paragraphs, or 5+ times article-wide | Same opener starts ≥ 50% of paragraphs, or ≥ 4 consecutive |
| CS-15 | Repetitive paragraph patterns | Compare rhetorical shapes: e.g., (claim → "Whether you're X or Y" → "It's important to note" → restate claim). Detect n-gram and template repetition across paragraphs | Same 4+ word phrase (non-technical) repeated 4+ times article-wide, or one rhetorical template used in 3+ consecutive paragraphs | One template shape used by > 50% of body paragraphs, or (regeneration mode) the regenerated text reproduces the original's paragraph shapes |
| CS-16 | Excessive transitions | Count explicit transition openers ("Moreover", "Furthermore", "Additionally", "That said", "In addition") | Transition openers start > 20% of paragraphs | Transition openers start > 40% of paragraphs, or every section begins with one |
| CS-17 | Empty claims | Flag superlatives and assertions with no support in the article or source material ("the best", "industry-leading", "proven to", "everyone knows") | 1–3 unsupported superlatives | Pervasive unsupported claims, or an empty claim does argumentative work (a buying decision rests on it) |
| CS-18 | Specificity | Does the article use concrete numbers, names, examples, quantities, durations, or outcomes where the topic allows? | Specifics sparse: topic clearly supports them (measurements, prices, durations, counts) but the article stays vague throughout | Article contains no single specific detail on a topic that is inherently quantitative |
| CS-19 | AI-cliché density (body-wide) | Same catalog as CS-02, applied across the whole body, density-weighted | Catalog phrases appear at > 1 per 300 words, concentrated in openers | Catalog phrases are the article's connective tissue (present in most sections, doing transition work instead of content) |

### Group E — Filler and padding

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-20 | Filler sentences | Delete-test: mark sentences whose removal loses no information, promise, or tone. Typical filler: restating the previous sentence, announcing what was just shown, praising the topic ("X is an essential part of modern life") | 1–2 filler sentences per 500 words | Filler > 10% of sentences, or filler paragraphs (whole paragraphs that survive deletion) |
| CS-21 | Word-count padding | Detect redundancy added to inflate length: repeated points with synonyms, over-explained obvious steps, multi-sentence restatements of a single idea, inflated intros/outros | Padding present but < 10% of the body | Padding ≥ 15% of the body, or the article visibly repeats its core points 3+ times |
| CS-22 | Word-count target handling | Compare word count vs. `target_word_count` when configured. The check punishes padding, never brevity: a shortfall is recorded as a report note (see report `notes`), not a failure | Over target by > 25% without new substance | Target hit through padding (CS-21 FAIL together with count-in-range is this check's FAIL) |

### Group F — Factual integrity

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-23 | No fabricated data | Scan for statistics, studies, surveys, quotes, expert names, certifications, awards, test results, product specs. For each: is it in the source material, common knowledge, or clearly attributed to a real verifiable source? Any invented-looking citation (named study with no source, precise stat with no origin) fails | An estimate or approximation is stated without hedging language (fix: "roughly", "typically", or remove precision) | Any fabricated statistic, study, quote, named expert, certification, review, or test result. **Unconditional FAIL — no severity trade-offs** |
| CS-24 | No fabricated experience/expertise | Scan for first-person claims: "in our testing", "after 30 days of use", "we've helped hundreds of clients", "as a professional chef". The AI has none of these experiences unless the CMS supplied them as real author attributes | First-person framing used stylistically without specific experience claims (borderline: fix by rephrasing to guidance voice) | Any specific claim of firsthand experience, testing, credentials, or client history not supplied by the CMS. **Unconditional FAIL** |
| CS-25 | Estimates hedged appropriately | Numbers and claims that are estimates or vary (prices, lifespans, averages) should carry hedges ("typically", "around", "varies by …") or ranges | 1–2 unhedged variable quantities | Precise-sounding claims presented as fact throughout a topic where values genuinely vary |

### Group G — Conclusion

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-26 | Natural conclusion | Scan the final section opener for catalog closers ("In conclusion", "In summary", "To sum up", "Ultimately, …") | Catalog closer present but the rest of the conclusion does real work | Conclusion is only a catalog closer + restated intro (a summary that adds nothing) |
| CS-27 | Conclusion value | The ending should leave the reader with something usable: the direct answer restated tightly, next actions, decision criteria, or storage/next-step guidance per niche | Conclusion restates the body loosely with no next step | Article ends mid-thought, or the conclusion contradicts the body |

### Group H — Tone and flow

| ID | Check | Detection method | WARNING when | FAIL when |
|---|---|---|---|---|
| CS-28 | Tone fit | Compare voice against the niche default + configured `tone` (`NICHE-PATTERNS.md`) | Patches of wrong register (slang in finance, stiff corporate voice in pets/food) | Tone actively undermines trust across the article (hype/sales voice in YMYL topics, flippant voice in safety content) |
| CS-29 | Logical transitions | Each section should connect to the previous by topic logic, not just order | 1–2 abrupt jumps requiring the reader to re-orient | Sections read as independently generated blocks with no narrative through-line |
| CS-30 | Overall editorial flow | Holistic read: does the article feel like one competent writer, or a collage? | Minor seams: voice shifts between sections, inconsistent terminology | Frankenstein article: contradicting sections, duplicated content under different headings, mixed persons (I/we/you randomly) |

## Aggregation logic

```
verdict = FAIL     if ANY check result is FAIL
        = WARNING  if no FAIL and ANY check result is WARNING
        = PASS     otherwise (INFO-level notes allowed)
```

**Integrity overrides:** CS-23 and CS-24 FAIL regardless of context, count, or quality elsewhere. There is no version of "the statistics are made up, but the article is otherwise strong."

**Fabrication precedence:** if CS-23/CS-24 fail, also re-run CS-17 mentally — empty claims that leaned on the fabricated data count as evidence in the report.

**Not-applicable checks:** omitted from `checks[]` with a note (e.g., "CS-25 n/a — no quantities in article"). Never silently dropped.

## Report format

The report is a JSON object stored with the article (see SKILL.md §9.2 for the minimal shape). Full obligations:

```json
{
  "skill": "content-style",
  "skill_version": "1.0.0",
  "validated_at": "2025-01-15T10:30:00Z",
  "article_ref": { "title": "", "slug": "", "workflow": "manual|ideas|regeneration|editing|automation|bulk" },
  "classification": { "content_type": "recipe", "niche": "food", "audience": "", "tone": "" },
  "verdict": "PASS",
  "checks": [
    { "id": "CS-01", "name": "Introduction strength", "result": "PASS", "evidence": "Opens with storage durations and the three methods" }
  ],
  "issues": [
    {
      "id": "CS-09",
      "result": "WARNING",
      "location": "H2 'Freezing' ¶1",
      "problem": "178-word paragraph, 8 sentences",
      "fix": "Split into storage steps and expected results"
    }
  ],
  "stats": {
    "word_count": 1120,
    "target_word_count": 1000,
    "h2_count": 6,
    "h3_count": 2,
    "avg_sentence_words": 16.4,
    "avg_paragraph_sentences": 3.2,
    "longest_sentence_words": 41
  },
  "notes": [
    "Delivered 820 words against a 1000 target without padding — shortfall recorded, not filled (CS-22 policy)"
  ]
}
```

Rules: every triggered WARNING/FAIL appears in `issues[]` with a concrete `location` and an actionable `fix`. Evidence strings must quote or describe the actual text — "intro is weak" is not evidence. Stats are computed, never eyeballed.

## Failure handling

- **FAIL:** the pipeline blocks publication. Fix only the flagged issues (targeted revision, not a rewrite, unless CS-30 also failed), then re-run the full gate. The re-run must include previously passing checks — fixes can break other things.
- **WARNING:** publication allowed with the report attached. Integrate warnings into the CMS review queue if one exists.
- **Borderline judgment calls:** when a check is genuinely ambiguous, prefer WARNING over FAIL (except Groups F, where fabrication suspicion escalates to FAIL and the claim is removed or attributed — when in doubt, cut the claim).
- **Edit mode:** run the full gate on the whole article even if one paragraph changed. Local edits routinely break global checks (CS-14, CS-29, CS-30).

## Fixture harness (for implementers)

`fixtures/` contains six articles with expected verdicts in `fixtures/expected-results.json`:

| Fixture | Expected verdict | Primary checks exercised |
|---|---|---|
| `pass-recipe.md` | PASS | All groups behave on a healthy article |
| `warn-thin-howto.md` | WARNING | CS-01, CS-07 (recommended section missing), CS-09 |
| `fail-generic-ai-intro.md` | FAIL | CS-02, CS-19, CS-26 |
| `fail-repetition.md` | FAIL | CS-14, CS-15 |
| `fail-fabricated-statistics.md` | FAIL | CS-23, CS-24 (integrity override) |
| `fail-padding.md` | FAIL | CS-20, CS-21, CS-22 |

An implementation is conformant when it reproduces every expected verdict and cites the expected check IDs as evidence. Disagreement means the implementation (not the fixture) needs fixing.
