# Article Generation Pipeline — Runtime Contract

> Part of the seo-ranking skill · Phases owned by this skill: PLAN (1), SEO VALIDATE (3b), OPTIMIZE (4) · Read when: wiring the skill into a CMS, or deciding what runs when an article is generated

## What this document is

This is the runtime contract for **article generation**. It defines what happens automatically every time the CMS AI produces or modifies an article — and, just as importantly, what does NOT happen.

The same contract ships with the `content-style` skill package (with its role sections swapped), so both packages enforce one pipeline shape. The package-root `INTEGRATION.md` tells an external coding agent how to wire this pipeline into a CMS as a single centralized function.

## 1. Auto-activation — this pipeline is not user-facing

Both skills are **internal infrastructure**:

- They fire **automatically** on every article operation. No manual activation, no "run SEO" button, no skill selection step.
- They are **invisible to end users**. Skill internals — modules, checks, prompts, phase logs — never surface in the UI.
- The CMS may surface **final results only**: SEO score, SEO warnings, content-quality warnings, and the generated SEO title / meta description / slug.
- No frontend pages are required or permitted for the skills themselves: no skill dashboards, no activation UI, no execution UI.

## 2. The pipeline

```
User requests article
        |
        v
Article Generation Request        (one of six CMS operations — see §4)
        |
        v
PHASE 1 · PLAN                    [seo-ranking skill]
  SEARCH-INTENT ....... classify intent, main question, format, journey stage
  KEYWORD-STRATEGY .... primary/secondary/long-tail keywords, entities, clusters
  TOPIC-COVERAGE ...... required subtopics, depth calibration, topic mapping
  SERP-ANALYSIS ....... IF real SERP data exists (else skip — never simulate)
  CANNIBALIZATION ..... IF article inventory exists (else UNAVAILABLE note)
  CONTENT-BRIEF ....... the machine-readable contract for the writer
        |
        v
PHASE 2 · WRITE                   [content-style skill]
  Article generation governed by the brief plus the editorial modules:
  niche pattern, structure, voice, formatting, factual integrity, depth
        |
        v
PHASE 3 · VALIDATE
  3a. Editorial validation ....... [content-style skill] 30-check gate
  3b. SEO validation ............. [seo-ranking skill] 40-check gate + scores
        |
        v
PHASE 4 · OPTIMIZE                [pipeline executor, using both skills' fix rules]
  Fix flagged issues (title/meta/slug/alt/schema/structure/claims),
  then re-validate. Maximum two fix iterations (§6).
        |
        v
FINAL OUTPUT
  Article + SEO fields (title, meta description, slug)
  + SEO score + warnings + both validation reports
        |
        v
CMS Editor / Save Draft / Publish
```

## 3. Phase contracts

### Phase 1 — PLAN (owner: seo-ranking skill)

| Input | Source | If absent |
|---|---|---|
| `topic` / `target_query` | CMS operation | Pipeline cannot start |
| `cms_inventory` | CMS | Cannibalization + inventory-based internal linking → `UNAVAILABLE`; never invented |
| `serp_data` | CMS (real SERP export only) | SERP-ANALYSIS skips; brief proceeds at lower, stated confidence |
| site config (niche, tone, locale) | CMS | Defaults used, assumptions recorded |

Steps run in order: intent → keywords → topic mapping/coverage plan → (optional) SERP/competitor-gap → (optional) cannibalization screen → brief. **Output: Content Brief JSON** (`schemas/content-brief.schema.json`) — the single handoff object to Phase 2. Every downstream decision (structure, coverage, links, media, schema, snippet targets) traces back to it.

**Cannibalization HIGH blocks Phase 2.** The pipeline returns the conflict plus a recommendation (improve existing / merge / change angle / drop) instead of generating a competing article.

### Phase 2 — WRITE (owner: content-style skill)

The brief enters the content-style skill as `source_material`. The writer follows its editorial workflow (classify → skeleton → outline → draft → self-review) under its modules. Factual claims stay within the brief's source material. Output: draft article (Markdown) ready for the gates.

### Phase 3 — VALIDATE (both skills, separate gates, stored together)

- **3a Editorial gate** (content-style): 30 checks, verdict PASS/WARNING/FAIL. Fabrication is an unconditional FAIL.
- **3b SEO gate** (this skill): 40 checks — Content 12, On-Page 18, AI Search 5, Technical 5 — verdict PASS/WARNING/FAIL plus the scores (§7). In the article pipeline the Technical section is `NOT_MEASURABLE` by default (§5).

