# Factual Integrity

> Module of the content-style skill · Load when: Step 4 of the workflow (always — every article, every workflow)

## Purpose

This module is the anti-fabrication layer: what may never be invented, how claims are classified and presented, how estimates are hedged, and what happens when information is missing. It backs checks CS-23, CS-24, and CS-25 — and **fabrication is an unconditional gate FAIL**: there is no version of "the statistics are invented, but the article is otherwise strong" (VALIDATION.md, integrity overrides).

The principle behind every rule: a reader who finds one invented number stops trusting every true one. Generated text that cannot stay inside its evidence should say so, not improvise.

## Inputs

- `source_material` (optional) — notes, research, product data, keyword briefs, or author-experience notes supplied by the CMS or the seo-ranking skill
- Classification (`niche` drives YMYL posture per NP-04)
- The draft's factual claims (list them during Step 4 drafting)

## Rules

### FI-01 — The fabrication blacklist

NEVER fabricate any of the following, in any article, for any reason:

- **Experts and credentials** — invented researchers, doctors, "certified arborists"
- **Quotes** — attributed speech no real person said, including "quotes" attached to invented names
- **Statistics** — percentages, survey results, "87% of users" figures with no origin
- **Studies and surveys** — named studies ("a 2024 Stanford study"), trials, meta-analyses that do not exist
- **Product specifications** — benchmark numbers, battery-life hours, dimensions, weight capacities not in source material
- **Personal experience** — "in our testing", "after years of", "my favorite" (see FI-07)
- **Certifications and awards** — "award-winning", "ISO certified", "dermatologist-tested"
- **Reviews and ratings** — user sentiment, star averages, "loved by thousands"
- **Test results** — lab outcomes, crash tests, clinical results, taste-test verdicts

Rationale: these are the claim types readers most often verify — and the types a plausible-sounding generator can fake most convincingly. A blacklist beats judgment here because the failure mode is invisible at draft time and catastrophic at read time. Detection and verdicts: CS-23.

### FI-02 — Stay inside the source-material boundary

When the CMS provides `source_material`, factual claims MUST stay within it: use what it contains, and do not extend beyond it with invented specifics. If the source says "shelf life about 5 days", the article says about 5 days — not "5 to 7 days" unless the source does, and not a chemical explanation the source never made. Missing detail is handled by FI-05, not by invention.

Rationale: source material is the article's evidence base. Extending it silently converts supplied truth into generated fiction while wearing the same citations — the least detectable and most damaging fabrication path. (Editorial framing, structure, and explanation of general-knowledge mechanisms are not "facts" and remain the writer's job — the boundary covers claims, not prose.)

### FI-03 — Classify every claim before phrasing it

Each factual claim falls into exactly one class, which decides its presentation:

| Class | Definition | Presentation rule |
|---|---|---|
| Verifiable fact | Checkable, well-established (water boils at 100°C at sea level; poultry safe temp 165°F/74°C) | State directly |
| General knowledge | Widely known, uncontroversial (basil is sensitive to cold; overwatering causes root rot) | State directly in plain terms |
| Estimate | A value that varies or is approximated (prices, durations, yields, recovery times) | Hedge per FI-04, or present as clearly illustrative |
| Opinion / judgment | The article's editorial stance (this method is easier for beginners) | Frame as judgment with reasoning, never as measured truth |

Rationale: mis-classification is the root cause of both failure modes — facts stated with false precision (CS-25) and opinions dressed as evidence (CS-17). Classify first, then phrase.

### FI-04 — Hedge estimates and variable values

Any value that genuinely varies (price, rate, lifespan, bloom time, model-year specs, recovery duration) carries a hedge or a range. Standard hedges: "typically", "around", "roughly", "varies by", "commonly cited as", "expect … or so", "in the range of".

- Bad: "A standing desk costs $450."
- Good: "Standing desks typically run from around $150 for basic manual models to $600 or more for heavy-duty electric ones — expect the category to overlap heavily on price."

Rationale: unhedged variable numbers become false on a predictable schedule, and readers who check one stale number discount the whole article. Detection: CS-25 (1–2 unhedged values warn; precise-sounding claims throughout a genuinely variable topic fail).

### FI-05 — The unavailability policy: state it or omit it

If information is unavailable, say so plainly or omit the claim entirely. Both phrasings are valid; choose per how much the reader needs to know the gap exists:

- **Plain statement:** "Publication dates for this model vary by region, and the manufacturer does not list a single launch date — check the retail listing in your market."
- **Omission:** simply never mention the launch date, and let the article's scope stand on what is known.

Never fill the gap with a plausible invention, and never imply availability ("experts agree that…") of evidence that does not exist. Rationale: a stated limit costs one sentence of candor; an invented filler costs the article's credibility and a gate FAIL. Which phrasing to choose: state the gap when the reader would otherwise assume the answer exists; omit when the gap adds nothing to their task.

### FI-06 — No fake authority

Never dress claims in borrowed authority: invented institutional backing ("studies show", "scientists recommend"), fake citations, "expert-approved" labels, or real-sounding organizations that were never consulted. Where authority genuinely exists in source material, attribute it precisely (FI-11). Rationale: authority framing is how empty claims disguise themselves as evidence (CS-17) — and how a skeptical reader, on checking, converts one bad paragraph into a whole-site verdict.

### FI-07 — No fake experience; attribute real experience to its owner

The AI is not a person and has no experiences. Never write "in our testing", "after testing 40 apps over six months", "after years of…", "as a professional…", "we've helped hundreds of…", "my favorite" — none of it happened.

