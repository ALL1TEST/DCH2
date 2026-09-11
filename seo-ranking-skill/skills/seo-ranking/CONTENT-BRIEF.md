# Content Brief

> Module 03 of the seo-ranking skill · Phase: PLAN · Load when: intent, keywords, and (when available) SERP analysis and cannibalization results exist — before any article generation

## Purpose

Produce the pre-generation contract: the content brief. The brief is the single document that tells the generation step (the content-style skill) what the article must contain, in what order, at what depth, with which links, media, schema, and snippet opportunities. Everything the PLAN phase learned gets compressed into the brief; everything the WRITE and VALIDATE phases judge the article against originates here.

WHY: generation without a brief optimizes for plausible-sounding text, not for search usefulness. The brief is how intent, coverage, and information gain survive the trip from planning to draft. It is also the honesty boundary: the brief carries only what real inputs support, so the article's factual claims have a defensible basis.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `topic` or `target_query` | Yes | Hard stop |
| `intent_analysis` (from `SEARCH-INTENT.md`) | Yes | Hard stop — the brief cannot state a main question without it |
| `keyword_map` (from `KEYWORD-STRATEGY.md`) | Yes | Hard stop — primary keyword, entities, question queries come from here |
| `serp_findings` (from `SERP-ANALYSIS.md`) | No | `content_gaps` stays empty; `data_availability.serp_data = false` with a note; brief proceeds at lower confidence |
| `cannibalization_report` (from `CANNIBALIZATION.md`) | When inventory exists | HIGH overlap must be resolved before brief generation |
| `cms_inventory` | No | `internal_link_opportunities` stays empty; `data_availability.cms_inventory = false` |

## Procedure

1. **Inputs.** Gather the intent analysis, keyword map, SERP findings (if any), and CMS inventory (if any). Reject the run if intent or keywords are missing.
2. **Intent.** Copy the intent analysis into `intent_summary` verbatim — it is embedded, not summarized away.
3. **Keywords.** Carry over the primary keyword, secondary keywords, and semantic entities from the keyword map.
4. **SERP gaps.** If real SERP data was analyzed, fill `content_gaps` and `serp_feature_opportunities` from those findings. If not, leave `content_gaps` empty and record the absence in `data_availability` (SEO-CB-04).
5. **Cannibalization check.** If the inventory exists and overlap is HIGH, stop: resolve via `CANNIBALIZATION.md` before generating a brief for this topic (SEO-CB-02).
6. **Outline.** Build the H2/H3 structure that serves the intent archetype, with the main question answered in the first section (SEO-CB-05, SEO-CB-06). Mark each outline item's purpose and whether it is required.
7. **Required subtopics.** List the subtopics the article must cover, with depth notes where treatment is deliberately short (cross-reference `TOPIC-COVERAGE.md` for depth calibration).
8. **Information-gain opportunities.** State what the article will offer beyond the obvious — specifics, comparisons, decision criteria (cross-reference `INFORMATION-GAIN.md`).
9. **Links.** Populate `internal_link_opportunities` only from real inventory pages, with natural anchors and reasons.
10. **Media.** Recommend the images the article genuinely needs, with placement and honest alt-text suggestions (cross-reference `IMAGE-SEO.md`).
11. **Schema.** Choose the schema type that matches the visible content and intent (cross-reference `SCHEMA.md`).
12. **Snippet opportunities.** List SERP feature opportunities the content genuinely supports (cross-reference `FEATURED-SNIPPETS.md`).
13. **Validate the brief itself** (SEO-CB-13): does the outline answer the main question in the first section? Does every required subtopic have a home? Is anything in the brief invented? Only a brief that passes its own self-check is handed off.

## Rules

**SEO-CB-01 — A brief before every article.** A brief MUST be generated before EVERY article the CMS produces — manual, ideas, automation, and bulk workflows alike. No brief, no generation. An article that skips the brief enters WRITE with no contract and VALIDATE with no basis for checks SEO-V03/V04.

**SEO-CB-02 — Bulk batches brief first.** In bulk/automation mode, generate briefs for the whole batch FIRST, dedupe them against the CMS inventory (cannibalization check on every topic), and only then generate articles. Bulk generation without brief-first dedupe is the classic cannibalization factory.

**SEO-CB-03 — Complete fields, honest empties.** The brief MUST carry every field in `schemas/content-brief.schema.json`. Fields whose source data is unavailable are left honestly empty (empty arrays, `false` flags in `data_availability`) with a note — never padded with fabricated content.

