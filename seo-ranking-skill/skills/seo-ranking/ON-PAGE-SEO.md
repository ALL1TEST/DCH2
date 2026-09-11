# On-Page SEO

> Module 08 of the seo-ranking skill · Phase: WRITE · Load when: any on-page field is being written or reviewed — SEO title, H1, meta description, URL slug, keyword placement, headings, canonical, OG metadata

## Purpose

Define the field-by-field on-page rules: what each metadata and structural element must do to serve the page's actual content and the searcher's intent. This is the largest WRITE-phase rule set because it covers every field the page controls — title, H1, meta description, slug, keyword placement, headings, plus the canonical and OG defaults, with pointers to the dedicated modules for links, images, and schema.

WHY: every field here is a promise about the page. A title that misdescribes the content, a slug that leaks parameters, a meta description that spams keywords — each breaks a promise to either the searcher or the crawler. Google's guidance for these fields is consistent and public: be accurate, be descriptive, be unique, and do not stuff. The rules below make that guidance operational.

Character counts are guidelines tied to pixel-based truncation, not laws — alignment and accuracy outrank any number in this module.

## Inputs

| Input | Required | If absent |
|---|---|---|
| Draft article (title, H1, slug, meta description, body, headings) | Yes | Nothing to apply rules to |
| `keyword_map` | Yes | Placement rules (SEO-OP-15/16) have no referent |
| `intent_analysis` / `content_brief` | Ideally | Title/H1 accuracy is judged against the brief's main question; without it, judge against the draft's own stated subject |
| `cms_inventory` | No | Title uniqueness (SEO-OP-01) degrades to `UNAVAILABLE` at check SEO-V14 — never guessed |
| Platform capabilities (canonical, OG support) | No | Apply the default in SEO-OP-21/22 and note the platform limitation |

## Procedure

1. Read the draft's current on-page fields: SEO title, H1, meta description, slug, heading structure, body opening.
2. Check the SEO title against SEO-OP-01..05 (presence, descriptiveness, length, uniqueness, brand suffix).
3. Check the H1 against SEO-OP-06/07 (single, descriptive, honest relationship to the title).
4. Check the meta description against SEO-OP-08..11 (present, unique, useful, natural, length).
5. Check the slug against SEO-OP-12..14 (short, readable, stable, clean, undated).
6. Check keyword placement against SEO-OP-15/16 and the anti-stuffing thresholds in `KEYWORD-STRATEGY.md`.
7. Check headings against SEO-OP-17 (descriptive, hierarchy, user phrasing).
8. Verify links, images, and schema through their own modules (`INTERNAL-LINKING.md`, `EXTERNAL-LINKING.md`, `IMAGE-SEO.md`, `SCHEMA.md`) — SEO-OP-18/19/20.
9. Verify canonical (SEO-OP-21) and OG metadata (SEO-OP-22) against platform support.
10. Emit the on-page findings; every violation names its rule, its check ID, and the fix.

## Rules

### SEO title

**SEO-OP-01 — Title present and unique.** Every page MUST have an SEO title, and it MUST be unique within the site. Duplicated titles are checked at SEO-V14 when inventory data exists; without inventory, uniqueness is `UNAVAILABLE` — never assumed.

**SEO-OP-02 — Descriptive, concise, accurate, relevant.** The title MUST describe the page's actual content — what the article genuinely delivers — and stay relevant to the query it targets. A title promising "11 methods" for an article with 4 is a broken promise regardless of click-through. "Concise" means it says the thing, not that it hits a number.

**SEO-OP-03 — Length guidance, honestly framed.** Target ~50–60 characters; review anything over ~65; take a hard look at anything over ~70. Google truncates by pixel width, not character count, so these are guidelines, not limits — a 68-character title that reads cleanly beats a mangled 59-character one. Accuracy and natural language outrank the count.

**SEO-OP-04 — No stuffing in the title.** The title MUST NOT repeat the keyword or stack variants ("How to Store Fresh Basil: Basil Storage Tips for Storing Basil"). One natural occurrence (or a close variant) plus the actual differentiator is the ceiling; keyword stuffing here feeds the CRITICAL check SEO-V19.

