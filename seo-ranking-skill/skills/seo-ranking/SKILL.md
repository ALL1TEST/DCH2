---
name: seo-ranking
description: >
  INTERNAL ARTICLE-PIPELINE SKILL — must auto-activate whenever the CMS AI
  generates, regenerates, edits, improves, expands, or bulk-produces any article.
  Plans the article (search intent, keyword strategy, topic coverage, content
  brief), validates its on-page SEO, scores it 0-100, and drives the optimization
  pass — before the article reaches the CMS editor. Article-level SEO only:
  site-level technical SEO (robots.txt, sitemap, Search Console, Core Web Vitals,
  indexing) never auto-runs and stays with the CMS's existing SEO dashboard.
  Invisible to end users — the CMS may surface only final scores, warnings, and
  the generated SEO title/meta/slug. Never fabricates metrics; unavailable data
  is marked UNAVAILABLE, never invented.
version: 1.1.0
license: MIT
---

# SEO Ranking Skill

## 1. Philosophy — what this skill actually optimizes

This is not a keyword-score system. A page that satisfies a checklist while leaving the reader's question unanswered is an SEO failure no matter how many fields contain the keyword.

This skill optimizes for **search usefulness**, aligned with Google's own guidance (people-first, helpful, reliable content — see `GOOGLE-GUIDANCE.md`):

1. Match the **search intent** and answer the main question directly.
2. Cover the topic completely, with **information gain** beyond what already exists.
3. Be **trustworthy**: accurate, sourced, honest about what is known and unknown.
4. Handle on-page elements (title, H1, meta, slug, headings, links, images, schema) to published best practice — without keyword stuffing.
5. Be legible to **AI search / answer engines** through clear answers and clean structure.

Two hard principles run through every module:

- **The Data Availability Policy (§7).** Real data, or an explicit `UNAVAILABLE` / `NOT_MEASURABLE` marker. Never an invented search volume, competitor, ranking, or Search Console number.
- **Integrity overrides.** Fabricated data, fake experience, and misleading structured data fail the gate regardless of how well everything else scores.

## 2. What this skill is — internal pipeline infrastructure

This skill is not a frontend feature and not a dashboard. It is the **SEO brain of the CMS's article-generation pipeline**: it fires automatically on every article operation, plans the article before it is written, validates it before it is saved/published, and hands the CMS editor a finished article plus a score and warnings.

- **Auto-activation.** No manual trigger exists. Every article-producing workflow (§9) runs this skill's PLAN and VALIDATE phases without asking.
- **Invisible execution.** Skill internals — modules, checks, prompts, phase logs — never surface in the UI. The CMS may surface final results only: SEO score, SEO warnings, and the generated SEO title / meta description / slug.
- **One pipeline.** All six CMS article operations call the same centralized pipeline (§9). There are not six implementations.
- **The runtime contract** — phases, mode flags, fix loop, failure policy — is `PIPELINE.md`; the wiring guide for the integrating agent is the package-root `INTEGRATION.md`.

## 3. Authority order

1. **Google Search Central** documentation (canonical links in `GOOGLE-GUIDANCE.md`). Wins all conflicts.
2. **This skill's rules** — written to be consistent with (1).
3. Third-party reference projects (`REFERENCES.md`) — conceptual inspiration only, nothing copied, their licenses govern their own content only.

## 4. Scope — article-level AI SEO vs site-level technical SEO

The hosting CMS already has a site-level SEO section (SEO Overview, SEO Audit, Search Console, SEO Settings, Sitemap, Robots.txt, Redirects, Technical SEO monitoring). This skill does **not** redesign, duplicate, or re-run those features. The separation is total:

| | A) Article-level AI SEO — **this pipeline, automatic** | B) Site-level technical SEO — **CMS SEO dashboard, never per-article** |
|---|---|---|
| Runs | Every generate / regenerate / edit / improve / bulk operation | On demand by the CMS's own SEO tooling or a maintenance sprint |
| Covers | Search intent, keyword strategy and clustering, topic mapping and coverage, content brief, SERP analysis and competitor gap (real data only), information gain, entity/semantic coverage, content depth, on-page fields (title, H1, meta, slug), internal linking, external sources, image SEO, schema, featured snippets and PAA, AI search / GEO, E-E-A-T honesty, cannibalization, refresh recommendations, SEO validation, SEO quality score | robots.txt, sitemaps, Search Console monitoring, Core Web Vitals, crawlability, site-wide indexing, redirects, broken links, site architecture |
| In this package | The 18 article-level modules + VALIDATION + SCORING | `site-level/` — **optional maintenance references only; they never auto-execute when an article is generated** |

Practical consequences (enforced, not aspirational):

1. Generating an article **never** triggers a robots.txt audit, sitemap audit, crawl, or CWV check.
2. The per-article validation report's Technical section is `NOT_MEASURABLE` by default; the Technical SEO Score is `null`; Overall SEO Health is reported on a `content-only` basis (`SCORING.md`).
3. Site-level numbers enter reports only when the CMS explicitly supplies real site-level data — and then as maintenance context, never as an article gate.

## 5. When to use / when NOT to use

**Use for:** every content item the CMS produces or maintains that is intended to be found in search — articles, guides, comparisons, recipes, buying guides, listicles, reviews — across all six article operations (manual, AI-ideas, regeneration, edit/improve, automation, bulk).

**Do NOT use for:**