**Exception:** if the CMS supplied real author experience as input (a chef's notes, a photographer's field log), that content MAY appear — attributed to the author by name or role, not in first-person AI voice ("Chef [name], who supplied this recipe's notes, recommends…"), and only within the bounds of what was actually supplied. Rationale: fake experience is the most intimate form of fabrication — it forges the relationship between writer and reader. Detection and verdicts: CS-24, unconditional FAIL outside the exception.

### FI-08 — Numbers policy

A number may appear only when it is one of:

1. A **well-known constant** or standard (boiling points, safe cooking temperatures, common conversions)
2. **Provided data** — supplied in source material
3. A **clearly-hedged approximation** per FI-04, presented as approximate

Anything else: no number, or restructure the claim so it doesn't need one. Precision is not a style choice — "87.3%" implies a measurement that was never made. Rationale: fake precision is indistinguishable from real precision at read time and impossible to distinguish at trust-rebuild time. Feeds CS-23 and CS-25.

### FI-09 — Dates and prices policy

Dates and prices are the most volatile claim types:

- **Prices** are always hedged and marked as variable (FI-04); never present a current-sounding price as a stable fact. Prefer ranges and relationships ("manual models typically cost less than electric") over point values.
- **Dates** of versions, releases, model years, and regulations get "as of this writing" or version-stamped framing when the claim decays ("current major versions", "this writing, early 2025").
- **Hard dates** (historical events, publication dates in source material) are stated as facts — only decaying claims need stamps.

Rationale: the article is published once and read for years; unstamped volatility is a scheduled falsehood. Feeds CS-25 and NP-06.

### FI-10 — YMYL topics get extra conservatism

Health, finance, legal, and safety topics (and health-adjacent material in Pets, Parenting, Food, Home/DIY — see NP-04) take the conservative path on every close call:

- Defer to professionals where a professional is required: diagnosis, treatment, individual financial decisions, legal interpretation.
- Avoid specific advice where a professional is required — explain mechanisms and decision criteria instead of prescribing actions for the reader's situation.
- Prefer omission over approximation for anything safety-relevant (FI-05).

Rationale: in YMYL topics a confident wrong sentence costs the reader money or health, and the reader is least equipped to catch it. When in doubt, cut the claim (VALIDATION.md: fabrication suspicion escalates, never downgrades).

### FI-11 — Attribute supplied sources precisely

When source material or well-known public guidance supports a claim, attribute it at the right grain: name the document or standard, not a vague institution ("the owner's manual for this model", "public-health safe-sleep guidance"), and never attribute to the article's own voice what came from elsewhere. Rationale: sloppy attribution erodes into fake authority (FI-06) as articles get edited; precise attribution survives regeneration.

### FI-12 — Fabrication is an unconditional gate FAIL

State this in every generated report mindset: if CS-23 or CS-24 returns FAIL, the article fails — regardless of structure, style, word count, or anything else in it. Fix by removing or properly sourcing the fabricated claim, then re-run the full gate. When a fabricated statistic was load-bearing, expect CS-17 to fire on the claims that leaned on it (VALIDATION.md, fabrication precedence).

Rationale: quality elsewhere cannot compensate for lies. This is the one rule in the skill with no severity trade-off, and the reason the gate separates generation from validation (SKILL.md §12).

## Examples

One paragraph, four claim classes handled correctly:

> "Fresh basil keeps about 7 to 10 days on the counter in a jar of water — the stems keep drinking, the way cut flowers do. The fridge is colder than basil tolerates for long, so the leaves blacken within a few days. Skip the produce bags for this herb; a paper towel wrap is the better call if counter space is tight."

Claim audit: 7–10 days = hedged estimate (FI-04); "stems keep drinking" = general knowledge (FI-03); blackening "within a few days" = hedged general observation; paper-towel recommendation = editorial judgment with reasoning (FI-03 class 4). Zero fabricated items — the paragraph passes CS-23/24/25 by construction.

The same paragraph failing:

> "Fresh basil keeps 7 to 10 days on the counter, according to a 2023 Cornell University produce-storage study. In our test kitchen's trials, jar storage outperformed refrigeration by 300%. It's important to note that experts agree this is the best method."

Failures: invented study (FI-01, FI-06), invented test results and experience (FI-01, FI-07), fake precision (FI-08), fake consensus (FI-06) — CS-23 and CS-24 both FAIL, unconditionally.

## Quality Checks

| Check | Feeds from |
|---|---|
| CS-23 No fabricated data | FI-01, FI-02, FI-06, FI-08, FI-11 |
| CS-24 No fabricated experience | FI-07, FI-12 |
| CS-25 Estimates hedged | FI-04, FI-08, FI-09 |

## Failure Handling

- **CS-23/CS-24 FAIL:** remove the fabricated claim or replace it with a properly hedged, sourced version; never "soften" invented data into vaguer invented data. Re-run the full gate.
- **Claim cannot be classified (FI-03) at draft time:** treat it as fabrication risk — cut it or mark it for the CMS editor in the report notes.
- **Source material conflicts with general knowledge:** prefer the source material, and note the conflict in the report; do not silently pick a side.
- **YMYL ambiguity:** escalate to omission (FI-05) or professional-deferral phrasing (FI-10). When in doubt, cut the claim.

## Cross-References

- `EDITORIAL-PRINCIPLES.md` — EP-13 (honesty about limits) is the principle layer of FI-05
- `WRITING-QUALITY.md` — WQ-12 (empty claims), WQ-15 (person discipline; the phrasing surface FI-07 polices)
- `NICHE-PATTERNS.md` — NP-04 (YMYL conservatism), vertical anti-fabrication rules (B-5, B-7, B-9, B-12)
- `VALIDATION.md` — CS-23, CS-24, CS-25, integrity overrides and fabrication precedence
