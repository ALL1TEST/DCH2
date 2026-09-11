# SEO Ranking Skill

**Version:** 1.1.0 · **Status:** Production-ready · **License:** MIT · **Type:** Standalone AI Agent Skill package

A reusable AI Agent Skill that controls **SEO strategy, planning, optimization, and validation for CMS-generated articles** — the article-level half of a two-skill article-generation pipeline.

It is written to be loaded and executed by an AI coding/content agent (for example Google Antigravity, Claude Code, or any LLM-driven pipeline), not by a human SEO. Every file is an instruction set, a rule catalog, a JSON contract, or a test fixture — there is no runtime code to install and no dependency on any specific CMS, SEO tool, or API.

> **This is internal pipeline infrastructure.** It is not a frontend feature and not a dashboard. It auto-activates on every article operation (generate, regenerate, edit/improve, expand, bulk), stays invisible to end users, and requires no new CMS pages. See [`INTEGRATION.md`](./INTEGRATION.md) for the wiring contract.

---

## What problem this solves

Most "AI SEO" tooling is a keyword checklist: *keyword in title = +10 points*. That produces optimized-looking content that ranks for nothing, because it measures trivia instead of search usefulness.

This skill evaluates **actual SEO quality**:

- Does the article match **search intent** and answer the main question directly?
- Does it cover the topic completely and add **information gain** beyond what already ranks?
- Is it trustworthy — no fabricated data, no fake experience, honest E-E-A-T?
- Are title, H1, meta description, slug, links, images, and structured data handled to Google's published guidance?
- Is it readable by **AI search / answer engines** (direct answers, entity clarity, structure)?

And it separates what it can *measure* from what it cannot: **it never invents search volume, SERP data, Search Console metrics, or Core Web Vitals.** Unavailable data is marked `UNAVAILABLE` / `NOT_MEASURABLE` — fabricating it is a rule violation, not a feature.

## Architecture — article-level AI SEO, not site-level technical SEO

The hosting CMS already owns site-level SEO (SEO Overview, SEO Audit, Search Console, SEO Settings, Sitemap, Robots.txt, Redirects, Technical SEO monitoring). This skill **does not touch, duplicate, or re-run those features**, and generating an article never triggers a robots.txt audit, sitemap audit, crawl, or Core Web Vitals check.

| | A) Article-level AI SEO — this skill, automatic | B) Site-level technical SEO — CMS dashboard, never per-article |
|---|---|---|
| Scope | Intent, keywords, topic mapping, brief, SERP/competitor gap (real data only), information gain, entities, depth, title/H1/meta/slug, internal links, external sources, image SEO, schema, featured snippets/PAA, AI search/GEO, E-E-A-T, cannibalization, refresh recommendations, validation, scoring | robots.txt, sitemaps, Search Console, Core Web Vitals, crawlability, site-wide indexing/redirects/broken links/architecture |
| In this package | 18 article-level modules + VALIDATION + SCORING + PIPELINE | `skills/seo-ranking/site-level/` — optional maintenance references, **never auto-execute** |

## The article generation pipeline

This skill pairs with the sibling `content-style-skill` (editorial quality of the article body) in one centralized pipeline — the same function called by all six CMS article operations (manual generation, AI ideas, automation, regenerate, edit/improve, bulk):

```
Article request → PHASE 1 · PLAN [seo-ranking: intent → keywords → topic mapping
→ brief] → PHASE 2 · WRITE [content-style, governed by the brief] →
PHASE 3 · VALIDATE [editorial gate + SEO gate] → PHASE 4 · OPTIMIZE [fix loop,
max 2 iterations] → final article + score + warnings → CMS editor / publish
```

Full runtime contract: [`skills/seo-ranking/PIPELINE.md`](./skills/seo-ranking/PIPELINE.md). Wiring guide for the integrating agent: [`INTEGRATION.md`](./INTEGRATION.md).

## Package structure

```
seo-ranking-skill/
├── README.md                          ← you are here (package overview + architecture)
├── INTEGRATION.md                     ← wiring guide: six CMS operations → ONE pipeline
├── LICENSE                            ← MIT
└── skills/
    └── seo-ranking/
        ├── SKILL.md                   ← ENTRY POINT: philosophy, scope, pipeline, module map, contracts
        ├── PIPELINE.md                ← runtime contract: phases, six operations, scope separation
        ├── SEARCH-INTENT.md           ← 01 · classify intent before anything else
        ├── KEYWORD-STRATEGY.md        ← 02 · keyword tiers, natural usage, no invented metrics
        ├── CONTENT-BRIEF.md           ← 03 · the pre-generation contract
        ├── SERP-ANALYSIS.md           ← 04 · real-data-only competitor analysis
        ├── TOPIC-COVERAGE.md          ← 05 · required subtopics + depth calibration
        ├── INFORMATION-GAIN.md        ← 06 · the "would the reader search again?" test
        ├── EEAT-TRUST.md              ← 07 · honest experience/expertise/authority/trust
        ├── ON-PAGE-SEO.md             ← 08 · title, H1, meta, slug, keyword placement
        ├── INTERNAL-LINKING.md        ← 09 · inventory-driven, never invented URLs
        ├── EXTERNAL-LINKING.md        ← 10 · when and where to link out
        ├── IMAGE-SEO.md               ← 11 · usefulness, placement, honest alt text
        ├── SCHEMA.md                  ← 12 · structured data that matches visible content
        ├── FEATURED-SNIPPETS.md       ← 13 · concise-answer opportunities
        ├── AI-SEARCH-GEO.md           ← 14 · optimization for AI answer engines
        ├── CANNIBALIZATION.md         ← 15 · new vs. existing content overlap (LOW/MEDIUM/HIGH)
        ├── CONTENT-REFRESH.md         ← 16 · honest refresh evaluation (edit/improve + scheduled)
        ├── site-level/                ← B) SITE-LEVEL — optional maintenance references ONLY
        │   ├── README.md              ←    scope disclaimer: never auto-runs per article
        │   ├── TECHNICAL-SEO.md       ← 17 · site-level audits, real access only
        │   └── INDEXING.md            ← 18 · Search Console data, real integration only
        ├── VALIDATION.md              ← 19 · the article SEO Quality Gate (40 checks, CRITICAL/WARNING/INFO)
        ├── SCORING.md                 ← 20 · weighted 0–100 scores (content / technical / overall)
        ├── GOOGLE-GUIDANCE.md         ← primary authority: Google Search Central principles
        ├── REFERENCES.md              ← third-party reference projects + license notes
        ├── schemas/                   ← JSON Schema contracts (brief, intent, keywords, report, score, cannibalization)
        ├── examples/                  ← worked content brief + full validation report
        └── fixtures/                  ← 10 test articles + inventory + expected-results.json
```