**SEO-OP-05 — Brand suffix optional, at the end.** A brand suffix MAY be appended, separated by a pipe or dash, at the end ("How to Store Fresh Basil | HerbGuides"). It is optional; when space is tight, the descriptive part wins and the brand is dropped.

Bad / Good:

```
Bad:  Basil Storage - How To Store Basil - Basil Storage Tips - Store Fresh Basil
      (variant-stacked, stuffed, ~66 chars of noise)
Good: How to Store Fresh Basil So It Lasts for Weeks
      (accurate, natural, ~48 chars, states the payoff)
```

### H1

**SEO-OP-06 — Exactly one H1.** The page MUST have exactly one H1 — not zero, not two. Multiple H1s trip check SEO-V15 (`multiple_h1`); a missing one trips `missing_h1`. The H1 is the page's statement of subject; there is one subject.

**SEO-OP-07 — Descriptive, matches the content, may differ from the title.** The H1 MUST describe the article's actual content. It MAY differ slightly in phrasing from the SEO title — the title optimizes for the results list, the H1 for the arriving reader — but the two MUST not disagree about what the page is.

```
Title: How to Store Fresh Basil So It Lasts for Weeks
H1:    How to Store Fresh Basil So It Lasts for Weeks          (fine — identical)
H1:    Keeping Fresh Basil Usable for Weeks                    (fine — same promise, reader phrasing)
H1:    The Complete Basil Handbook: Grow, Store, Cook          (bad — promises a different page)
```

### Meta description

**SEO-OP-08 — Present, unique, page-specific, useful.** Every page MUST have a meta description, unique within the site, specific to this page, and useful: it states the direct answer or the value of clicking. "A guide about basil" describes a thousand pages; "Jar of water for days, paper-towel refrigeration for weeks — the two methods that work" describes one. Missing/weak/duplicate descriptions are the core-field warning SEO-V16.

**SEO-OP-09 — Natural language, not keyword spam.** The description MUST read as natural prose addressed to the searcher deciding whether to click. It is not a keyword container; stuffing it feeds SEO-V19 patterns and repels the human it was written for.

**SEO-OP-10 — Length guidance.** Target ~120–158 characters. Under ~120 wastes the pitch; over ~158 risks truncation in the snippet. Again: guidelines — a 160-character sentence that lands the answer beats a truncated 158-character fragment.

**SEO-OP-11 — It is a pitch, not a ranking factor.** Google frequently rewrites meta descriptions — that is fine and expected. Write the description for the human scanning the results page: it influences the click, not the ranking. When Google swaps it, nothing was lost.

Bad / Good:

```
Bad:  Basil storage tips, basil keeping tips, how to store basil, fresh basil storage,
      keep basil fresh, basil preservation methods and basil fridge storage guide.
      (keyword list, ~145 chars of spam)
Good: Fresh basil wilts in days unless stored right: the counter jar method keeps it
      about a week, paper-towel refrigeration longer. Steps, shelf life, mistakes.
      (natural, page-specific, states the answer, ~152 chars)
```

### URL slug

**SEO-OP-12 — Short, readable, descriptive, stable.** The slug MUST be readable by a human ("what is this URL about?"), descriptive of the content, and stable over time. Changing a slug breaks accumulated signals — inbound links, indexed history — so choose it once and keep it; if it must change, implement a redirect and accept the cost.

**SEO-OP-13 — Lowercase, hyphenated, clean.** Lowercase words separated by hyphens. No unnecessary parameters, no session IDs, no tracking codes — parameterized and tracked URLs fragment the page's identity across duplicates.

**SEO-OP-14 — Avoid dates in slugs for refreshable content.** When the content will be refreshed (guides, comparisons), do not date the slug: freshness belongs in the content and its visible dates, not in a URL that locks the page into "2024" forever. Evergreen slugs for evergreen content.

Bad / Good:

```
Good: /how-to-store-fresh-basil
Bad:  /p=8371                      (opaque — says nothing)
Bad:  /article-123/?ref=home       (ID + tracking parameter)
Bad:  /how-to-store-fresh-basil-2024   (dated slug on refreshable evergreen content)
```

### Keyword placement

**SEO-OP-15 — Primary keyword: natural presence, alignment not ritual.** The primary keyword (or a close natural variant) SHOULD appear in the title or H1, and in the early content (~first 150 words). The WHY is alignment: the page's stated subject should match the query. Placement serves that alignment — it is not a ritual, and a natural variant serves as well as the exact string. Absence surfaces as SEO-V18 (`keyword_missing_naturally`); stuffing to guarantee presence trips the far worse SEO-V19.

**SEO-OP-16 — Secondary and semantic keywords: coverage, not insertion.** Secondary keywords, semantic terms, and entities SHOULD appear naturally through topical coverage — present because the topic is genuinely covered (methods, conditions, comparisons), never inserted to accumulate matches. The deterministic stuffing thresholds live in `KEYWORD-STRATEGY.md` (SEO-KW-11..13); semantic absence is SEO-V20.

### Headings

**SEO-OP-17 — Descriptive, logical hierarchy, user phrasing.** Headings MUST be descriptive of their sections, in a logical hierarchy (H2 sections, H3 subsections, no skipped levels), and SHOULD use question phrasings users actually type where sections answer questions ("Should You Refrigerate Basil?" — the query as asked). Headings that carry the reader's language help the scanning reader and the extracting engine alike; weak headings surface at SEO-V21.

### Links, images, schema (pointers)

**SEO-OP-18 — Links.** Internal and external link rules live in their own modules: `INTERNAL-LINKING.md` (inventory-driven links, natural anchors — checks SEO-V22/V23) and `EXTERNAL-LINKING.md` (authoritative citations where claims warrant them — check SEO-V24). Do not evaluate links from this module; load those.

**SEO-OP-19 — Images and alt text.** Image usefulness, placement, and honest alt text live in `IMAGE-SEO.md` (checks SEO-V25/V26). Alt text describes the actual image; it is never a keyword slot — keyword lists in alt are stuffing per `KEYWORD-STRATEGY.md` SEO-KW-13.

**SEO-OP-20 — Structured data.** Schema type selection, validity, and the no-fabricated-properties rule live in `SCHEMA.md` (checks SEO-V27/V28). The brief's `schema_type` is the plan; `SCHEMA.md` enforces that the markup matches visible content.

### Canonical

**SEO-OP-21 — Self-referencing canonical as the default.** When the platform supports canonical tags, the page SHOULD carry a self-referencing canonical on its final URL. Parameter variants (`?ref=`, `?utm_...`) MUST resolve to one canonical — the clean URL — so the page's signals accumulate in one place. Platform does not support canonicals: note it and move on; check SEO-V29 reports what the platform allows. A canonical pointing anywhere other than the intended final URL is a `canonical_conflict`, not a style choice.

### OG metadata

**SEO-OP-22 — Open Graph when the platform supports it.** `og:title`, `og:description`, and `og:image` SHOULD be emitted when the platform supports OG metadata — they control how the page reads when shared socially. OG fields duplicate the page's honest identity (title, description, an actual image from the page), never invent a second, punchier one. Absence is INFO (`og_missing`, SEO-V30) — a polish opportunity, never a blocker.

## Output

The on-page findings block — part of the WRITE-phase working notes and the evidence base the VALIDATE gate reads:

```json
{
  "fields_reviewed": ["seo_title", "h1", "meta_description", "url_slug", "headings", "keyword_placement", "canonical", "og_metadata"],
  "findings": [
    {
      "field": "meta_description",
      "rule": "SEO-OP-08",
      "check": "SEO-V16",
      "status": "pass",
      "note": "Page-specific, states both methods and the shelf-life payoff"
    },
    {
      "field": "url_slug",
      "rule": "SEO-OP-12/13",
      "check": "SEO-V17",
      "status": "pass",
      "note": "/how-to-store-fresh-basil — short, readable, stable, no parameters"
    }
  ],
  "keyword_placement": {
    "primary_in_title_or_h1": true,
    "primary_in_first_150_words": true,
    "exact_match_density": 0.004,
    "stuffing_verdict": "none"
  }
}
```

