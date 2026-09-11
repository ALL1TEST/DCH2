# SEO Scoring — Weighted Quality Scores

> Module 20 of the seo-ranking skill · Phase: VALIDATE · Load when: pre-publish, always together with `VALIDATION.md`

> **Pipeline scope:** the article-generation gate is the **SEO Content Score + verdict**. The Technical SEO Score below is **site-level** — it is never computed during article generation (`NOT_MEASURABLE`, value `null`), and Overall SEO Health is reported on a `content-only` basis there. See `PIPELINE.md` §5 and `site-level/README.md`.

## Purpose

Turn the validation gate's findings into three comparable numbers:

1. **SEO Content Score** (0–100) — how strong the page is as search content. Always computable.
2. **Technical SEO Score** (0–100) — **site-level**, never computed during article generation: `NOT_MEASURABLE` unless real site-level data is supplied, and then only as maintenance context (the CMS's SEO dashboard owns those checks).
3. **Overall SEO Health** (0–100 + letter grade) — the blend, with its basis stated.

The scores exist to rank improvement priorities and track content over time — never to promise rankings. No scoring system can guarantee search positions, and this one explicitly refuses to fake certainty.

## Scoring philosophy

- **Deduction-based, not trivia-based.** Categories start at full weight and lose points for real issues. There is no "keyword present = +10". Presence of basics is the baseline, not an achievement.
- **Integrity overrides arithmetic.** Fabrication zeroes its category and fails the gate regardless of the remaining math.
- **Technical is separate, site-level, and evidence-gated.** Technical SEO can never look healthy because title/meta/H1 are correct — the Technical Score requires actually checked data (`site-level/TECHNICAL-SEO.md` audit or platform evidence), and it never runs as a side effect of article generation.
- **Weights are configuration, not law.** Defaults below are sensible for a content CMS; tune them at integration. Keep semantics stable so scores stay comparable across months.

## 1. SEO Content Score

### Categories and default weights (sum = 100)

| # | Category | Weight | Fed by (checks / modules) |
|---|---|---|---|
| 1 | Search Intent Alignment | 12 | SEO-V01, V02 · `SEARCH-INTENT.md` |
| 2 | Content Quality & E-E-A-T | 14 | SEO-V06–V12 · `INFORMATION-GAIN.md`, `EEAT-TRUST.md` |
| 3 | Topic Coverage | 12 | SEO-V03, V04, V20 · `TOPIC-COVERAGE.md` |
| 4 | Information Gain | 12 | SEO-V05, V07, V40 · `INFORMATION-GAIN.md` |
| 5 | On-Page SEO | 22 | SEO-V13–V21, V29, V30 · `ON-PAGE-SEO.md` |
| 6 | Internal Linking | 8 | SEO-V22, V23 · `INTERNAL-LINKING.md` |
| 7 | Image SEO | 6 | SEO-V25, V26 · `IMAGE-SEO.md` |
| 8 | Structured Data | 8 | SEO-V27, V28 · `SCHEMA.md` |
| 9 | AI Search Readiness | 6 | SEO-V36–V39 · `AI-SEARCH-GEO.md` |

### Deduction model

For each category, deduct from the full weight:

```
deduction = weight × ( 0.35 × critical_count
                     + 0.12 × warning_count
                     + 0.03 × info_count )
earned    = max(0, weight − deduction)          # capped at the weight
```

**Special-case deductions (override the formula):**

| Issue type (CRITICAL) | Effect |
|---|---|
| `intent_mismatch` | Search Intent Alignment = 0 |
| `main_question_unanswered` | Search Intent Alignment = 0 |
| `fabricated_data`, `fake_experience` | Content Quality & E-E-A-T = 0, **and verdict FAIL** |
| `keyword_stuffing` | On-Page SEO loses 50% of its weight, **and verdict FAIL** |
| `invalid_schema`, `fabricated_schema_property` | Structured Data = 0 |
| `missing_title` | On-Page SEO loses 40% of its weight |
| `low_information_gain` (CRITICAL grade) | Information Gain = 0 |

Compute with two decimals; round the final total to the nearest integer (round half up). Technical-section issues do not touch the Content Score.

### Worked example

Article: "How to Store Fresh Basil" (the `examples/` article). Issues found by the gate: one WARNING `thin_coverage` (Topic Coverage — freezing method covered too thinly), one INFO `schema_missing` opportunity (Structured Data — FAQPage possible once a FAQ block exists). No criticals; no core-field warnings.

| Category | Weight | Issues | Deduction | Earned |
|---|---|---|---|---|
| Search Intent Alignment | 12 | — | 0 | 12.00 |
| Content Quality & E-E-A-T | 14 | — | 0 | 14.00 |
| Topic Coverage | 12 | 1 WARNING | 12 × 0.12 = 1.44 | 10.56 |
| Information Gain | 12 | — | 0 | 12.00 |
| On-Page SEO | 22 | — | 0 | 22.00 |
| Internal Linking | 8 | — | 0 | 8.00 |
| Image SEO | 6 | — | 0 | 6.00 |
| Structured Data | 8 | 1 INFO | 8 × 0.03 = 0.24 | 7.76 |
| AI Search Readiness | 6 | — | 0 | 6.00 |
| **Content Score** | 100 | | | **98.32 → 98** |

## 2. Technical SEO Score

### Status first, number second

```
technical_data available  → status MEASURABLE, compute score
technical_data absent     → status NOT_MEASURABLE, score null
```

`NOT_MEASURABLE` is the honest default — and in the **article-generation pipeline it is the only state**: technical data is never fetched because an article was generated (see `PIPELINE.md` §5). It is not a zero and not a pass — it is "unknown", and the report says so.

### Categories and default weights (sum = 100, when measurable)

| # | Category | Weight | Fed by |
|---|---|---|---|
| 1 | Crawlability & robots.txt | 15 | robots.txt rules, crawlability findings |
| 2 | Sitemap & Indexation | 20 | sitemap coverage, indexation status, orphan pages |
| 3 | Canonical & Redirects | 15 | canonical correctness, redirect chains/loops |
| 4 | Duplicate Content (URL/title/meta) | 12 | duplicate detection across inventory |
| 5 | Structured Data validity (site-wide) | 10 | site-wide schema validation |
| 6 | Broken Links | 8 | internal + external link checks |
| 7 | Mobile Readiness | 10 | real mobile rendering checks |
| 8 | Core Web Vitals | 10 | **real field/lab data only** (CrUX / GSC / PageSpeed) |

**CWV without real data:** mark that category `NOT_MEASURABLE` and rescale the remaining categories proportionally to 100 (multiply each by 100 / 90). Never score CWV by assumption.

Same deduction formula as the Content Score, with technical issue types (`noindex_unintended`, `sitemap_missing_page`, `duplicate_url`, `broken_link`, `redirect_chain`, `mobile_issue`, `cwv_issue`, …). `noindex_unintended` on the audited page zeroes Sitemap & Indexation and sets verdict FAIL.

## 3. Overall SEO Health

```
if technical MEASURABLE:   overall = 0.7 × content + 0.3 × technical
else:                      overall = content           (basis: "content-only")
```

In the article-generation pipeline, technical is never measurable, so the overall is always reported on a `content-only` basis with that basis string.

| Grade | Overall |
|---|---|
| A | ≥ 90 |
| B | 80–89 |
| C | 70–79 |
| D | 60–69 |
| F | < 60 |

**The score never overrides the verdict.** A 92 with a fabricated statistic is still a FAIL (integrity override); a 92 with an unintended noindex is still a FAIL. Scores rank healthy pages against each other; the verdict decides whether the page is healthy at all.

## Score output format

Conforms to `schemas/seo-score.schema.json`:

```json
{
  "seo_content_score": {
    "value": 98,
    "categories": [
      { "name": "Search Intent Alignment", "weight": 12, "earned": 12.00,
        "deductions": [] },
      { "name": "Topic Coverage", "weight": 12, "earned": 10.56,
        "deductions": [ { "issue_type": "thin_coverage", "count": 1, "amount": 1.44 } ] }
    ]
  },
  "technical_seo_score": {
    "status": "NOT_MEASURABLE",
    "value": null,
    "categories": []
  },
  "overall_seo_health": {
    "value": 98,
    "grade": "A",
    "basis": "content-only",
    "formula": "overall = content (technical NOT_MEASURABLE)"
  }
}
```

Rules: `earned` values carry two decimals; `deductions` must reference issue types from the `VALIDATION.md` registry so a reader can trace every lost point to an actual issue; the `basis` string states exactly what the overall number rests on.

## Anti-gaming rules

1. **No metadata-only health.** A page with perfect title/meta/H1 and hollow content scores ≤ 40 (Topic Coverage, Information Gain, and Content Quality all lose their warnings-to-criticals progression).
2. **No averaging away criticals.** Criticals cap or fail the verdict regardless of score arithmetic.
3. **No score without evidence.** Every deduction traces to an issue object in the validation report; category `earned` values with no corresponding report issues are audit errors.
4. **No technical optimism.** Technical categories require checked evidence; absence of evidence is `NOT_MEASURABLE`, never a pass.
5. **Scores are not promises.** Never present a score as a ranking guarantee — internally or to users. It is a content-quality signal for prioritization.

## Failure handling

- Score and verdict disagree (e.g., 88 but verdict WARNING due to core-field warning): both are correct — report both; the verdict governs publishing.
- Category with zero issues but obviously weak content: the gate's checks missed it; note it in `next_actions` as an INFO and improve the check, don't hand-edit scores.
- Weights changed at integration: record the change in the report (`notes`) — historical comparisons across weight changes are invalid and must say so.
