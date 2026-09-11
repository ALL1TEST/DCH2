# Integration Guide — Wiring the Skill Pipeline into a CMS

> For the external coding agent (e.g., Google Antigravity) integrating `content-style-skill` and `seo-ranking-skill` into an existing CMS. This guide is shared by both packages — each package root carries the same contract so either can be read first.

## 0. The one-sentence goal

Make every AI-generated article automatically pass professional SEO planning and editorial quality gates before it reaches the CMS editor — **without adding any frontend surface**.

## 1. Hard requirements

**DO:**

- Implement **one centralized pipeline function** (e.g., `runArticlePipeline(operation, input, context)`) and call it from every article operation in the CMS.
- **Auto-activate** it: no manual triggers, no opt-in, no "apply style" button.
- Keep execution **invisible**: the UI may surface final results only (content-quality warnings, SEO score, SEO warnings, generated SEO title / meta description / slug).
- Persist the brief and both validation reports with the article as the audit trail.

**DON'T:**

- Don't build six per-operation implementations — all six operations share the one pipeline (§4).
- Don't build skill pages, dashboards, activation UI, execution UI, or configuration screens. The skills are internal infrastructure.
- Don't run site-level technical audits (robots.txt, sitemap, Search Console, Core Web Vitals, crawlability, site-wide indexing/redirects/broken links/architecture) as part of article generation — the CMS's existing SEO section (SEO Overview, SEO Audit, Search Console, SEO Settings, Sitemap, Robots.txt, Redirects, Technical SEO monitoring) owns those. Leave that section of the CMS untouched.
- Don't relax the gates for automation or bulk workflows.
- Don't fabricate data anywhere — sources, quotes, statistics, experience, or testimonials. The skills mark unavailable information as omitted or unavailable; the implementation must too.

## 2. What to build (three layers)

These packages are rulebooks and JSON contracts, not runtime code. The integrating agent implements them as:

1. **Generation prompts** — load `SKILL.md` plus the modules for the current step into the system prompt of the content-generating LLM call (§7 in `SKILL.md` contains the progressive-disclosure load map; keep generation and validation as separate calls so the gate stays honest).
2. **Deterministic validators** — implement as code, because they must behave identically every run: single-H1 and heading hierarchy, paragraph/sentence length thresholds, banned-phrase positional detection, repetition and padding measurements, report JSON shape.
3. **Orchestration** — the pipeline function itself: phase ordering, mode flags, the two-iteration fix loop, report persistence, FAIL blocking, batch handling.

Judgment checks (introduction strength, AI-pattern contextuality, filler vs. substance, fabrication scanning) run as LLM validation calls with only the finished article plus the relevant module rules in context — the generator never grades itself in the same context.

## 3. Required CMS context inputs

| Input | Required | Used for | If absent |
|---|---|---|---|
| `topic` | Yes | What the article is about | Pipeline cannot start |
| `content_type` | Yes | Archetype selection (how-to, comparison, listicle, recipe, buying-guide, review, informational, news) | Infer conservatively (`informational`); record assumption |
| `niche` | Yes | Vertical selection in `NICHE-PATTERNS.md` (13 verticals or `general`) | `general` used; assumption recorded |
| Site config (tone, audience, language/locale) | Recommended | Voice defaults | Niche default tone used |
| `source_material` (the SEO content brief) | Recommended | Factual boundary; the seo-ranking skill's PLAN phase produces it | Facts limited to verifiable general knowledge with hedging |
| `existing_draft` | Edit/regeneration modes only | Targeted revision + anti-repetition comparison | n/a |
| `target_word_count` | Optional | Depth target — a target, never a mandate to pad | Depth calibrated by intent + niche instead |

## 4. Wiring the six operations — one function

| CMS operation | Call | Mode flags |
|---|---|---|
| Manual article generation | `runArticlePipeline('generate', topicInput, ctx)` | `interactive: true` |
| AI Ideas | `runArticlePipeline('idea-screen', ideaList, ctx)` per idea batch → `('generate', …)` on promotion | Title/intro quality rules only for idea text; full gate on promotion |
| Automation (scheduled) | `runArticlePipeline('generate', item, ctx)` from the scheduler | `interactive: false`, same gates |
| Regenerate article | `runArticlePipeline('regenerate', { topic, originalArticle }, ctx)` | Full skill + CS-15 anti-repetition comparison vs the original |
| Edit / improve article | `runArticlePipeline('improve', { article }, ctx)` | Validate-first; targeted rewrite of failing sections; full gate on the whole article |
| Bulk article generation | `runArticlePipeline('generate', item, ctx)` in a loop, `batch: true` | Full skill per article, batched reports; FAIL items quarantined |

Full phase-by-phase behavior: `skills/content-style/PIPELINE.md` (same contract in the seo-ranking package).

## 5. Outputs to persist (per article)

1. Content brief (Phase 1, produced by the seo-ranking skill)
2. Editorial validation report (Phase 3a, this skill — format in `VALIDATION.md`)
3. SEO validation report (Phase 3b, seo-ranking skill)
4. SEO score (Phase 3b, seo-ranking skill)
5. Final warnings + generated SEO fields (title, meta description, slug — seo-ranking skill)

## 6. Optional UI surfacing — final results only

**Allowed in the CMS UI:** content-quality warnings, SEO score, SEO warnings, the generated SEO title, meta description, and slug (e.g., in the existing editor or SEO panel).

**Not allowed:** phase logs, module internals, prompts, skill configuration screens, activation or execution controls, per-check detail pages. If the CMS wants to show more than the allowed list, that is a product decision made by the CMS team — the skills require none of it.

## 7. Implementation order

1. Adopt the **content-brief contract** from the seo-ranking package and implement Phase 1 (PLAN) prompts.
2. Inject **this skill's modules** into Phase 2 generation (load map in `SKILL.md` §7).
3. Implement Phase 3 **validators** — deterministic checks first, then judgment checks; keep generation and validation in separate LLM calls.
4. Implement **scoring + report** emission (seo-ranking package for the SEO side).
5. Implement the Phase 4 **auto-fix loop** (two iterations).
6. Wire the **six operations** to the one pipeline: manual first, then regenerate/edit-improve, then bulk/automation/AI-ideas.
7. **Calibrate** against `fixtures/expected-results.json` in both packages — disagreement with a fixture means the implementation is wrong.

## 8. Failure policy

- Editorial gate FAIL → no auto-publish; revise the flagged issues, re-run the gate; never silently downgrade a FAIL.
- Fabrication detected (CS-23/CS-24) → unconditional FAIL, regardless of word-count targets or queue pressure.
- Conflicting workflow instruction (e.g., "hit 1500 words no matter what") → core rules win; the conflict is recorded in the report notes.
- Pipeline error → return the draft plus error warnings; never silently drop an operation.
- Bulk: quarantine FAIL items; never relax the gate to keep a queue moving.

## 9. What the skills will never do

- Fabricate statistics, experts, quotes, reviews, experience, or testimonials.
- Run site-level technical audits as a side effect of article generation.
- Require any new frontend pages or user-facing configuration.
- Pad articles to hit word counts — a short article that says everything beats a padded one.