For the shared scenario this block is clean — the basil article's on-page fields pass, which is why its On-Page SEO score category loses nothing and the single deduction in the whole report is the thin freezing section elsewhere.

## Quality Checks

| Check | Rules it reads |
|---|---|
| SEO-V13 (title present + quality) | SEO-OP-01..04 |
| SEO-V14 (title uniqueness) | SEO-OP-01 (inventory-gated; `UNAVAILABLE` without data) |
| SEO-V15 (H1 single, descriptive) | SEO-OP-06/07 |
| SEO-V16 (meta description) | SEO-OP-08..11 — core-field warning |
| SEO-V17 (slug quality) | SEO-OP-12..14 — core-field warning |
| SEO-V18 (primary keyword natural presence) | SEO-OP-15 |
| SEO-V19 (no keyword stuffing) | SEO-OP-04, SEO-OP-09, with thresholds from `KEYWORD-STRATEGY.md` SEO-KW-11..13 — CRITICAL |
| SEO-V20 (semantic coverage) | SEO-OP-16 |
| SEO-V21 (heading quality) | SEO-OP-17 |
| SEO-V29 (canonical) | SEO-OP-21 |
| SEO-V30 (OG metadata) | SEO-OP-22 — INFO |

Links (SEO-V22..V24), images (SEO-V25/V26), and schema (SEO-V27/V28) are checked through their own modules per SEO-OP-18/19/20.

## Failure Handling

- **Title missing:** hard failure (`missing_title`, CRITICAL) — supply one before any other fix; On-Page SEO loses 40% of its score weight.
- **Title or meta weak but accurate:** rewrite against the field's rules; weak titles are warnings, accurate-but-plain beats punchy-but-wrong.
- **Slug already parameterized or dated in production:** propose the clean slug as the canonical target with redirects; never change slugs casually (SEO-OP-12) — accumulated signals are the stake.
- **Keyword missing from early content:** add it naturally or re-scope the page's stated subject; never force-insert to pass SEO-V18 — that trades a warning for a potential CRITICAL.
- **Density over ~1% or heading-stuffing detected:** CRITICAL path (`keyword_stuffing`) — rewrite the affected fields until the usage reads aloud naturally (SEO-KW-14).
- **Platform lacks canonical/OG support:** record the limitation; SEO-V29/V30 degrade to what the platform allows — INFO, not failure. Never hand-emit fake platform support.

## Cross-References

- `SKILL.md` — WRITE-phase module map
- `SEARCH-INTENT.md` — the intent the title and H1 must stay honest to
- `KEYWORD-STRATEGY.md` — natural usage (SEO-KW-10) and the deterministic anti-stuffing thresholds (SEO-KW-11..13)
- `INTERNAL-LINKING.md`, `EXTERNAL-LINKING.md` — link rules (SEO-OP-18)
- `IMAGE-SEO.md` — image and alt rules (SEO-OP-19)
- `SCHEMA.md` — structured data rules (SEO-OP-20)
- `FEATURED-SNIPPETS.md` — title/description/heading shape influences snippet eligibility
- `VALIDATION.md` — SEO-V13..V21, SEO-V29, SEO-V30; issue types `missing_title`, `weak_title`, `duplicate_title`, `missing_h1`, `multiple_h1`, `missing_meta_description`, `weak_meta_description`, `duplicate_meta_description`, `poor_slug`, `keyword_missing_naturally`, `keyword_stuffing`, `semantic_gap`, `weak_headings`, `canonical_missing`, `canonical_conflict`, `og_missing`
- `SCORING.md` — On-Page SEO category (weight 22; stuffing halves it and fails the verdict, missing title costs 40%)
