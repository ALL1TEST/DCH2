---
name: content-style
description: >
  INTERNAL ARTICLE-PIPELINE SKILL — must auto-activate whenever the CMS AI
  generates, regenerates, edits, improves, expands, or bulk-produces article
  body content. Governs editorial voice, article structure, niche-aware
  formatting, human-like writing flow, factual integrity, and article depth,
  and runs the editorial quality gate (PASS/WARNING/FAIL) on every draft
  before it reaches the CMS editor. Invisible to end users — no frontend
  surface required or permitted. Do NOT use it for SEO metadata, keyword
  strategy, structured data, or technical audits (handled by the seo-ranking
  skill), and do not use it for UI copy or code.
version: 1.1.0
license: MIT
---

# Content Style Skill

## 1. What this skill does

This skill is the **editorial brain** for AI-generated content in a CMS. It does not decide *what* to write about (that is the seo-ranking skill's brief) — it decides *how well* the article is written:

- People-first writing with natural human editorial flow
- Strong, specific introductions that get to the point quickly
- Niche-aware article structure (skeletons adapt to the topic)
- Contextual formatting — tables, lists, and callouts only when they help the reader
- Human-like prose without repetitive AI patterns
- Zero fabrication of facts, experts, quotes, statistics, or experience
- A deterministic quality gate (30 checks) with PASS / WARNING / FAIL verdicts

The skill is global. Every content-producing workflow in the CMS loads the same rules with the same gate. Bulk and automation workflows are **never** given a relaxed gate — scaled production is exactly where quality control matters most.

## 2. What this skill is — internal pipeline infrastructure

This skill is not a frontend feature and not a dashboard. It is the **editorial half of the CMS's article-generation pipeline**: it fires automatically on every article operation, writes under the SEO brief's direction, validates the draft before it is saved/published, and hands the CMS editor a finished article plus an editorial report.

- **Auto-activation.** No manual trigger exists. Every article-producing workflow (§3 table below) runs this skill without asking.
- **Invisible execution.** Skill internals — modules, checks, prompts, phase logs — never surface in the UI. The CMS may surface final results only: content-quality warnings (plus the SEO score/warnings/title/meta/slug produced by the seo-ranking skill).
- **One pipeline.** All six CMS article operations call the same centralized pipeline — there are not six implementations. The runtime contract is `PIPELINE.md`; the wiring guide for the integrating agent is the package-root `INTEGRATION.md`.
- **Pipeline position.** Phase 2 (WRITE) — this skill generates the article under the SEO brief — and Phase 3a (EDITORIAL VALIDATE) — this skill runs the 30-check gate. The seo-ranking skill owns Phase 1 (PLAN) and Phase 3b/4 (SEO VALIDATE / OPTIMIZE).

## 3. Scope — where this skill applies

| CMS workflow | Applies? | Mode |
|---|---|---|
| Manual article generation | Yes | Full skill: classify → structure → draft → validate |
| AI ideas (idea descriptions, titles, teasers) | Yes | Light mode: intro/title quality rules; full gate only when an idea becomes an article |
| Article regeneration (full rewrite) | Yes | Full skill + anti-repetition comparison against the original |
| Article editing (partial changes) | Yes | Edit mode: validate full article, focus fixes on changed sections |
| Automation article generation | Yes | Full skill, batch validation, identical gate |
| Bulk article generation | Yes | Full skill, batch validation, identical gate |
| Future AI content workflows | Yes | Same contract: inputs in (§5), outputs out (§9), gate enforced |

## 4. When NOT to use this skill

- **SEO metadata** (title tag, meta description, slug, canonical, schema): belongs to the `seo-ranking` skill. Exception: the H1 is shared — this skill governs its editorial quality, seo-ranking governs its keyword alignment. They are usually the same or very similar string.
- **UI copy, navigation, buttons, system messages:** not article content.
- **Code, configuration, or documentation generation.**
- **User-generated content:** validate only if it passes through an AI rewriting step.
- **Site-level technical SEO:** not this skill's domain at all — the CMS's existing SEO section owns it, and the seo-ranking package's `site-level/` references never auto-execute.

## 5. Required inputs

| Input | Required | Notes |
|---|---|---|
| `topic` | Yes | What the article is about |
| `content_type` | Yes | One of: how-to, comparison, buying-guide, listicle, review, informational, recipe, news, other (drives archetype selection) |
| `niche` | Yes | One of the 13 verticals in `NICHE-PATTERNS.md`, or `general` |
| `audience` | Recommended | Who is reading; defaults to an interested beginner unless the topic implies expertise |
| `tone` | Optional | e.g. warm, neutral, technical; defaults to the niche's default tone in `NICHE-PATTERNS.md` |
| `target_word_count` | Optional | A target, never a mandate to pad (see EP-09) |
| `existing_draft` | Edit/regeneration mode only | The current article |
| `source_material` | Optional | Notes, research, product data, or keyword brief provided by the CMS or the seo-ranking skill. When present, factual claims MUST stay within it (see `FACTUAL-INTEGRITY.md`). In the standard pipeline this is the SEO Content Brief — see `PIPELINE.md` |

## 6. Processing workflow

Follow these seven steps, in order, for every article. Load the listed module only when you reach the step that needs it (progressive disclosure — do not preload everything).

```
Step 1  CLASSIFY      → content type + niche + audience
                        Read: NICHE-PATTERNS.md (Parts A and B)
Step 2  SKELETON      → select the section skeleton for (vertical × archetype)
                        Read: NICHE-PATTERNS.md, STRUCTURE.md
Step 3  OUTLINE       → order sections by reader need; every section earns its place
                        Read: STRUCTURE.md
Step 4  DRAFT         → intro, body, conclusion
                        Read: EDITORIAL-PRINCIPLES.md, WRITING-QUALITY.md,
                              FACTUAL-INTEGRITY.md, FORMATTING.md
Step 5  SELF-REVIEW   → sweep for AI patterns, repetition, filler, padding
                        Read: WRITING-QUALITY.md (detection procedures)
Step 6  VALIDATE      → run the 30-check quality gate
                        Read: VALIDATION.md
Step 7  OUTPUT        → article + editorial validation report (§9)
```

Steps 1–5 are **Phase 2 (WRITE)** of the shared pipeline; Steps 6–7 are **Phase 3a (EDITORIAL VALIDATE)**. If the article already exists (edit/regeneration mode), start at Step 1 to re-classify, then jump to the sections that change, then run Steps 5–7 on the whole article.

## 7. Module map

| File | Rule prefix | Load when | Covers |
|---|---|---|---|
| `PIPELINE.md` | — | Wiring / phase questions | The shared runtime contract: phases, six operations → one pipeline, scope boundaries |
| `EDITORIAL-PRINCIPLES.md` | EP-xx | Step 4 (always) | People-first rules, intro strength, depth, tone, word-count policy, conclusions |
| `STRUCTURE.md` | ST-xx | Steps 2–3 (always) | Heading hierarchy, section ordering, intro/conclusion patterns, formatting decision framework |
| `NICHE-PATTERNS.md` | NP-xx | Steps 1–2 (always) | 13 verticals × 6 archetypes skeletons with critical vs. recommended sections |
| `WRITING-QUALITY.md` | WQ-xx | Steps 4–5 (always) | Voice, sentence/paragraph rules, AI-pattern detection, repetition detection, specificity |
| `FACTUAL-INTEGRITY.md` | FI-xx | Step 4 (always) | Fabrication blacklist, claims taxonomy, hedging, source-material boundaries |
| `FORMATTING.md` | FM-xx | Step 4 (always) | Element-by-element rules: lists, tables, callouts, steps, pros/cons, emphasis |
| `VALIDATION.md` | CS-01…CS-30 | Step 6 (always) | The quality gate: detection methods, thresholds, verdict logic, report format |
| `examples/` | — | On demand | 6 PASS-level reference articles (recipe, how-to, comparison, listicle, buying guide, informational) |
| `fixtures/` | — | Testing only | 6 flawed articles + `expected-results.json` (the implementation contract) |

## 8. Core rules (non-negotiable summary)

These are the twelve rules that override everything else. Each is expanded with full detail and detection procedures in its module.

1. **People-first.** Write for the reader with the question, not for a word count or an algorithm. (EP-01)
2. **Get to the point.** The introduction must deliver specifics and promise real value within the first two sentences. No throat-clearing. (EP-03, CS-01)
3. **No generic AI openers.** "In today's world…", "Whether you're a beginner or a pro…", "Look no further…" are removed on sight. (WQ-07, CS-02)
4. **One H1, no skipped levels, descriptive headings.** (ST-01…ST-04, CS-04/05)
5. **Structure follows the niche skeleton.** Critical sections (e.g., ingredients for a recipe, steps for a how-to) are mandatory. (NP-xx, CS-07)
6. **Formatting is contextual.** Use a table/FAQ/pros-cons/list/H3 only when it improves the reader's experience. Never force, never forbid. (FM-01, CS-08)
7. **No filler, no repetition, no padding.** Every paragraph earns its place; never expand artificially to hit a word count. (EP-09, WQ-10, CS-20/21/22)
8. **Zero fabrication.** No invented experts, quotes, statistics, studies, specs, certifications, reviews, test results, or personal experience. Missing info is omitted or stated as unavailable. (FI-01, CS-23/24 — automatic FAIL)
9. **Specific over generic.** Concrete numbers, names, and examples instead of vague claims. (WQ-13, CS-18)
10. **Natural conclusions.** No "In conclusion" opener; end with useful wrap-up or next steps. (EP-11, CS-26/27)
11. **Respect the configured word count within tolerance — or deliver short.** An article under target that says everything beats a padded one. Flag shortfalls in the report instead of padding. (EP-09, CS-22)
12. **The gate is final.** FAIL means revise before publish. No workflow may bypass validation — including bulk and automation. (VALIDATION.md)

## 9. Outputs

### 9.1 Article body

Clean Markdown, ready for CMS ingestion:

- Exactly one H1; H2/H3 for sections; no skipped heading levels
- Supported elements: paragraphs, bullet lists, numbered lists, tables, comparison tables, callouts (`> **Note:**`, `> **Warning:**`, `> **Tip:**`), examples, step-by-step instructions, pros/cons, summaries — used contextually per `FORMATTING.md`
- No HTML unless the CMS requires it; no emoji; no author-voice claims of firsthand experience the AI does not have

### 9.2 Editorial validation report (JSON)

Always produced with the article. Full field reference and check catalog: `VALIDATION.md`.

```json
{
  "skill": "content-style",
  "skill_version": "1.1.0",
  "validated_at": "<ISO-8601>",
  "article_ref": { "title": "", "slug": "", "workflow": "manual|ideas|regeneration|editing|automation|bulk" },
  "verdict": "PASS | WARNING | FAIL",
  "checks": [
    { "id": "CS-01", "name": "Introduction strength", "result": "PASS|WARNING|FAIL", "evidence": "<one sentence: what was found>" }
  ],
  "issues": [
    { "id": "CS-14", "result": "WARNING", "location": "<section/paragraph>", "problem": "", "fix": "" }
  ],
  "stats": { "word_count": 0, "target_word_count": null, "h2_count": 0, "h3_count": 0,
             "avg_sentence_words": 0.0, "avg_paragraph_sentences": 0.0 },
  "notes": ["e.g. delivered 640 words against 800 target without padding — shortfall flagged, not filled"]
}
```

These are internal artifacts stored with the article. The CMS may surface the content-quality warnings in its UI; everything else stays invisible (package-root `INTEGRATION.md` §6).

## 10. Validation gate semantics

| Verdict | Meaning | Publishing behavior |
|---|---|---|
| `PASS` | No check failed; at most INFO-level notes | Publish |
| `WARNING` | One or more checks warn, none fail | May publish, attach the report; fixes recommended |
| `FAIL` | Any check returned FAIL (fabrication, structural break, severe padding/repetition) | **Do not publish.** Revise targeted issues, re-run the gate |

Fabrication (CS-23, CS-24) is an unconditional FAIL regardless of everything else in the article. Full aggregation logic and per-check severity: `VALIDATION.md`.

## 11. Failure handling

- **Gate FAIL:** revise only the flagged issues (do not rewrite the whole article unless CS-30 also fails), then re-validate. Never auto-publish a FAIL. Never silently downgrade a FAIL to WARNING to unblock a queue.
- **Missing input:** if `content_type` or `niche` cannot be determined, ask or infer conservatively (`informational` / `general`) and record the assumption in the report notes.
- **Conflicting instructions:** if a CMS workflow asks for something that violates a core rule (e.g., "hit 1500 words no matter what"), follow the core rule and report the conflict. Rule 7 and rule 8 are not negotiable by workflows.
- **Regeneration drift:** when regenerating, compare against the original for repeated sentence patterns; regeneration that reproduces the original's shape fails CS-15 even if the words differ.

## 12. Integration guide for AI agents

The complete wiring guide is the package-root `INTEGRATION.md`. The short version:

**One centralized pipeline function, called from all six CMS article operations** (manual generation, AI ideas, automation, regenerate, edit/improve, bulk). This skill supplies two layers to that function:

1. **A generation layer** — load SKILL.md plus the modules for the current step into the system prompt of the content-generating LLM call (the load map in §7).
2. **A validation layer** — a separate call that receives only the finished article plus `VALIDATION.md`, executes the 30 checks, and emits the report JSON. Separating generation from validation keeps the gate honest; the generator should not grade itself in the same context.

**Per-operation wiring (mode flags on the one pipeline — not separate implementations):**

| Workflow | Generation layer | Validation layer |
|---|---|---|
| Manual generation | SKILL.md + all modules by step | Full gate, blocking |
| AI ideas | EP/WQ title & intro rules only | No gate (ideas are not articles) |
| Regeneration | Full skill + original article in context | Full gate + CS-15 comparison vs. original |
| Editing / improve | Full skill, changed sections in focus | Full gate on the whole article |
| Automation / bulk | Full skill per article | Full gate per article, batched reports; FAIL quarantines the item |

**Handoff with the seo-ranking skill:** the SEO content brief (from `seo-ranking` PLAN phase) arrives as `source_material`. Generate with this skill, pass the editorial gate, then hand the article + brief to the seo-ranking VALIDATE phase. Do not let either skill's rules override the other's domain — editorial style here, search strategy there, H1 shared.

**Calibration:** `fixtures/expected-results.json` is the behavioral contract for any implementation. Disagreement with a fixture means the implementation is wrong.

## 13. Conventions

- Rule IDs: `EP-`, `ST-`, `NP-`, `WQ-`, `FI-`, `FM-` prefixes in modules; `CS-01…CS-30` reserved for validation checks. New checks start at CS-31.
- RFC 2119 language: MUST/SHOULD/MAY. Where a rule looks rigid, the module explains why — thresholds exist so the gate is testable, not because prose is arithmetic.
- The fixtures in `fixtures/expected-results.json` are the behavioral contract for any implementation. Disagreement with a fixture means the implementation is wrong.

## 14. Version

- 1.1.0 — architecture relabel: internal auto-activating article-pipeline skill; pipeline position formalized (Phase 2 WRITE + Phase 3a EDITORIAL VALIDATE) via `PIPELINE.md`; six CMS operations unified onto one centralized pipeline (package-root `INTEGRATION.md`); invisibility and UI-surfacing policy made explicit. No changes to check IDs, verdict semantics, or the report format.
- 1.0.0 — initial release. Breaking changes to check IDs, verdict semantics, or the report format require a version bump.