**SEO-CB-04 — No invented data in the brief.** Content gaps only from real SERP analysis; internal links only from real inventory pages; metrics only from real integrations or `UNAVAILABLE`. A fabricated brief entry becomes a fabricated article claim two steps later.

**SEO-CB-05 — Answer-first outline.** The outline MUST place a direct answer to the intent's `main_question` in the first section. A reader who stops after section one must leave with the answer. This feeds checks SEO-V02 and SEO-V36.

**SEO-CB-06 — Outline serves the intent archetype.** Informational → guide/how-to/reference shape; commercial → comparison with criteria and honest recommendations; structure is inherited from `SEARCH-INTENT.md` SEO-SI-07, not redecided here.

**SEO-CB-07 — Subtopics complete but not bloated.** Every required subtopic appears; no tangent earns a section. Completeness and depth calibration rules live in `TOPIC-COVERAGE.md` — the brief just records the required list, with depth notes for deliberately short treatments.

**SEO-CB-08 — H1 recommendation.** Recommend an H1 that aligns with the primary keyword and the main question, phrased for readers (it may differ in phrasing from the SEO title — see `ON-PAGE-SEO.md` SEO-OP-07).

**SEO-CB-09 — Links from real inventory only.** `internal_link_opportunities` entries MUST reference pages that actually exist in the CMS inventory, with natural anchor suggestions and a reason each link serves the reader. When the inventory is unavailable the array stays empty and the flag says so.

**SEO-CB-10 — Media describes real needs.** Each recommended media item describes the image the article genuinely needs for comprehension, where it goes, and an alt-text suggestion that describes the actual image — never a keyword container.

**SEO-CB-11 — Schema type matches visible content.** The chosen schema type MUST describe content the article will actually show (HowTo only for real steps, FAQPage only for a real FAQ block). Type selection rules live in `SCHEMA.md`.

**SEO-CB-12 — Snippet opportunities are earned.** Only list SERP feature opportunities the planned content genuinely supports; an opportunity the outline cannot deliver is noise, not strategy.

**SEO-CB-13 — Self-validate before handoff.** Before emitting, the brief MUST pass its own check: outline serves intent (SEO-CB-06); the first section answers the main question (SEO-CB-05); required subtopics are complete but not bloated (SEO-CB-07); no data in the brief is invented (SEO-CB-04); cannibalization is resolved (SEO-CB-02). A brief that fails its self-check is fixed, not shipped.

**SEO-CB-14 — The brief is the handoff contract.** The brief enters the content-style skill's generation step as `source_material`. That skill's contract: when `source_material` is present, the article's factual claims MUST stay within it, then the article passes the editorial gate, then the article plus brief return to this skill's VALIDATE phase. Do not let either skill's rules override the other's domain — editorial style there, search strategy here, H1 shared.

**SEO-CB-15 — Version and re-brief.** The brief carries `brief_version`. If the topic, angle, or primary keyword changes after generation starts, regenerate the brief — do not silently mutate a contract mid-generation.

## Output

A single content-brief JSON object conforming to `schemas/content-brief.schema.json`. The canonical worked instance — the complete brief for "how to store fresh basil" — lives at `examples/content-brief-example.json` and doubles as the schema's reference instance.

### Field reference

| Field | Content | Source |
|---|---|---|
| `topic` | The article's topic as promoted | CMS input |
| `intent_summary` | The full intent-analysis object, embedded verbatim | `SEARCH-INTENT.md` |
| `primary_keyword` | Exactly one main query | `KEYWORD-STRATEGY.md` |
| `secondary_keywords` | Supporting-angle phrasings (same intent) | `KEYWORD-STRATEGY.md` |
| `semantic_entities` | Entities to name through natural coverage | `KEYWORD-STRATEGY.md` |
| `user_questions` | Natural-language questions the article must answer | `KEYWORD-STRATEGY.md` + `SERP-ANALYSIS.md` when real |
| `h1_recommendation` | The recommended H1, phrased for the arriving reader | Derived here |
| `outline` | Planned H2/H3 structure: heading, level, purpose, required flag | Derived here (archetype from module 01) |
| `required_subtopics` | Subtopics with useful treatment, depth notes included | Intent + keyword map + SERP baseline |
| `content_gaps` | Topics the real SERP collectively misses; empty without real data | `SERP-ANALYSIS.md` only |
| `information_gain_opportunities` | What the article offers beyond the obvious | `SERP-ANALYSIS.md` or intent reasoning |
| `internal_link_opportunities` | Real inventory targets + natural anchors + reasons | `cms_inventory` only |
| `recommended_media` | Needed media with placement and honest alt suggestions | Derived here |
| `schema_type` | The structured data type matching visible content | `SCHEMA.md` mapping |
| `serp_feature_opportunities` | Snippet/PAA opportunities the content genuinely supports | `SERP-ANALYSIS.md` + `FEATURED-SNIPPETS.md` |
| `keyword_metrics` | Metrics status carried over from the keyword map (real numbers or `UNAVAILABLE`) | `KEYWORD-STRATEGY.md` |
| `data_availability` | Which real inputs the brief rests on, with notes | Honest record |
| `generated_at`, `brief_version` | Timestamp and version | Bookkeeping |

