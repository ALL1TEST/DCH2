# SEO Validation — The Final SEO Quality Gate

> Module 19 of the seo-ranking skill · Phase: VALIDATE · Load when: pre-publish, always together with `SCORING.md`

## Purpose

This is the last thing an article passes through before publishing. It runs 40 checks (`SEO-V01 … SEO-V40`) across four sections — Content, On-Page, Technical, AI Search — and produces the SEO validation report: a verdict plus a list of issues, each with severity, problem, why it matters, and a recommended fix.

The gate is deliberately strict about **integrity** (fabricated data, fake experience, misleading schema are CRITICAL, always) and deliberately honest about **data** (technical checks without real data are `NOT_MEASURABLE`, never failed, never guessed).

## Inputs

| Input | Source | If absent |
|---|---|---|
| `article` | CMS | Gate cannot run — hard stop |
| `content_brief` | PLAN phase (`CONTENT-BRIEF.md`) | Checks V03/V04/V05/V22 degrade to intent-level analysis; note in report |
| `intent_analysis` | PLAN phase (`SEARCH-INTENT.md`) | Derive a provisional intent inside the gate; mark `confidence: "low"` |
| `cms_inventory` | CMS | V14 (title uniqueness), V22 (internal links), V23 anchors → `UNAVAILABLE` |
| `technical_data` | real crawl / platform data | Entire Technical section → `NOT_MEASURABLE` |
| `keyword_map` | PLAN phase | V18–V20 evaluate topical alignment only |

## Issue severities

| Severity | Meaning | Publishing behavior |
|---|---|---|
| `CRITICAL` | The article is broken for search or for trust: intent mismatch, unanswered main question, stuffing, fabrication, invalid/misleading schema, missing title/H1, unintended noindex | **Blocks publishing.** Fix before anything else. |
| `WARNING` | Real deficiency that materially weakens the page: missing meta, thin coverage, no internal links, missing alt | Should fix; core-field warnings cap the verdict at WARNING (see verdict logic) |
| `INFO` | Opportunities and notes: unused snippet opportunity, OG polish, minor structure suggestions | Optional; never blocks |

## Check catalog

### Section 1 — CONTENT (12 checks)

| ID | Check | Detects | Default severity when triggered |
|---|---|---|---|
| SEO-V01 | Intent match | Article structure/content actually satisfies the classified intent (informational article answering, commercial comparing, transactional enabling purchase decision, navigational orienting) | CRITICAL (`intent_mismatch`) |
| SEO-V02 | Main question answered | The intent's `main_question` receives a direct, findable answer in the article | CRITICAL if unanswered (`main_question_unanswered`); WARNING if answered but buried |
| SEO-V03 | Topical coverage complete | All subtopics the intent implies are covered (per `TOPIC-COVERAGE.md` required list) | WARNING (`thin_coverage`); CRITICAL if a load-bearing subtopic is absent |
| SEO-V04 | Brief subtopics present | Every `required_subtopic` from the brief exists with real content | WARNING each (`missing_subtopic`) |
| SEO-V05 | Information gain sufficient | Passes the re-search test and minimum-specificity floor in `INFORMATION-GAIN.md` | WARNING (`low_information_gain`); CRITICAL when the article is generic enough that the reader must search again |
| SEO-V06 | Useful specifics | Concrete numbers/examples/decision criteria present where the topic allows | WARNING (`lacking_specificity`) |
| SEO-V07 | Original synthesis | The article adds structure/comparison/judgment beyond restating common knowledge | WARNING (`unoriginal_content`) |
| SEO-V08 | Unsupported claims absent | Claims that would need a source have none, and are not marked as estimates | CRITICAL (`unsupported_claim`) when the claim is load-bearing; WARNING otherwise |
| SEO-V09 | Fabricated data absent | Invented statistics, studies, quotes, specs, reviews, test results | **CRITICAL always (`fabricated_data`) — integrity override** |
| SEO-V10 | Fake experience absent | Fabricated firsthand experience, credentials, E-E-A-T signals | **CRITICAL always (`fake_experience`) — integrity override** |
| SEO-V11 | Readability | Delegates thresholds to content-style skill checks CS-09/10/11: paragraphs ≤150 words, ≤20% sentences >35 words, variety | WARNING (`poor_readability`) |
| SEO-V12 | E-E-A-T transparency | Author/publisher presentation is honest; limitations acknowledged; YMYL topics show appropriate caution | WARNING (`weak_eeat_transparency`) |

