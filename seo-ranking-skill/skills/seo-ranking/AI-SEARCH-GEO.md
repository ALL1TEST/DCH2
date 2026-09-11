# AI Search & GEO — Answer-Engine Readiness

> Module 14 of the seo-ranking skill · Phase: WRITE · Load when: drafting or revising an article for answer engines, or remediating SEO-V36–V40 findings

## Purpose

Make content legible and citable for AI search systems — generative answer engines, Google's AI features (AI Overviews and their citations), and any machine that reads the page to answer a question rather than to rank a query. GEO (Generative Engine Optimization) is not a separate trick stack: it is the same people-first clarity that serves featured snippets, stated explicitly enough that a machine can extract, trust, and cite it.

The failure modes this module exists to prevent: answers buried under preambles, vague quantities, synonym-hopping entity names, and AI-bait filler questions.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `article` draft | Yes | Module cannot run |
| `intent_analysis` (main question + question space) | Yes | Q&A coverage (SEO-GEO-05) degrades to heading-derived questions; note it |
| `keyword_map` (entities) | Yes for entity checks | Entity check limited to in-draft consistency |

## Procedure

1. Verify answer-first structure: the main question's direct answer appears in the first ~150 words or the first section (SEO-GEO-01).
2. Rewrite vague statements into explicit statements — numbers, units, dates, conditions (SEO-GEO-02).
3. Check entity clarity: unambiguous naming, first-mention definitions for obscure entities, one naming form throughout (SEO-GEO-03).
4. Verify machine-extractable structure: question headings where natural, lists, tables (SEO-GEO-04, SEO-GEO-06).
5. Verify Q&A coverage of the natural question space (SEO-GEO-05).
6. Verify unique citable information and trustworthy sourcing (SEO-GEO-07, SEO-GEO-08).
7. Remove anti-patterns: keyword stuffing for AI, buried answers, opaque prose, AI-bait questions (SEO-GEO-09).

## Rules

### What AI search systems need from content

- **SEO-GEO-01 · Answer-first sections.** State the direct answer before elaborating. The answer unit is self-contained; its formatting mechanics live in `FEATURED-SNIPPETS.md` and are not repeated here. WHY: answer engines extract blocks — a correct answer inside a winding preamble is invisible to them and slow for humans.
- **SEO-GEO-02 · Explicit-statement rewrites.** Facts must be stated with explicit numbers, units, dates, and conditions. Rewrite guidance:
  - Bad: "Basil generally lasts a little while."
  - Good: "Fresh basil lasts 5–7 days at room temperature and 7–10 days stored in a damp paper towel in the refrigerator."

  WHY: an engine cannot cite "a while", and a reader cannot act on it. Explicitness is what makes a fact extractable.
- **SEO-GEO-03 · Entity clarity and consistent naming.** Name the subject unambiguously; define obscure entities at first mention ("basil (Ocimum basilicum)"); use ONE naming form throughout — no synonym-hopping between "crawlspace", "crawl space", and "under-floor void" for the same entity. WHY: machines resolve entities by consistent naming; drifting names read as three different subjects and dilute every claim about the real one.
- **SEO-GEO-04 · Structured, machine-extractable facts.** Prefer headings phrased as questions where natural, lists for enumerable items, and tables for multi-dimensional facts — shapes a machine can lift without re-parsing prose. (The formatting mechanics are owned by `FEATURED-SNIPPETS.md`; apply them once, for both systems.)
- **SEO-GEO-05 · Q&A coverage of the question space.** Cover the natural questions users ask around the topic — the main question plus the practical follow-ups. Coverage means genuinely answered, not heading-stubbed: a question heading with a two-line non-answer is worse than no heading.
- **SEO-GEO-06 · Comparison tables.** When the content helps readers choose between options, a comparison table with explicit attributes is the most extractable form — and the most skimmable for humans.
- **SEO-GEO-07 · Original information and useful synthesis.** AI systems more readily cite content that adds something distinct — original observations, computed comparisons, a synthesis the underlying sources do not state. The standard is the re-search test of `INFORMATION-GAIN.md`; do not duplicate its checklist here.
- **SEO-GEO-08 · Trustworthy sourcing.** Cited claims per `EXTERNAL-LINKING.md`; honest hedging where evidence is genuinely mixed ("results vary by humidity; the ranges above assume typical kitchen conditions"). Hedge honestly — never invent certainty and never invent experience (`EEAT-TRUST.md`).

### Anti-patterns — do not do these