Brief field → downstream consumer map:

| Brief field | Consumed by |
|---|---|
| `intent_summary` | Validation checks SEO-V01, SEO-V02 (intent match, main question) |
| `primary_keyword`, `secondary_keywords` | `ON-PAGE-SEO.md` placement; checks SEO-V18, SEO-V19 |
| `semantic_entities` | Coverage and entity clarity; checks SEO-V20, SEO-V37 |
| `user_questions` | Answer targets inside the article; FAQ/`people_also_ask` opportunities |
| `h1_recommendation`, `outline` | Generation; checks SEO-V15, SEO-V21, SEO-V39 |
| `required_subtopics` | `TOPIC-COVERAGE.md`; checks SEO-V03, SEO-V04 |
| `content_gaps`, `information_gain_opportunities` | `INFORMATION-GAIN.md`; checks SEO-V05, SEO-V07, SEO-V40 |
| `internal_link_opportunities` | `INTERNAL-LINKING.md`; checks SEO-V22, SEO-V23 |
| `recommended_media` | `IMAGE-SEO.md`; checks SEO-V25, SEO-V26 |
| `schema_type` | `SCHEMA.md`; checks SEO-V27, SEO-V28 |
| `serp_feature_opportunities` | `FEATURED-SNIPPETS.md`; check SEO-V39 context |

## Quality Checks

The brief feeds the entire VALIDATE phase — it is the PLAN-phase object every content check measures the article against. Cross-reference `VALIDATION.md` for the full registry (SEO-V01…SEO-V40); the table above states which brief field each group of checks reads. A weak brief does not just produce a weak article — it makes the gate's comparisons meaningless, because there is nothing authored to compare against.

## Failure Handling

- **No intent analysis or keyword map:** do not improvise a brief. Run modules 01 and 02 first; if the topic cannot support them, the topic is not ready for an article.
- **Cannibalization HIGH:** stop before brief generation; resolve per `CANNIBALIZATION.md` (improve existing / merge / change intent / change angle / drop).
- **No SERP data:** proceed — `content_gaps` empty, `data_availability.serp_data = false`, confidence noted as lower in the intent summary's data notes. Never fabricate gaps to make the brief look richer.
- **No inventory:** proceed with empty `internal_link_opportunities` and the flag set; check SEO-V22 will report `UNAVAILABLE` at validation time, which is honest, not a failure.
- **Brief self-check fails:** fix the brief (usually the outline does not answer the main question first, or a required subtopic has no home) and re-run the self-check before handoff.
- **Generation drifted from the brief:** that is a VALIDATE-phase finding (intent drift / missing subtopic), not a reason to retro-edit the brief to match the draft.

## Cross-References

- `SKILL.md` — phase workflow, hook table (`plan(topic)` produces this brief)
- `SEARCH-INTENT.md` — supplies the embedded `intent_summary`
- `KEYWORD-STRATEGY.md` — supplies primary/secondary keywords, entities, question queries
- `SERP-ANALYSIS.md` — supplies content gaps and snippet opportunities when real SERP data exists
- `CANNIBALIZATION.md` — gate that must read LOW/MEDIUM before bulk or single brief generation
- `TOPIC-COVERAGE.md`, `INFORMATION-GAIN.md`, `EEAT-TRUST.md` — WRITE-phase modules that enforce the brief
- `ON-PAGE-SEO.md`, `INTERNAL-LINKING.md`, `IMAGE-SEO.md`, `SCHEMA.md`, `FEATURED-SNIPPETS.md` — WRITE-phase modules that consume the corresponding brief fields
- `VALIDATION.md` — the gate that measures the article against this brief
- `schemas/content-brief.schema.json` — the output contract
- `examples/content-brief-example.json` — the worked instance (shared scenario)