### Section 2 — ON-PAGE (18 checks)

| ID | Check | Detects | Default severity when triggered |
|---|---|---|---|
| SEO-V13 | SEO title present + quality | Title exists, descriptive, accurate, 15–65 chars guidance, no stuffing (`ON-PAGE-SEO.md`) | CRITICAL missing (`missing_title`); WARNING weak (`weak_title`) |
| SEO-V14 | Title uniqueness | Title not duplicated in inventory (when available) | WARNING (`duplicate_title`) |
| SEO-V15 | H1 present, single, descriptive | Exactly one H1; matches article topic; not a duplicate of body styling | CRITICAL (`missing_h1` / `multiple_h1`) |
| SEO-V16 | Meta description present + quality | Exists, page-specific, useful, natural, ~120–158 chars guidance | WARNING (`missing_meta_description` / `weak_meta_description` / `duplicate_meta_description`) — **core-field warning** |
| SEO-V17 | URL slug quality | Short, readable, descriptive, stable, lowercase-hyphenated, no parameters/session IDs | WARNING (`poor_slug`) — **core-field warning** |
| SEO-V18 | Primary keyword natural presence | Primary keyword (or close variant) appears naturally in title or H1 and in the first ~150 words | WARNING (`keyword_missing_naturally`) |
| SEO-V19 | No keyword stuffing | Density and placement heuristics in `KEYWORD-STRATEGY.md`: exact-match density > ~1%, forced exact-match headings, keyword lists in text/alt | **CRITICAL (`keyword_stuffing`)** |
| SEO-V20 | Semantic coverage | Entities and semantic keywords from the map appear through natural topical coverage | WARNING (`semantic_gap`) |
| SEO-V21 | Heading quality | Headings descriptive, parallel, no skipped levels, questions phrased as users ask them | WARNING (`weak_headings`) |
| SEO-V22 | Internal links | Contextual links to relevant inventory pages (2–6 guidance, length-proportional); backlink suggestions emitted | WARNING when inventory available and links absent (`missing_internal_links`); `UNAVAILABLE` otherwise |
| SEO-V23 | Anchor text natural | Anchors descriptive and varied, not exact-match-spam | WARNING (`weak_anchor_text`) |
| SEO-V24 | External citations | Load-bearing claims/statistics link to authoritative primary sources | WARNING (`missing_external_sources`) |
| SEO-V25 | Images useful + placed | Images serve comprehension (demonstrative/instructive) and sit near the relevant text | WARNING (`image_not_useful`) |
| SEO-V26 | Alt text quality | Present, describes the actual image, no keyword stuffing, ≤ ~125 chars | WARNING (`missing_alt_text` / `stuffed_alt_text`) — **core-field warning** |
| SEO-V27 | Schema present + type correct | Applicable schema type present and matches visible content (mapping in `SCHEMA.md`) | WARNING (`schema_missing` / `schema_type_mismatch`) |
| SEO-V28 | Schema valid + honest | Valid JSON-LD, required properties present, no fabricated reviews/ratings/prices/authors/dates | **CRITICAL (`invalid_schema` / `fabricated_schema_property`)** — **core-field** |
| SEO-V29 | Canonical | Self-referencing canonical on the final URL; param variants handled (platform-supported only) | WARNING (`canonical_missing` / `canonical_conflict`) |
| SEO-V30 | OG metadata | og:title/og:description/og:image when the platform supports them | INFO (`og_missing`) |

### Section 3 — TECHNICAL (5 checks — real data only; SITE-LEVEL)

> **These are site-level maintenance checks, not article-generation checks.** They never auto-run when an article is generated, regenerated, edited, or bulk-produced — robots.txt, sitemap, crawl, and CWV audits belong to the CMS's own SEO dashboard (see `PIPELINE.md` §5 and `site-level/README.md`). In the per-article pipeline this entire section is `NOT_MEASURABLE` and contributes no issues. It activates only in an explicit maintenance context with real `technical_data`.

