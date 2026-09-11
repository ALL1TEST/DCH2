# Integration Guide — Wiring the Skill Pipeline into a CMS

> For the external coding agent (e.g., Google Antigravity) integrating `seo-ranking-skill` and `content-style-skill` into an existing CMS. This guide is shared by both packages — each package root carries the same contract so either can be read first.

## 0. The one-sentence goal

Make every AI-generated article automatically pass professional SEO planning and editorial quality gates before it reaches the CMS editor — **without adding any frontend surface**.

## 1. Hard requirements

**DO:**

- Implement **one centralized pipeline function** (e.g., `runArticlePipeline(operation, input, context)`) and call it from every article operation in the CMS.
- **Auto-activate** it: no manual triggers, no opt-in, no "run SEO" button.
- Keep execution **invisible**: the UI may surface final results only (SEO score, SEO warnings, content-quality warnings, generated SEO title / meta description / slug).
- Persist the brief and both validation reports with the article as the audit trail.

**DON'T:**

- Don't build six per-operation implementations — all six operations share the one pipeline (§4).
- Don't build skill pages, dashboards, activation UI, execution UI, or configuration screens. The skills are internal infrastructure.
- Don't run site-level technical audits (robots.txt, sitemap, Search Console, Core Web Vitals, crawlability, site-wide indexing/redirects/broken links/architecture) as part of article generation — the CMS's existing SEO section (SEO Overview, SEO Audit, Search Console, SEO Settings, Sitemap, Robots.txt, Redirects, Technical SEO monitoring) owns those. Leave that section of the CMS untouched.
- Don't relax the gates for automation or bulk workflows.
- Don't fabricate data anywhere — metrics, SERP results, sources, quotes, or experience. The skills mark unavailable data `UNAVAILABLE`; the implementation must too.

## 2. What to build (three layers)

These packages are rulebooks and JSON contracts, not runtime code. The integrating agent implements them as:

1. **Generation prompts** — load `SKILL.md` plus the modules for the current phase into the system prompt of the content-generating LLM call (each SKILL.md contains the progressive-disclosure load map).
2. **Deterministic validators** — implement as code, because they must behave identically every run: title/meta length windows, slug form, single-H1 and heading hierarchy, JSON-LD parse plus required properties, keyword density and placement heuristics, alt-text presence, internal-link URLs against the inventory, report/score JSON shape against `schemas/`.
3. **Orchestration** — the pipeline function itself: phase ordering, mode flags, the two-iteration fix loop, report persistence, FAIL/cannibalization blocking, batch handling.

Judgment checks (intent match, coverage, information gain, E-E-A-T honesty, AI-pattern detection) run as LLM validation calls with only the finished article plus the relevant module rules in context — the generator never grades itself in the same context.

## 3. Required CMS context inputs

| Input | Required | Used for | If absent |
|---|---|---|---|
| Site config (niche, tone, language/locale) | Recommended | Brief building, niche pattern selection | Defaults used; assumptions recorded |
| Article inventory (URL/slug, title, primary keyword, intent, last-updated) | Strongly recommended | Cannibalization detection, internal linking, title/slug uniqueness | `UNAVAILABLE` — those checks skip; never invent URLs |
| Real SERP / keyword data | Optional | `SERP-ANALYSIS.md`, keyword metrics | `UNAVAILABLE` — brief proceeds at stated lower confidence |
| Search Console data | Optional, maintenance only | Refresh candidates via `CONTENT-REFRESH.md`; never per-article | `UNAVAILABLE` |
| Real author profiles | Optional | Honest E-E-A-T attribution in `EEAT-TRUST.md` | No author claims are made |
| Existing slugs | Recommended | Slug collision avoidance | Uniqueness check skips |

## 4. Wiring the six operations — one function

| CMS operation | Call | Mode flags |
|---|---|---|
| Manual article generation | `runArticlePipeline('generate', topicInput, ctx)` | `interactive: true` |
| AI Ideas | `runArticlePipeline('idea-screen', ideaList, ctx)` per idea batch → `('generate', …)` on promotion | Light Phase 1 only for screening |
| Automation (scheduled) | `runArticlePipeline('generate', item, ctx)` from the scheduler | `interactive: false`, same gates |
| Regenerate article | `runArticlePipeline('regenerate', { topic, originalArticle }, ctx)` | Brief rebuilt (reuse allowed if topic unchanged); anti-repetition vs original |
| Edit / improve article | `runArticlePipeline('improve', { article }, ctx)` | Validate-first; targeted rewrite of failing sections; refresh recommendations |
| Bulk article generation | `runArticlePipeline('generate', item, ctx)` in a loop, `batch: true` | Per-item briefs; cannibalization across batch AND inventory; FAIL items quarantined |

Full phase-by-phase behavior: `skills/seo-ranking/PIPELINE.md` (same contract in the content-style package).

## 5. Outputs to persist (per article)

1. Content brief (Phase 1)
2. Editorial validation report (Phase 3a, content-style skill format)
3. SEO validation report (Phase 3b, `schemas/seo-validation-report.schema.json`)
4. SEO score (Phase 3b, `schemas/seo-score.schema.json`)
5. Final warnings + generated SEO fields (title, meta description, slug)

## 6. Optional UI surfacing — final results only

**Allowed in the CMS UI:** SEO score, SEO warnings, content-quality warnings, the generated SEO title, meta description, and slug (e.g., in the existing editor or SEO panel).

**Not allowed:** phase logs, module internals, prompts, skill configuration screens, activation or execution controls, per-check detail pages. If the CMS wants to show more than the allowed list, that is a product decision made by the CMS team — the skills require none of it.

## 7. Implementation order

1. Adopt the **content-brief contract** (`schemas/content-brief.schema.json`) and implement Phase 1 (PLAN) prompts.
2. Inject the **content-style modules** into Phase 2 generation.
3. Implement Phase 3 **validators** — deterministic checks first, then judgment checks.
4. Implement **scoring + report** emission (`SCORING.md`, `VALIDATION.md`, schemas).
5. Implement the Phase 4 **auto-fix loop** (two iterations).
6. Wire the **six operations** to the one pipeline: manual first, then regenerate/edit-improve, then bulk/automation/AI-ideas.
7. **Calibrate** against `fixtures/expected-results.json` in both packages — disagreement with a fixture means the implementation is wrong.

## 8. Failure policy

- Gate FAIL → no auto-publish; return the draft with warnings and reports.
- Cannibalization HIGH → blocked at Phase 1; return the conflict and recommendation.
- `UNAVAILABLE` inputs → proceed at reduced, stated confidence; never stall, never invent.
- Pipeline error → return the draft plus error warnings; never silently drop an operation.
- Bulk: quarantine FAIL items; never auto-downgrade a FAIL to keep a queue moving.

## 9. What the skills will never do

- Fabricate metrics, SERP data, statistics, experts, quotes, reviews, or experience.
- Run site-level technical audits as a side effect of article generation.
- Require any new frontend pages or user-facing configuration.
- Promise rankings — scores are content-quality signals for prioritization, not guarantees.
