# Article Generation Pipeline — Runtime Contract

> Part of the content-style skill · Phases owned by this skill: WRITE (2), EDITORIAL VALIDATE (3a) · Read when: wiring the skill into a CMS, or deciding what runs when an article is generated

## What this document is

This is the runtime contract for **article generation**. It defines what happens automatically every time the CMS AI produces or modifies an article — and, just as importantly, what does NOT happen.

The same contract ships with the `seo-ranking` skill package (with its role sections swapped), so both packages enforce one pipeline shape. The package-root `INTEGRATION.md` tells an external coding agent how to wire this pipeline into a CMS as a single centralized function.

## 1. Auto-activation — this pipeline is not user-facing

Both skills are **internal infrastructure**:

- They fire **automatically** on every article operation. No manual activation, no "apply style" button, no skill selection step.
- They are **invisible to end users**. Skill internals — modules, checks, prompts, phase logs — never surface in the UI.
- The CMS may surface **final results only**: content-quality warnings, SEO score, SEO warnings, and the generated SEO title / meta description / slug (the latter three produced by the seo-ranking skill).
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
PHASE 2 · WRITE                   [content-style skill — THIS SKILL]
  Article generation governed by the brief plus the editorial modules:
  niche pattern, structure, voice, formatting, factual integrity, depth
        |
        v
PHASE 3 · VALIDATE
  3a. Editorial validation ....... [content-style skill — THIS SKILL] 30-check gate
  3b. SEO validation ............. [seo-ranking skill] 40-check gate + scores
        |
        v
PHASE 4 · OPTIMIZE                [pipeline executor, using both skills' fix rules]
  Fix flagged issues, then re-validate. Maximum two fix iterations (§6).
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

### Phase 1 — PLAN (owner: seo-ranking skill; summarized here)

Intent → keywords → topic mapping → (optional, real data only) SERP/competitor gap → (optional) cannibalization screen → **Content Brief JSON**, which arrives in this skill as `source_material`. Every factual claim in Phase 2 stays within that brief's source material. Cannibalization HIGH blocks Phase 2 entirely.

### Phase 2 — WRITE (owner: this skill)

The editorial workflow from `SKILL.md` §6, steps 1–5, executed under the brief:

1. **CLASSIFY** — content type + niche + audience (the brief's intent/format fields feed this)
2. **SKELETON** — select the section skeleton for (vertical × archetype)
3. **OUTLINE** — order sections by reader need; every section earns its place
4. **DRAFT** — intro, body, conclusion under `EDITORIAL-PRINCIPLES.md`, `WRITING-QUALITY.md`, `FACTUAL-INTEGRITY.md`, `FORMATTING.md`
5. **SELF-REVIEW** — sweep for AI patterns, repetition, filler, padding

Output: draft article (Markdown) ready for the gates. The skill does not generate SEO metadata (title tag, meta description, slug, schema) — that is the seo-ranking skill's domain. The H1 is shared: this skill governs its editorial quality, seo-ranking governs its keyword alignment.

### Phase 3 — VALIDATE (both skills, separate gates, stored together)

- **3a Editorial gate** (this skill, steps 6–7 of the workflow): 30 checks, verdict PASS/WARNING/FAIL, editorial validation report JSON. Fabrication is an unconditional FAIL.
- **3b SEO gate** (seo-ranking skill): 40 checks plus the scores; its Technical section is site-level and `NOT_MEASURABLE` in this pipeline by default.

Both reports are stored with the article. **Either gate's FAIL blocks auto-publish.**

### Phase 4 — OPTIMIZE (pipeline executor)

Targeted revision of flagged issues using this skill's fix rules (structure, voice, repetition, filler, factual corrections) plus the seo-ranking skill's fix rules (title/meta/slug/alt/schema). Re-run Phase 3 after each pass. Maximum two fix iterations — anything unresolved is returned as warnings, never silently dropped.

## 4. Six CMS operations, one pipeline

All article operations call **the same** pipeline function. There are not six implementations. Differences are mode flags only:

| CMS operation | Invocation | Editorial behavior |
|---|---|---|
| Manual article generation | Full pipeline (`mode: generate`) | Full skill: classify → structure → draft → validate |
| AI Ideas | Phase 1 light screen per idea; full pipeline on promotion | Title/intro quality rules only for idea text; full gate when an idea becomes an article |
| Automation (scheduled, headless) | Full pipeline, `interactive: false` | Full skill, identical gate — headless never means relaxed |
| Regenerate article | Full pipeline (`mode: regenerate`) | Full skill + anti-repetition comparison against the original (CS-15) |
| Edit / improve article | Validate-first: Phase 3 on the existing article, then targeted Phase 2 rewriting of failing sections, then Phase 4 | Full gate on the whole article; fixes focused on failing sections; preserve what works |
| Bulk article generation | The full pipeline per item (`batch: true`) | Full skill per article, batched reports; FAIL items quarantined |

## 5. Scope — what this pipeline does NOT do

**This pipeline is article-level only.** It never runs site-level technical SEO (robots.txt, sitemap, Search Console, Core Web Vitals, crawlability, site-wide indexing/redirects/broken links/architecture) — those belong to the CMS's existing SEO section and to the seo-ranking package's optional `site-level/` maintenance references, which never auto-execute.

The Content Style Skill additionally stays out of: SEO metadata fields (title tag, meta description, slug, canonical, schema — the seo-ranking skill's domain, H1 shared), UI copy, code, and user-generated content that never passes through an AI rewriting step.

## 6. Optimization loop and failure policy

| Situation | Behavior |
|---|---|
| Editorial gate FAIL | No auto-publish. Revise the flagged issues (not the whole article unless CS-30 also fails), re-run the gate |
| Fix loop | Maximum two iterations, then return with unresolved items as warnings |
| Fabrication detected (CS-23/CS-24) | Unconditional FAIL — integrity overrides everything, including word-count targets |
| Conflicting workflow instruction (e.g. "hit 1500 words no matter what") | Core rules win; the conflict is recorded in the report notes |
| Pipeline error | Return the draft plus error warnings; never silently drop the operation |

## 7. Persistence

Store with every generated article: the content brief, the editorial validation report, the SEO validation report, the score, and the final warnings. They are the audit trail for refresh decisions later, and the only artifacts the CMS may choose to summarize in its UI.