The whole section is `NOT_MEASURABLE` without `technical_data`. **Never infer technical health from correct title/meta/H1.**

| ID | Check | Detects | Default severity when triggered |
|---|---|---|---|
| SEO-V31 | Indexable | Page not unintentionally noindexed (robots meta / X-Robots-Tag / robots.txt) | CRITICAL (`noindex_unintended`) |
| SEO-V32 | In sitemap | URL present in sitemap.xml, canonicalized form matches | WARNING (`sitemap_missing_page`) |
| SEO-V33 | Duplicates | No duplicate URL/title/meta collisions in inventory | WARNING (`duplicate_url` / `duplicate_title`); CRITICAL if exact URL duplicate |
| SEO-V34 | Redirects + broken links | No redirect chains/loops; no broken internal/external links | WARNING (`redirect_chain` / `broken_link`); CRITICAL on redirect loop |
| SEO-V35 | Mobile + CWV | Real Core Web Vitals field/lab data (CrUX, GSC, PageSpeed) and mobile rendering | WARNING (`cwv_issue` / `mobile_issue`) — data required; no data → `NOT_MEASURABLE`, not PASS |

### Section 4 — AI SEARCH (5 checks)

| ID | Check | Detects | Default severity when triggered |
|---|---|---|---|
| SEO-V36 | Direct answer near top | A concise, self-contained answer to the main question appears early (first ~150 words or first section) | WARNING (`no_direct_answer`) |
| SEO-V37 | Entity clarity | Primary entities named unambiguously and consistently; first mention defined when obscure | WARNING (`unclear_entities`) |
| SEO-V38 | Factual clarity | Numbers, units, dates, and conditions stated explicitly ("5–7 days at room temperature", not "a while") | WARNING (`factual_ambiguity`) |
| SEO-V39 | Machine-legible structure | Headings/questions/lists/tables make the key facts extractable | WARNING (`weak_structure_for_ai`) |
| SEO-V40 | Unique information | Content offers at least one fact/synthesis/comparison an AI engine could cite as distinct | WARNING (`no_unique_information`) |

## Canonical issue-type registry

Reports, fixtures, and `expected-results.json` use exactly these `type` values (extend only via SEO-V41+):

```
intent_mismatch · main_question_unanswered · thin_coverage · missing_subtopic ·
low_information_gain · lacking_specificity · unoriginal_content · unsupported_claim ·
fabricated_data · fake_experience · weak_eeat_transparency · poor_readability ·
missing_title · weak_title · duplicate_title · missing_h1 · multiple_h1 ·
missing_meta_description · weak_meta_description · duplicate_meta_description ·
poor_slug · keyword_missing_naturally · keyword_stuffing · semantic_gap · weak_headings ·
missing_internal_links · weak_anchor_text · missing_external_sources · image_not_useful ·
missing_alt_text · stuffed_alt_text · schema_missing · schema_type_mismatch · invalid_schema ·
fabricated_schema_property · canonical_missing · canonical_conflict · og_missing ·
noindex_unintended · sitemap_missing_page · duplicate_url · broken_link · redirect_chain ·
mobile_issue · cwv_issue · no_direct_answer · unclear_entities · factual_ambiguity ·
weak_structure_for_ai · no_unique_information · cannibalization_high · cannibalization_medium ·
cannibalization_low · outdated_content · intent_drift · weak_title_meta_refresh
```

## Issue object (obligatory fields — no exceptions)

```json
{
  "type": "missing_meta_description",
  "severity": "WARNING",
  "check": "SEO-V16",
  "location": "article metadata",
  "problem": "No meta description is set; the CMS will render an empty snippet field",
  "why_it_matters": "Search engines will auto-generate a snippet from arbitrary body text, reducing click-through control on the result page",
  "recommended_fix": "Write a 120–158 character page-specific description that states the direct answer and the three storage methods"
}
```

