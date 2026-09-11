# Google Guidance — The Primary Authority

> Authority module (unnumbered) of the seo-ranking skill · Phase: All · Load when: a rule application needs its governing principle, a conflict must be resolved, or Google documentation must be cited

## Purpose

Carry the distilled principles of Google Search Central's documentation as the PRIMARY authority for this skill, together with the canonical links to consult. This module is principles, not copied text: Google's docs are the live source; this file is the skill's working alignment to them. When anything in this skill conflicts with Google's live documentation, Google wins (precedence statement below).

Principles rather than quotes for three reasons: documentation text changes with the live docs and this file must not drift into stale quotations; principles compose into decisions where quotations collide; and an implementing agent that understands the WHY applies the rule correctly in cases nobody enumerated.

## Inputs

None — this module is reference material loaded on demand. The live documentation it points to is the real input; consult it when a conflict or ambiguity needs resolving.

## Procedure

1. When applying any skill rule, check its effect against the principles below; if the rule's application would contradict a principle, the principle governs the interpretation.
2. When a conflict arises between this skill and Google's live documentation, open the canonical link governing that topic and follow the documentation.
3. When guidance remains ambiguous after consultation, choose the interpretation that favors readers and honesty.
4. Cite the canonical link — not this file — in any output that references Google's guidance.

## Rules — the distilled principles

- **GG-01 · People-first content.** Create content for people, not primarily for search engines. The self-assessment test: would this content exist — and be worth reading — if search engines didn't?
- **GG-02 · Helpful and reliable.** Content should demonstrate the qualities of helpful, reliable, people-first content: honest effort, real value, verifiable claims.
- **GG-03 · Original value.** Original information, reporting, research, or analysis are the ways to add value; restating what is already indexed adds none. (`INFORMATION-GAIN.md` operationalizes this.)
- **GG-04 · Substantial, complete coverage.** Cover the topic at hand substantially and completely — depth follows the question, not a quota.
- **GG-05 · No fixed ideal word count.** Word count is not a ranking factor. There is no ideal length; write the depth the question requires. Thin content and padded content are both failures, for different reasons.
- **GG-06 · Descriptive, accurate titles and headings.** Titles and headings describe the content honestly; they are not keyword delivery vehicles.
- **GG-07 · No keyword stuffing.** Keyword stuffing is an abuse — and a CRITICAL in this skill (SEO-V19).
- **GG-08 · No large-scale mass-produced low-value content.** Mass-producing unoriginal, low-value content is contrary to the guidance — which is why bulk workflows in this skill carry mandatory per-item gates.
- **GG-09 · Don't fake expertise, experience, or freshness.** Fabricated credentials, invented firsthand experience, and date-bumping without substance are integrity violations (CRITICAL: `fake_experience`; see `CONTENT-REFRESH.md`'s never-fake-freshness rule).
- **GG-10 · No misleading structured data.** Structured data must match visible content; misleading markup is a spam-policy violation (`SCHEMA.md`; CRITICAL: `fabricated_schema_property`).
- **GG-11 · No invented facts.** Facts, statistics, prices, reviews, and citations are real or they are absent (`fabricated_data` is CRITICAL — integrity override).
- **GG-12 · Titles and metas may be rewritten.** Google rewrites titles (including pixel-truncation) and replaces meta snippets when they serve the query better. Write them well anyway: they are the strongest lever on the result page, and good ones get rewritten less.
- **GG-13 · AI-generated content is judged by purpose and quality.** AI-generated content is fine when it serves people and is reviewed for quality; mass-produced manipulation is not. The gated pipeline this skill serves is exactly the reviewed case — the gate is the review.

## Principle → enforcement mapping

How this skill operationalizes each principle:

| Principle | Operationalized by |
|---|---|
| GG-01 people-first | Every module; the verdict logic (`VALIDATION.md`) — a checklist-passing page that fails the reader fails the gate |
| GG-02 helpful/reliable | Content checks SEO-V01..V12; `EEAT-TRUST.md` |
| GG-03 original value | `INFORMATION-GAIN.md`; SEO-V05 / V07 / V40 |
| GG-04 complete coverage | `TOPIC-COVERAGE.md`; SEO-V03 / V04 |
| GG-05 no word-count target | `TOPIC-COVERAGE.md` depth calibration (depth follows the question); no length-based scoring anywhere in `SCORING.md` |
| GG-06 titles/headings | `ON-PAGE-SEO.md`; SEO-V13 / V21 |
| GG-07 no stuffing | `KEYWORD-STRATEGY.md`; SEO-V19 (CRITICAL) |
| GG-08 no mass low-value content | `SKILL.md` bulk policy (per-item gates, quarantine, cannibalization on every bulk item) |
| GG-09 no faked signals | `EEAT-TRUST.md` (SEO-V10, CRITICAL); `CONTENT-REFRESH.md` never-fake-freshness |
| GG-10 honest structured data | `SCHEMA.md`; SEO-V27 / V28 (CRITICAL on fabrication) |
| GG-11 no invented facts | Data Availability Policy (`SKILL.md` §7); `EXTERNAL-LINKING.md`; SEO-V09 (CRITICAL) |
| GG-12 rewrites happen anyway | `ON-PAGE-SEO.md` writes titles/metas for accuracy and descriptiveness, not to game truncation |
| GG-13 AI content judged by quality | The full pipeline: PLAN → WRITE → VALIDATE per item; no ungated mass output |