- **SEO-GEO-09 · The anti-pattern list.**
  1. No keyword stuffing "for AI search" — AI engines are less susceptible to keyword games, and stuffing wrecks human readability (and remains CRITICAL via SEO-V19).
  2. Do not bury answers under long preambles — the answer comes first or it does not come.
  3. Do not use opaque prose where a plain statement exists.
  4. Do not add AI-bait filler questions no one asks — fake Q&A inflates length without coverage and reads as manipulation to evaluators human and machine alike.

### Scope

- **SEO-GEO-10 · Scope note.** GEO in this skill aligns with Google's AI features (AI Overviews and citations — canonical link in `GOOGLE-GUIDANCE.md`). The same people-first clarity that serves featured snippets serves AI answers; this module adds the explicit-statement and entity-consistency discipline on top. AI systems more readily cite content that states facts cleanly and adds original value — that is the entire strategy, and it requires no separate content.

## Technique → check mapping

| Technique (rule) | Gate check | Issue type when missing |
|---|---|---|
| Answer-first sections (SEO-GEO-01) | SEO-V36 | `no_direct_answer` |
| Explicit-statement rewrites (SEO-GEO-02) | SEO-V38 | `factual_ambiguity` |
| Entity clarity and consistency (SEO-GEO-03) | SEO-V37 | `unclear_entities` |
| Structured, machine-extractable facts (SEO-GEO-04, SEO-GEO-06) | SEO-V39 | `weak_structure_for_ai` |
| Q&A coverage (SEO-GEO-05) | SEO-V36 / SEO-V39 | `no_direct_answer` / `weak_structure_for_ai` |
| Original information and synthesis (SEO-GEO-07) | SEO-V40 | `no_unique_information` |
| Trustworthy sourcing (SEO-GEO-08) | SEO-V08 / SEO-V24 (adjacent) | `unsupported_claim` / `missing_external_sources` |

## Worked mini-example (entity naming)

Shared scenario article on basil:

- First mention: "basil (Ocimum basilicum)" — the entity is named unambiguously and defined once, at its first appearance.
- Every later mention: "basil" — one naming form throughout; never "the herb", "this popular plant", or alternating common-name variants when the same subject is meant.
- Counter-example: an HVAC article switching between "crawlspace", "crawl space", and "under-floor void" for one physical space reads as three subjects to a machine and as carelessness to a human (SEO-GEO-03).

## Output

GEO assessment block (draft revision notes or the gate's AI Search section):

```json
{
  "ai_search_geo": {
    "answer_first": true,
    "explicit_statements": {
      "checked": true,
      "rewrites": ["vague duration claim rewritten to explicit 5-7 / 7-10 day ranges with conditions"]
    },
    "entity_naming": { "primary_entity": "basil (Ocimum basilicum)", "consistent": true },
    "structure": { "question_headings": 3, "tables": 1, "lists": 2 },
    "anti_patterns": []
  }
}
```

## Quality Checks

| Check | Verifies here | Result |
|---|---|---|
| SEO-V36 | Direct answer near the top | `no_direct_answer` WARNING |
| SEO-V37 | Entity clarity and naming consistency | `unclear_entities` WARNING |
| SEO-V38 | Explicit numbers, units, dates, conditions | `factual_ambiguity` WARNING |
| SEO-V39 | Machine-legible structure | `weak_structure_for_ai` WARNING |
| SEO-V40 | Unique citable information | `no_unique_information` WARNING |

Scoring: findings feed the **AI Search Readiness** category (weight 6) via V36–V39; V40 additionally feeds **Information Gain** (weight 12) — mapping frozen in `SCORING.md`.

## Failure Handling

- A fact cannot be made explicit (the data is genuinely unknown): hedge honestly and mark it; do not invent a number to satisfy SEO-GEO-02 — fabrication outranks explicitness.
- Question space unknown (no SERP or intent data): cover what the draft's own subtopics imply; note reduced confidence.
- A structure conversion would harm readability: readability wins; record the declined conversion.
- Topic resists tables and lists: prose with explicit statements is sufficient — SEO-V39 checks extractability, not table quotas.
- Entity has legitimate aliases (brand vs. product name): pick the primary form, define the alias once at first mention, then stay consistent.

## Cross-References

- `FEATURED-SNIPPETS.md` — shared formatting mechanics (answer-first, lists, tables, steps); no duplicated effort.
- `INFORMATION-GAIN.md` — the originality standard behind SEO-GEO-07 and SEO-V40.
- `EXTERNAL-LINKING.md` — citation discipline behind SEO-GEO-08.
- `EEAT-TRUST.md` — honest hedging versus invented experience.
- `GOOGLE-GUIDANCE.md` — AI features scope and the people-first principles.
- `VALIDATION.md` — SEO-V36–V40 definitions and severities.
- `SCORING.md` — AI Search Readiness (weight 6) and Information Gain (weight 12) categories.