- Editorial voice, readability, paragraph/heading style of the body → `content-style` skill (this skill's readability check delegates to it).
- Landing pages, legal pages, or noindexed utility pages — run ON-PAGE checks only, skip scoring (they are not search-content).
- Paid ads copy, email, or social content.
- Site-level technical SEO as a per-article side effect — see §4; the `site-level/` modules are maintenance references, invoked deliberately, never automatically.

## 6. Required inputs

| Input | Required for | Notes |
|---|---|---|
| `topic` or `target_query` | All phases | What the article is about |
| `article` (Markdown + metadata) | VALIDATE phase | Title, H1, slug, meta description, body, images, schema blocks |
| `content_brief` | WRITE/VALIDATE | Ideally produced by this skill's PLAN phase |
| `cms_inventory` | PLAN (cannibalization), internal linking | Existing pages: URL/slug, title, primary keyword, intent. **If absent, mark `UNAVAILABLE` and skip — never invent URLs or article IDs.** |
| `serp_data` | PLAN (SERP analysis) | Real SERP results only. Absent → mark `UNAVAILABLE`; the brief proceeds with lower confidence noted. |
| `search_console_data` | Optional maintenance context only | Real API export only. Absent → `UNAVAILABLE`. Never fetched as part of article generation. |
| `technical_access` | Optional maintenance context only | robots.txt, sitemap, crawl data, or admin access. Absent → `NOT_MEASURABLE` — and never claim technical health. Never required for article generation. |

## 7. Data Availability Policy (applies to every module)

1. Any metric you did not receive from a real source **MUST** be reported as `"UNAVAILABLE"` (for missing data points) or the containing score/section marked `"NOT_MEASURABLE"` (for whole checks that need data you do not have).
2. Never estimate, round-guess, or "typical-value" a metric. A fabricated number is worse than no number: it poisons every decision built on it.
3. `UNAVAILABLE` is never a failure verdict by itself — it is an honest limitation. It lowers confidence, not quality, unless the missing data was the whole point of the check (e.g., INDEXING without Search Console access).
4. Every report carries a `data_availability` block stating which inputs were real, so a human can see exactly what the conclusions rest on.

## 8. The article generation pipeline

Full contract in `PIPELINE.md`. Summary:

```
Article request (six operations, one pipeline — §9)
   |
   v
PHASE 1 · PLAN (this skill)
   01 SEARCH-INTENT      -> classify intent + goal + format + journey stage + subtopics
   02 KEYWORD-STRATEGY   -> primary/secondary/long-tail/semantic/entities (no invented metrics)
   05 TOPIC-COVERAGE     -> required subtopics, depth calibration, topic mapping
   04 SERP-ANALYSIS      -> IF real SERP data: gaps, formats, competitors' coverage
   15 CANNIBALIZATION    -> IF inventory: overlap vs. existing pages -> LOW/MEDIUM/HIGH
   03 CONTENT-BRIEF      -> synthesize everything into the brief (the generation contract)
   |
   v
PHASE 2 · WRITE (content-style skill, governed by the brief)
   |
   v
PHASE 3 · VALIDATE (both skills)
   3a Editorial gate     -> content-style skill: 30 checks, PASS/WARNING/FAIL
   3b SEO gate           -> this skill: VALIDATION (40 checks) + SCORING
   |
   v
PHASE 4 · OPTIMIZE
   Fix flagged issues, re-validate. Max two iterations; residual -> warnings.
   |
   v
Final article + SEO fields + score + warnings -> CMS editor / save draft / publish
```

Phases are hooks, not suggestions: an article that skips PLAN gets a weaker brief; an article that skips VALIDATE is unpublished by policy. The **OPTIMIZE** pass applies recommended fixes (deterministically where possible) and re-runs the gates.

**Optional maintenance context (never part of article generation):** `CONTENT-REFRESH.md` runs on edit/improve operations and scheduled reviews; `site-level/TECHNICAL-SEO.md` and `site-level/INDEXING.md` run only when a maintenance job explicitly requests them, with real access data. None of the three ever fires as a side effect of generating an article.

## 9. Six CMS operations, one pipeline

All six article operations call the same centralized pipeline function; differences are mode flags only. There are **not** six implementations.

| CMS operation | Invocation | This skill's behavior |
|---|---|---|
| Manual article generation | Full pipeline (`mode: generate`) | PLAN → brief; VALIDATE → report + score |
| AI Ideas | Phase 1 light screen per idea (intent + keyword cluster + cannibalization); full pipeline on promotion | Stops cannibalization factories before ideas become articles |
| Automation (scheduled) | Full pipeline, `interactive: false` | Identical gates — headless never means relaxed |
| Regenerate article | Full pipeline (`mode: regenerate`) | Brief rebuilt (reuse allowed when the topic is unchanged) |
| Edit / improve article | Validate-first: Phase 3 on the existing article, targeted rewrite, Phase 4 | Refresh recommendations from `CONTENT-REFRESH.md` |
| Bulk article generation | The full pipeline per item (`batch: true`) | Per-item briefs; cannibalization across the batch AND inventory; FAIL items quarantined |

## 10. Module map

| # | File | Pipeline phase | One-line responsibility |
|---|---|---|---|
| 01 | `SEARCH-INTENT.md` | PLAN | Classify informational/commercial/transactional/navigational + goal, main question, format, journey stage, subtopics |
| 02 | `KEYWORD-STRATEGY.md` | PLAN | Keyword tiers, clustering and entities; natural usage; metrics real or UNAVAILABLE |
| 03 | `CONTENT-BRIEF.md` | PLAN | The pre-generation contract: outline, subtopics, gaps, links, media, schema, snippet opportunities |
| 04 | `SERP-ANALYSIS.md` | PLAN | Real-data-only competitor/intent analysis → information gain direction |
| 05 | `TOPIC-COVERAGE.md` | WRITE | Required-subtopic completeness + depth calibration |
| 06 | `INFORMATION-GAIN.md` | WRITE | The re-search test: would the reader need to search again? |
| 07 | `EEAT-TRUST.md` | WRITE | Honest E-E-A-T: real experience only, no fabricated signals |
| 08 | `ON-PAGE-SEO.md` | WRITE | Title, H1, meta description, slug, keyword placement, canonical, OG |
| 09 | `INTERNAL-LINKING.md` | WRITE | Relevant links + backlink suggestions from real inventory |
| 10 | `EXTERNAL-LINKING.md` | WRITE | When to cite authoritative sources, and how |
| 11 | `IMAGE-SEO.md` | WRITE | Image usefulness, placement, alt text describing the actual image |
| 12 | `SCHEMA.md` | WRITE | Valid JSON-LD matching visible content; type selection; no fabricated properties |
| 13 | `FEATURED-SNIPPETS.md` | WRITE | Concise-answer, list, table, step opportunities |
| 14 | `AI-SEARCH-GEO.md` | WRITE | Direct answers, entity clarity, structured facts for AI engines |
| 15 | `CANNIBALIZATION.md` | PLAN | New-vs-existing overlap → LOW/MEDIUM/HIGH + recommendation |
| 16 | `CONTENT-REFRESH.md` | Edit/improve + scheduled reviews | Decay evaluation and substantive refresh planning |
| 17 | `site-level/TECHNICAL-SEO.md` | **Maintenance only — never auto-runs** | Site-level audit checklist (real access only) |
| 18 | `site-level/INDEXING.md` | **Maintenance only — never auto-runs** | Sitemap status, indexation, GSC performance (real integration only) |
| 19 | `VALIDATION.md` | VALIDATE | The article gate: 40 checks, issue objects, verdict logic, report format |
| 20 | `SCORING.md` | VALIDATE | Weighted 0–100 scores: content / technical / overall + grades |
| — | `PIPELINE.md` | All | The runtime contract: phases, six operations → one pipeline, scope separation |
| — | `GOOGLE-GUIDANCE.md` | All | Primary authority: principles + canonical links |
| — | `REFERENCES.md` | — | Third-party reference projects + license notes |
| — | `schemas/` | All | JSON Schema contracts: brief, intent, keywords, cannibalization, report, score |
| — | `examples/` | On demand | Worked content brief + full validation report |
| — | `fixtures/` | Testing | 10 test articles + inventory + expected-results.json |

Load modules progressively — only what the current phase needs. `VALIDATION.md` and `SCORING.md` are always loaded together in Phase 3. The `site-level/` modules load only in explicit maintenance contexts.

## 11. Outputs

All outputs are JSON objects conforming to `schemas/` (contract definitions) with worked instances in `examples/`:

1. **Intent analysis** (`schemas/intent-analysis.schema.json`) — PLAN
2. **Keyword map** (`schemas/keyword-map.schema.json`) — PLAN
3. **Content brief** (`schemas/content-brief.schema.json`) — PLAN, handed to the content-style skill as `source_material`
4. **Cannibalization report** (`schemas/cannibalization-report.schema.json`) — PLAN, when inventory exists
5. **SEO validation report** (`schemas/seo-validation-report.schema.json`) — VALIDATE; every issue carries `type`, `severity` (CRITICAL / WARNING / INFO), `location`, `problem`, `why_it_matters`, `recommended_fix`
6. **SEO score** (`schemas/seo-score.schema.json`) — VALIDATE; three scores per `SCORING.md`

These are internal artifacts stored with the article. The CMS may surface the final score and warnings in its UI; everything else stays invisible (package-root `INTEGRATION.md` §6).

## 12. Validation gate and scoring (summary — details in VALIDATION.md / SCORING.md)

**Issue severities:** `CRITICAL` (blocks publishing), `WARNING` (should fix; core-field warnings cap the verdict at WARNING), `INFO` (opportunities and notes).

**Verdict logic:**

| Condition | Verdict |
|---|---|
| Any CRITICAL issue, or SEO Content Score < 70, or (technical measurable AND < 40) | `FAIL` |
| No criticals, and (Content Score 70–84, or any core-field warning, or technical measurable < 70) | `WARNING` |
| Content Score ≥ 85, no criticals, no core-field warnings, technical N/A or ≥ 70 | `PASS` |

**Scores:** SEO Content Score (9 weighted categories, deduction-based, integrity overrides) — the article's SEO quality score, always computed. Technical SEO Score — **site-level; `NOT_MEASURABLE` in the article pipeline**, so `null` there (real site-level data only, and then as maintenance context — see §4). Overall SEO Health (70/30 blend when both measurable; `content-only` basis in the article pipeline; grades A–F).

## 13. Failure handling

- **Gate FAIL:** fix the flagged CRITICAL issues first (they are usually intent, fabrication, stuffing, or schema problems), then re-run. Warnings can be scheduled; criticals cannot.
- **Cannibalization HIGH:** do not publish the new article as-is. Choose a recommendation from `CANNIBALIZATION.md` (improve existing / merge / change intent / change angle / drop) before generating.
- **UNAVAILABLE data:** proceed with the phase at reduced confidence, note it in the report's `data_availability` block. Do not stall the pipeline and do not invent substitutes.
- **Conflict between modules:** the stricter integrity rule wins; if genuinely ambiguous, Google guidance wins (§3).

## 14. Integration guide for AI agents

The complete wiring guide is the package-root `INTEGRATION.md`. The short version:

**One centralized pipeline function, called from all six CMS article operations** (manual generation, AI ideas, automation, regenerate, edit/improve, bulk). The function owns: phase ordering, mode flags, the two-iteration OPTIMIZE fix loop, report persistence, FAIL/cannibalization blocking, and batch handling. It never exposes skill internals to the UI; the CMS may surface only the final score, warnings, and generated SEO title/meta/slug.

**Shared contracts:** the JSON schemas in `schemas/` are the API between this skill, the CMS, and the content-style skill. The brief enters generation as `source_material`; the article exits generation into validation.

```
runArticlePipeline('generate'|'regenerate'|'improve'|'idea-screen', input, ctx)
   1. plan(topic)                    -> intent, keyword map, cannibalization, brief
   2. generate (content-style skill) -> draft + editorial report
   3. validate(article, brief)       -> SEO report + score
   4. optimize + re-validate (max 2) -> final article + warnings
   5. persist reports with the article; surface score/warnings only
```

**Bulk/automation:** the identical pipeline per item; batch the reports; quarantine FAILs. Cannibalization must run on **every** topic in a bulk batch — bulk generation is the classic cannibalization factory.

**Calibration:** `fixtures/expected-results.json` is the behavioral contract for any implementation. Disagreement with a fixture means the implementation is wrong.

## 15. Conventions

- Module rule IDs: `SEO-SI-`, `SEO-KW-`, `SEO-CB-`, `SEO-SA-`, `SEO-TC-`, `SEO-IG-`, `SEO-EEAT-`, `SEO-OP-`, `SEO-IL-`, `SEO-EL-`, `SEO-IMG-`, `SEO-SD-`, `SEO-FS-`, `SEO-GEO-`, `SEO-CN-`, `SEO-CR-`, `SEO-TS-`, `SEO-IX-` prefixes; validation checks are `SEO-V01…SEO-V40` (defined in `VALIDATION.md`; new checks start at SEO-V41).
- Issue `type` values come from the canonical registry in `VALIDATION.md` (snake_case, e.g. `keyword_stuffing`, `missing_meta_description`). Reports and fixtures use these exact values.
- Severity scale: CRITICAL / WARNING / INFO (validation issues). PASS/WARNING/FAIL is the *verdict*; do not mix the scales.
- `fixtures/expected-results.json` is the behavioral contract for any implementation. Disagreement with a fixture means the implementation is wrong.

## 16. Version

- 1.1.0 — architecture relabel: internal auto-activating article-pipeline skill; article-level vs site-level scope made structural (site-level modules moved to `site-level/`, never auto-execute); six CMS operations unified onto one centralized pipeline (`PIPELINE.md`, package-root `INTEGRATION.md`); Technical SEO Score relabeled site-level (`NOT_MEASURABLE` in the article pipeline; Overall reported content-only). No changes to check IDs, issue types, verdict logic, or schemas' field structure.
- 1.0.0 — initial release. Breaking changes to issue types, severity semantics, check IDs, verdict logic, or the schemas require a version bump. Scoring weights are tunable configuration, not schema.
