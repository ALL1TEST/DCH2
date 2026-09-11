# Content Style Skill

**Version:** 1.1.0 · **Status:** Production-ready · **License:** MIT · **Type:** Standalone AI Agent Skill package

A reusable, niche-agnostic AI Agent Skill that controls the **editorial quality, structure, readability, and presentation** of AI-generated article content inside a CMS.

It is written to be loaded and executed by an AI coding/content agent (for example Google Antigravity, Claude Code, or any LLM-driven pipeline), not by a human editor. Every file is an instruction set, a rule catalog, or a test fixture — there is no runtime code to install, and no dependency on any specific CMS, language, or framework.

> **This is internal pipeline infrastructure.** It is not a frontend feature and not a dashboard. It auto-activates on every article operation (generate, regenerate, edit/improve, expand, bulk), stays invisible to end users, and requires no new CMS pages. See [`INTEGRATION.md`](./INTEGRATION.md) for the wiring contract.

---

## What problem this solves

AI-generated articles fail readers in predictable ways: throat-clearing introductions, filler padded to hit a word count, repeated sentence shapes, fake statistics, forced FAQs and tables that add no value, and conclusions that say nothing. Left unchecked, this produces the exact "mass-produced, low-value" content pattern that search engines and readers reject.

This skill turns editorial judgment into a **deterministic, testable contract**:

- A **7-step editorial workflow** the agent follows every time content is created or revised.
- **7 reference modules** covering principles, structure, niche patterns, writing quality, factual integrity, formatting, and validation.
- **30 validation checks (CS-01 … CS-30)** with explicit thresholds and a **PASS / WARNING / FAIL** quality gate.
- **6 worked example articles** and **6 failure fixtures with expected verdicts** so the implementation can be calibrated and regression-tested.

## The article generation pipeline

This skill pairs with the sibling `seo-ranking-skill` (search strategy and metadata) in one centralized pipeline — the same function called by all six CMS article operations (manual generation, AI ideas, automation, regenerate, edit/improve, bulk):

```
Article request → PHASE 1 · PLAN [seo-ranking: intent → keywords → topic mapping
→ brief] → PHASE 2 · WRITE [THIS SKILL, governed by the brief] →
PHASE 3 · VALIDATE [editorial gate (THIS SKILL) + SEO gate] → PHASE 4 · OPTIMIZE
[fix loop, max 2 iterations] → final article + score + warnings → CMS editor / publish
```

Full runtime contract: [`skills/content-style/PIPELINE.md`](./skills/content-style/PIPELINE.md). Wiring guide for the integrating agent: [`INTEGRATION.md`](./INTEGRATION.md).

## Package structure

```
content-style-skill/
├── README.md                        ← you are here (package overview + architecture)
├── INTEGRATION.md                   ← wiring guide: six CMS operations → ONE pipeline
├── LICENSE                          ← MIT
└── skills/
    └── content-style/
        ├── SKILL.md                 ← ENTRY POINT: purpose, scope, workflow, outputs, gate, integration
        ├── PIPELINE.md              ← runtime contract: phases, six operations, scope boundaries
        ├── EDITORIAL-PRINCIPLES.md  ← people-first writing rules (EP-xx)
        ├── STRUCTURE.md             ← article anatomy + heading hierarchy rules (ST-xx)
        ├── NICHE-PATTERNS.md        ← 13 verticals × 6 archetypes structure skeletons (NP-xx)
        ├── WRITING-QUALITY.md       ← human-voice rules + AI-pattern detection (WQ-xx)
        ├── FACTUAL-INTEGRITY.md     ← anti-fabrication rules (FI-xx)
        ├── FORMATTING.md            ← contextual use of lists/tables/callouts (FM-xx)
        ├── VALIDATION.md            ← 30-check quality gate + editorial report format (CS-xx)
        ├── examples/                ← 6 PASS-level reference articles
        └── fixtures/                ← 6 intentionally flawed articles + expected-results.json
```

## Quick start for an integrating AI agent

1. Read [`INTEGRATION.md`](./INTEGRATION.md) — it defines the single centralized pipeline and how the six CMS operations map onto it.
2. Read `skills/content-style/SKILL.md` end-to-end. It is the only file that must always be in context.
3. Load reference modules **progressively** — only the ones the current workflow step needs (SKILL.md contains the load map). For example, a recipe article needs `NICHE-PATTERNS.md`; an edit-only workflow may skip it.
4. Wire the skill into the **one centralized pipeline** called by every content-producing operation: manual generation, AI ideas, regeneration, editing, automation, and bulk generation. The rules are identical everywhere — bulk/automation never get a relaxed gate.
5. Wire the **validation gate** as a separate call after generation: article must be revised before publishing on `FAIL`; `WARNING` may publish with the editorial report attached.
6. Verify your implementation against `fixtures/expected-results.json`. If your validator returns a different verdict on any fixture, your implementation is wrong — the fixtures are the contract.

## The contract in one table

| | |
|---|---|
| **Input** | topic, content type, niche, target word count (optional), audience, tone, existing draft (edit mode), source material (the SEO brief from the seo-ranking skill) |
| **Output** | article body in Markdown + editorial validation report (JSON: verdict, per-check results, issues, fixes) |
| **Gate** | `PASS` → publish · `WARNING` → publish with report · `FAIL` → revise, do not publish |
| **Hard rules** | no fabricated facts/experts/quotes/stats/experience · single H1 · no padding to hit word count · formatting only when it helps the reader |

## Design principles

1. **People-first.** Content exists to help a specific reader with a specific question. Every rule serves that.
2. **Niche-aware, niche-agnostic.** One rule set; structure adapts via `NICHE-PATTERNS.md` (vertical × archetype matrix), so adding a new vertical never changes the core skill.
3. **Contextual, not mechanical.** Banned-phrase detection is positional and frequency-based, not a blind word blacklist. A table is used when a comparison serves the reader — never forced, never forbidden.
4. **No fabrication, ever.** Missing information is omitted or stated as unavailable. Fabrication is an automatic `FAIL`.
5. **Word count is a target, not a god.** Respect the configured target within tolerance; never pad. A short useful article beats a long padded one.
6. **Testable.** Every check has an ID, a detection method, and thresholds. Fixtures define expected behavior.

## Relationship to the seo-ranking-skill package

This package governs the **article body** (voice, structure, formatting, integrity). Its sibling package `seo-ranking-skill` governs **search strategy and metadata** (intent, keywords, title/meta/slug, links, schema, scoring). They share one object: the H1. One pipeline, both skills, all six operations:

```
SEO brief (seo-ranking, PLAN) → article generation (THIS SKILL) → editorial gate (THIS SKILL)
→ SEO gate + scoring (seo-ranking, VALIDATE) → optimize (both skills' fix rules) → publish
```

## License & source notes

- Released under the MIT License (see `LICENSE`). You may re-license derivatives as your project requires.
- The skill is **inspired conceptually** by the general editorial patterns of high-quality public publishers (cooking, home, finance, tech, gaming, and similar). No text, templates, branding, or proprietary style guides were copied. All examples and fixtures in this package are original synthetic content written for this package.
- Validation thresholds are defaults. They are safe to tune at integration time as long as check IDs and verdict semantics stay stable.

## Extending

- **New vertical:** add a section to `NICHE-PATTERNS.md` (reader goal, skeleton, rules, pitfalls). No other file changes.
- **Stricter gate:** raise thresholds in `VALIDATION.md`; never invent new check IDs that collide with CS-01…CS-30.
- **New element type (e.g., videos):** extend `FORMATTING.md` and add checks to `VALIDATION.md` with IDs starting at CS-31.