## The three scores (and why there are three)

| Score | Scale | Based on | In the article pipeline |
|---|---|---|---|
| **SEO Content Score** | 0–100 | 9 weighted categories: intent, content quality/E-E-A-T, coverage, information gain, on-page, internal links, images, schema, AI-search readiness | **Always computed** — this is the article's SEO quality score |
| **Technical SEO Score** | 0–100 | crawlability, indexation, canonicals/redirects, duplicates, site schema, broken links, mobile, Core Web Vitals | **Site-level — `NOT_MEASURABLE` (null).** Never computed during article generation; real data only, and then as maintenance context |
| **Overall SEO Health** | 0–100 + A–F | 70% content + 30% technical (content-only when technical is not measurable) | Computed on a `content-only` basis |

Scoring is **deduction-based with integrity overrides**: a fabricated statistic zeroes its category and fails the gate no matter how good the title tag is. Technical SEO can never look healthy just because title/meta/H1 are correct — it requires actually checked evidence.

## Quick start for an integrating AI agent

1. Read [`INTEGRATION.md`](./INTEGRATION.md) — it defines the single centralized pipeline and how the six CMS operations map onto it.
2. Read `skills/seo-ranking/SKILL.md` end-to-end. It is the only file that must always be in context.
3. Implement the pipeline phases as one orchestration function: **PLAN** (before writing) → **WRITE** (content-style skill) → **VALIDATE** (both gates) → **OPTIMIZE** (fix loop). Do **not** run the `site-level/` modules in this pipeline.
4. Adopt the JSON contracts in `schemas/` for the content brief, validation report, and score. Store them with the article in the CMS.
5. Respect the **Data Availability Policy** in SKILL.md everywhere: real data or `UNAVAILABLE` — never estimates dressed up as metrics.
6. Verify your implementation against `fixtures/expected-results.json`. Fixtures are the contract: keyword stuffing must FAIL, missing meta must WARN, fabricated schema must FAIL, etc.

## Relationship to the content-style-skill package

This package governs **search strategy and metadata**. Its sibling package `content-style-skill` governs the **article body** (voice, structure, readability, formatting, factual integrity). They share one object: the H1. One pipeline, both skills, all six operations:

```
SEO brief (this skill, PLAN) → article generation (content-style skill)
→ editorial gate (content-style) → SEO gate + scoring (this skill, VALIDATE)
→ optimize (both skills' fix rules) → publish → optional maintenance (this skill)
```

## Authority order

1. **Google Search Central documentation** (see `GOOGLE-GUIDANCE.md` for the canonical links) — wins all conflicts.
2. This skill's own rules — designed to be consistent with (1).
3. Third-party reference projects (see `REFERENCES.md`) — conceptual inspiration only; no code or content copied; review their licenses before reusing anything from them.

## License & source notes

- Released under the MIT License (see `LICENSE`). You may re-license derivatives as your project requires.
- Google's documentation is referenced by URL for facts and principles only; no Google text is reproduced.
- The third-party GitHub projects listed in `REFERENCES.md` were used as **conceptual references for structure**. Nothing was copied from them. Their licenses apply only to their own contents, not to this package.
- All examples and fixtures in this package are original synthetic content written for this package.
- Scoring weights and deduction percentages are opinionated defaults. Tune them at integration time; keep the schema and semantics stable so scores stay comparable over time.

## Extending

- **New schema type:** add to the mapping table in `SCHEMA.md` and required properties in the same file; extend fixtures if the type needs a failure case.
- **New validation check:** IDs continue from SEO-V41 in `VALIDATION.md`; map it to an issue type and a scoring category in the same edit.
- **Real integrations (SERP API, Search Console, CWV):** they plug into `SERP-ANALYSIS.md`, `site-level/INDEXING.md`, and `site-level/TECHNICAL-SEO.md` respectively. Each module defines exactly which fields it needs, so the integration surface is explicit. Search Console and CWV integrations feed **maintenance contexts only** — never the article pipeline.