Every issue must answer all four questions: what is wrong, where, why it matters to search or readers, and what to do. `why_it_matters` may never be boilerplate — if you cannot articulate the impact, it is an INFO note, not an issue.

## Verdict logic

```
FAIL     if any CRITICAL issue
         or SEO Content Score < 70            (see SCORING.md)
         or (technical measurable AND Technical Score < 40)

WARNING  if no CRITICAL and
         ( Content Score 70–84
           or any core-field WARNING          (V16 meta, V17 slug, V26 alt, V28 schema validity)
           or (technical measurable AND Technical Score < 70) )

PASS     if Content Score ≥ 85, no CRITICAL, no core-field WARNING,
         and (technical NOT_MEASURABLE or Technical Score ≥ 70)
```

Core-field warnings exist because a page with a broken meta, slug, alt, or schema is a page with a real defect even when its content scores well — the verdict must surface it.

## Report format

Conforms to `schemas/seo-validation-report.schema.json`; worked instance in `examples/seo-validation-report-example.json`.

```json
{
  "skill": "seo-ranking",
  "skill_version": "1.0.0",
  "generated_at": "2025-01-15T10:30:00Z",
  "article": { "title": "", "slug": "", "url": null, "word_count": 0, "primary_keyword": "" },
  "intent": { "primary_intent": "informational", "main_question": "", "confidence": "high" },
  "verdict": "PASS",
  "sections": {
    "content":   { "checks_run": ["SEO-V01"], "issue_count": 0 },
    "on_page":   { "checks_run": ["SEO-V13"], "issue_count": 1 },
    "technical": { "status": "NOT_MEASURABLE", "checks_run": [], "issue_count": 0 },
    "ai_search": { "checks_run": ["SEO-V36"], "issue_count": 0 }
  },
  "issues": [ { "...": "issue object above" } ],
  "scores": { "content_score": 98, "technical_score": null,
              "technical_status": "NOT_MEASURABLE",
              "overall": { "value": 98, "grade": "A", "basis": "content-only" } },
  "data_availability": { "serp_data": false, "search_console": false,
                         "cms_inventory": true, "technical_access": false },
  "next_actions": [ "Publish", "Later: add FAQPage schema when FAQ block exists" ]
}
```

## Failure handling

- **FAIL:** fix CRITICAL issues first — they cluster around intent (V01/V02), integrity (V08/V09/V10), stuffing (V19), and schema honesty (V28). Re-run the full gate after fixes.
- **Cannibalization HIGH** (from `CANNIBALIZATION.md`, type `cannibalization_high`): blocks the *new* article before this gate even runs — resolve via improve/merge/change-intent/change-angle first.
- **`UNAVAILABLE` inputs:** run the gate on what exists; record every unavailable input in `data_availability`. Never substitute invented values, and never fail a check for missing data — mark it.
- **No brief:** acceptable for legacy content; derive provisional intent in-gate, lower confidence, note it.

## Fixture harness (for implementers)

`fixtures/expected-results.json` is the behavioral contract:

| Fixture | Expected verdict | Key expected issue types |
|---|---|---|
| `good-article.md` | PASS | `thin_coverage` (minor), `schema_missing` (INFO-level opportunity) |
| `keyword-stuffing.md` | FAIL | `keyword_stuffing` (CRITICAL) |
| `weak-intent-match.md` | FAIL | `intent_mismatch` (CRITICAL) |
| `cannibalized-topic.md` (+ `cms-inventory.json`) | FAIL at PLAN (cannibalization HIGH) | `cannibalization_high` |
| `missing-title.md` | FAIL | `missing_title`, `missing_h1` |
| `missing-meta.md` | WARNING | `missing_meta_description` (core-field) |
| `poor-slug.md` | WARNING | `poor_slug` (core-field) |
| `invalid-schema.md` | FAIL | `invalid_schema`, `fabricated_schema_property` (CRITICAL) |
| `unsupported-claims.md` | FAIL | `fabricated_data` / `unsupported_claim` (CRITICAL) |
| `insufficient-info-gain.md` | FAIL | `low_information_gain`, `thin_coverage` |

An implementation is conformant when it reproduces every expected verdict and cites the expected issue types.