Both reports are stored with the article. **Either gate's FAIL blocks auto-publish.**

### Phase 4 — OPTIMIZE (pipeline executor)

Apply the recommended fixes from both reports: deterministic ones programmatically where possible (title/meta length, slug form, JSON-LD validity, alt text presence, heading tree), judgment ones through targeted revision with the relevant module rules loaded. Re-run Phase 3 after each pass. Stop after two fix iterations — anything unresolved is returned as warnings, never silently dropped.

## 4. Six CMS operations, one pipeline

All article operations call **the same** pipeline function. There are not six implementations. Differences are mode flags only:

| CMS operation | Invocation | Notes |
|---|---|---|
| Manual article generation | Full pipeline (`mode: generate`) | The reference path; identical gates for everything else |
| AI Ideas | Phase 1 light screen per idea (intent + keyword cluster + cannibalization check); full pipeline when an idea is promoted to an article | Screening ideas stops cannibalization factories before they start |
| Automation (scheduled, headless) | Full pipeline, `interactive: false` | Identical gates — headless never means relaxed |
| Regenerate article | Full pipeline (`mode: regenerate`); brief rebuilt (reuse permitted when the topic is unchanged); anti-repetition comparison against the original | Regeneration that reproduces the original's shape fails the editorial gate |
| Edit / improve article | Validate-first: Phase 3 on the existing article, then targeted Phase 2 rewriting of failing sections, then Phase 4 | Refresh recommendations come from `CONTENT-REFRESH.md`; edit mode preserves what already works |
| Bulk article generation | The full pipeline per item (`batch: true`); per-item briefs; cannibalization checked across the batch AND the inventory; batched reports; FAIL items quarantined | One shared implementation, invoked N times |

## 5. Scope — what this pipeline does NOT do

**A) Article-level AI SEO (this pipeline, automatic):** search intent, keyword strategy and clustering, topic mapping and coverage, content brief, SERP analysis and competitor gap when real data exists, information gain, entity/semantic coverage, content depth, on-page fields (title, H1, meta, slug), internal linking, external sources, image SEO, schema, featured-snippet and PAA opportunities, AI search / GEO readiness, E-E-A-T honesty, cannibalization, refresh recommendations, validation, scoring.

**B) Site-level technical SEO (NOT this pipeline):** robots.txt audits, sitemap audits, Search Console monitoring, Core Web Vitals audits, crawlability audits, site-wide indexing / redirects / broken-link / architecture audits. These belong to the CMS's existing SEO section (SEO Overview, SEO Audit, Search Console, SEO Settings, Sitemap, Robots.txt, Redirects, Technical SEO monitoring).

**Generating an article never triggers a site-level technical audit.** The site-level modules ship as optional maintenance references in `site-level/` — used on demand for maintenance work, never auto-executed. Consequences in per-article reports:

1. The validation report's Technical section is `NOT_MEASURABLE` (it stays that way unless the CMS explicitly supplies real site-level data — and then it is maintenance context, not an article gate).
2. The Technical SEO Score is `null`.
3. Overall SEO Health is reported on a `content-only` basis.

## 6. Optimization loop and failure policy

| Situation | Behavior |
|---|---|
| Gate FAIL | No auto-publish. Phase 4 attempts fixes; residual FAIL returns the draft with warnings and the report |
| Fix loop | Maximum two iterations, then return with unresolved items as warnings |
| Cannibalization HIGH | Blocked at Phase 1; recommendation returned instead of an article |
| `UNAVAILABLE` data (SERP, inventory, metrics) | Phase proceeds at reduced, stated confidence; never stalls, never invents substitutes |
| Pipeline error | Return the draft plus error warnings; never silently drop the operation |

## 7. Scores in the pipeline context

| Score | In the article pipeline |
|---|---|
| SEO Content Score | Always computed — this is the article's SEO quality score |
| Technical SEO Score | `null` / `NOT_MEASURABLE` — site-level, owned by the CMS's SEO dashboard |
| Overall SEO Health | Computed on a `content-only` basis |

## 8. Persistence

Store with every generated article: the content brief, the editorial validation report, the SEO validation report, the score, and the final warnings. They are the audit trail for refresh decisions later, and the only artifacts the CMS may choose to summarize in its UI.