## How to use this module

| Situation | Consult | Rule of thumb |
|---|---|---|
| A check's severity feels too strict or too lax | The principle it traces to (mapping table) | the reader-favoring, honesty-favoring interpretation wins |
| A module rule conflicts with live documentation | The canonical link for that topic | documentation wins; note the conflict for a skill-version bump |
| An ambiguous case neither addresses | GG-01 | would this content exist — and be worth reading — if search engines didn't? |
| A proposed tactic sounds clever but feels off | GG-01..GG-13 | if it manipulates presentation instead of improving the answer, refuse it |
| Two modules give conflicting advice | the stricter integrity rule, then the canonical link | `SKILL.md` §13 conflict ladder; Google guidance breaks ties |
| A user asks whether a tactic is "allowed" | The specific canonical document for that surface | "not explicitly forbidden" is not a license; GG-01 decides |

## Self-assessment questions (principle level)

The helpful-content mindset, phrased as questions this pipeline answers with evidence rather than opinion:

- Would this page have been worth publishing if search engines did not exist?
- Does the page demonstrate first-hand knowledge or honest synthesis — or restate what rank 1 already says?
- After reading, does the searcher still need to run another query?
- Are the title, headings, schema, and dates accurate descriptions of what the page actually is?
- Would a reader who trusted this page enough to act on it be right to do so?

## The word-count fallacy

No module in this skill sets a target word count, and none may. Depth follows the question: a query about basil storage durations needs a compact, explicit answer; a query about choosing an air fryer needs a substantial comparison. Length targets produce padding (filler paragraphs) or starvation (thin answers) — both are failures the gate catches as readability and coverage warnings. Word count is an output of good coverage, never an input to it.

## Canonical links

Consult these directly — they are the authority this skill aligns to:

- `https://developers.google.com/search/docs/fundamentals/creating-helpful-content` — governs what "helpful, reliable, people-first" content means; the core quality philosophy behind GG-01..GG-05.
- `https://developers.google.com/search/docs/fundamentals/seo-starter-guide` — governs SEO fundamentals: how search works, crawlability, indexability, and on-page basics.
- `https://developers.google.com/search/docs/appearance/title-link` — governs how titles appear in results and how Google may rewrite or truncate them.
- `https://developers.google.com/search/docs/appearance/snippet` — governs meta descriptions and how Google may replace them with result snippets.
- `https://developers.google.com/search/docs/fundamentals/ai-features` — governs how Google's AI features (AI Overviews, citations) surface and link content.

These five cover the surfaces this skill touches: quality, fundamentals, titles, snippets, and AI features. Deeper topics (the structured data reference, link spam policies) hang off these entry points — when a deeper page was the one actually consulted, cite that page.

## Precedence statement

Google's live documentation wins all conflicts with this skill. When guidance is ambiguous, choose the interpretation that favors readers and honesty. Third-party references (`REFERENCES.md`) never outrank Google documentation — or this skill — on any question.

## Output

None — this module emits no reports. It resolves interpretation questions and supplies canonical citations for other modules' outputs.

## Quality Checks

None apply directly (no SEO-Vxx checks are defined here). Indirectly, every check's WHY-rationale traces back to these principles; if a check's observed behavior contradicts a principle, that is a defect in the check, not a license granted by the principle.

## Failure Handling

- **A canonical page has moved or 404s:** locate the document's current home under `developers.google.com/search/docs` and update the citation at the next skill release — the live docs, not this file, are the authority.
- **Guidance appears to conflict with a frozen registry decision** (e.g., a severity): the stricter integrity interpretation wins pending a skill-version bump (`SKILL.md` §16 — registry changes require a version bump).
- **Ambiguity persisting after consultation:** document both readings in the output's notes, apply the reader-favoring one, and flag the question for human review.
- **Documentation and observed reality conflict** (guidance says X, field data says Y): report the observation with its evidence and cite the guidance — the skill never quietly overrides either.
- **A principle and a business goal collide:** record the principle and the decision made in the output's notes — the skill advises, the CMS owner decides, and the record keeps the advice honest.

## Cross-References

- `SKILL.md` — authority order (§3), Data Availability Policy (§7), versioning policy (§16).
- `REFERENCES.md` — third-party sources and the conflict rule that keeps them subordinate.
- `VALIDATION.md` / `SCORING.md` — where the principles become checks, severities, and deductions.
- All PLAN / WRITE / maintenance modules — each cites the principle it operationalizes.
