# Technical SEO — Site-Level Audit (Evidence-Gated)

> Module 17 of the seo-ranking skill · Location: `site-level/` · **OPTIONAL MAINTENANCE REFERENCE — never auto-runs when an article is generated** · Load when: a site-level technical audit is explicitly requested or scheduled — and real access data exists (or is explicitly absent) · Site-level concerns belong to the CMS's own SEO dashboard; this module is methodology for deliberate maintenance work only

## Purpose

Run a deterministic, evidence-gated audit of the site's technical health: check each item with the data that proves it, map every finding to a registered issue type and a Technical Score category, and state plainly what was checked versus what was not.

The two rules above lead this module because they are its most-abused boundaries in practice: blending technical with content scores lets weak sites hide behind good articles, and claiming unverified technical health lets audits pass without looking. Everything below enforces both.

## THE SEPARATION RULE

Technical SEO is separate from article-content SEO. A perfect article can sit on a broken site — noindexed behind a robots.txt block, orphaned outside the sitemap, duplicated across parameter URLs — and a broken site's symptoms are never fixed by better titles. This module audits site infrastructure and its measurable outcomes; it does not grade prose, and the content modules never grade infrastructure. The two sides meet only in the Overall SEO Health blend (`SCORING.md`), where each keeps its own score and its own evidence.

Consequences of the rule:

1. Technical findings never deduct from the Content Score; content findings never pose as technical evidence.
2. A page with flawless title/meta/H1 and an unintended `noindex` is technically broken — and only this module can say so, because only this module looks.
3. H1 and heading quality are on-page (content) matters; this audit may *detect* them at scale but routes them to the per-page gate (see audit item 10).

## THE EVIDENCE RULE

This module NEVER claims technical health without actually checking it. Without real access — a fetched robots.txt, a fetched sitemap, crawl data, or platform/admin data — the corresponding audit items and the Technical Score are `NOT_MEASURABLE`, full stop. No inference from correct title/meta/H1, no "probably fine", no assumed Core Web Vitals. Absence of evidence is `NOT_MEASURABLE`, never a pass (`SKILL.md` Data Availability Policy; `SCORING.md` anti-gaming rule 4).

## Inputs

| Input | What it proves | If absent |
|---|---|---|
| `robots.txt` (fetched file) | Crawl rules; unintended blocks | robots item → NOT_MEASURABLE |
| `sitemap.xml` (fetched file) | Coverage, freshness, canonical-only entries | sitemap items → NOT_MEASURABLE |
| Crawl data (real crawler output) | Redirects, chains, loops, soft 404s, broken links, duplicate variants, link graph | those items → NOT_MEASURABLE |
| CMS inventory export | Duplicate titles/meta/H1 across pages | those items → UNAVAILABLE |
| Platform/admin data (rendered HTML, headers, canonical tags) | noindex directives, canonicals, viewport/rendering | those items → NOT_MEASURABLE |
| Real CWV data (CrUX / GSC CWV report / PageSpeed Insights) | Field/lab performance | Core Web Vitals → NOT_MEASURABLE (rescale per `SCORING.md`) |
| Search Console API state | Indexation and sitemap status | those measurements live in `INDEXING.md` instead |

## Procedure

1. Enumerate the access you actually have; mark every audit item lacking its evidence `NOT_MEASURABLE` before checking begins.
2. Run the audit checklist item by item: what to check, what data proves it, which issue type and score category a finding maps to.
3. Record every finding as an issue object with the obligatory fields of `VALIDATION.md` (type, severity, check, location, problem, why_it_matters, recommended_fix), citing the evidence in `problem`.
4. Map findings to the 8 Technical Score categories; compute the score per `SCORING.md` only for categories with evidence — `NOT_MEASURABLE` is never averaged as zero.
5. Emit the technical findings report with the complete `data_availability` block.

## Audit checklist

| # | Item | What to check | What proves it (data required) | Issue type | Score category (weight) |
|---|---|---|---|---|---|
| 1 | robots.txt | Unintended blocks of important paths (Disallow on content sections) | The fetched robots.txt file itself | `noindex_unintended` (CRITICAL when a content path is blocked) | Crawlability & robots.txt (15) |
| 2 | Crawlability | Redirect chains (more than 2 hops), redirect loops, soft 404s | Crawl data (hop counts, status codes, content signatures) | `redirect_chain` (WARNING; loop = CRITICAL); soft 404s reported as `broken_link` with the soft-404 condition described in `problem` | Crawlability & robots.txt (15) for detection; soft 404s deduct via Broken Links (8) |
| 3 | Indexability | Unintended noindex via robots meta / X-Robots-Tag / robots.txt; canonical conflicts (multiple pages unintentionally canonicalizing to one) | Rendered page source / HTTP headers / robots.txt | `noindex_unintended` (CRITICAL), `canonical_conflict` | Crawlability & robots.txt (15) / Canonical & Redirects (15) |
| 4 | sitemap.xml | Exists, fresh, canonical URLs only, no broken or redirected entries | The fetched sitemap cross-checked against crawl data | `sitemap_missing_page` (per missing canonical page); broken/redirected sitemap entries as `broken_link` / `redirect_chain` findings | Sitemap & Indexation (20) |
| 5 | Canonicals | Self-referencing canonical on the final URL; consistent https / www / trailing-slash policy | Rendered canonical tags across a sample + inventory URLs | `canonical_missing`, `canonical_conflict` | Canonical & Redirects (15) |
| 6 | Redirects | 301 vs 302 misuse (permanent moves on temporary codes and vice versa), chains, loops | Crawl data with per-hop status codes | `redirect_chain` (WARNING; loop = CRITICAL) | Canonical & Redirects (15) |
| 7 | Broken links | Internal and external links returning 4xx/5xx or effectively dead | Real link-check data (crawler or link-checker output) | `broken_link` | Broken Links (8) |
| 8 | Duplicate URLs | Parameter / case / trailing-slash variants resolving 200 with equivalent content | Crawl data (variant resolution) + content comparison | `duplicate_url` (WARNING; exact URL duplicate = CRITICAL) | Duplicate Content (12) |
| 9 | Duplicate titles/meta | Duplicate title values and duplicate meta descriptions across the inventory | CMS inventory export | `duplicate_title`, `duplicate_meta_description` | Duplicate Content (12) |
| 10 | Duplicate/missing H1 | Duplicate H1 values across pages; pages missing H1 entirely | CMS inventory export (rendered pages) | `missing_h1` (CRITICAL per page); duplicates per the note below | No Technical category — routed to each page's On-Page SEO (Content Score) at its next validation run |
| 11 | Schema validity site-wide | Every JSON-LD block parses, carries required properties, and matches visible content | Rendered pages' JSON-LD, parsed per the `SCHEMA.md` checklist | `invalid_schema`, `fabricated_schema_property` (CRITICAL) | Structured Data validity, site-wide (10) |
| 12 | Mobile readiness | Viewport meta present; responsive layout actually rendering — not assumptions | Real rendering checks (rendered HTML, screenshots, device emulation) | `mobile_issue` | Mobile Readiness (10) |
| 13 | Core Web Vitals | Field/lab metrics (LCP, INP, CLS) against thresholds | ONLY real data: CrUX, GSC CWV report, PageSpeed Insights | `cwv_issue` | Core Web Vitals (10) — NOT_MEASURABLE without data; rescale the rest per `SCORING.md` |
| 14 | Orphan pages | Pages in the sitemap but unlinked from the site's graph, or linked but absent from the sitemap | Sitemap + crawl link-graph data (both required) | in-sitemap-but-unlinked → `missing_internal_links`; linked-but-unmapped → `sitemap_missing_page` | Sitemap & Indexation (20) |
| 15 | Search Console integration | Verified or not — a status flag, not an issue | Admin/API verification state | (status only) | gates `INDEXING.md`; no deduction |

Note on audit item 10 (duplicate H1 values): the frozen issue-type registry has no cross-page duplicate-H1 type. Report the finding descriptively; when the duplicate H1 accompanies a duplicate title (the common case), it deducts via `duplicate_title` in Duplicate Content; standalone duplicate-H1 findings are INFO notes with no deduction, deferred to a dedicated type at SEO-V41+. `missing_h1` and `multiple_h1` remain per-page gate findings (SEO-V15) detected here at scale and routed to each affected page's next validation run — H1 is an on-page element, per the separation rule.

Note on audit item 2 (soft 404s): a URL returning 200 with error-like content is effectively a broken page. Until a dedicated type exists at SEO-V41+, report it as `broken_link` with the soft-404 condition explicitly described in `problem`; it deducts from Broken Links (8).

## Category summary (Technical Score mapping)

The audit checklist above is the procedure; this table is the score-side map. Category names and weights are frozen in `SCORING.md`:

| Technical Score category | Weight | Evidence required | Typical registered findings |
|---|---|---|---|
| Crawlability & robots.txt | 15 | fetched robots.txt + crawl data | `noindex_unintended`, `redirect_chain` |
| Sitemap & Indexation | 20 | fetched sitemap + crawl/link-graph data (+ GSC via `INDEXING.md`) | `sitemap_missing_page`, `missing_internal_links` (orphans) |
| Canonical & Redirects | 15 | rendered canonical tags + crawl status codes | `canonical_missing`, `canonical_conflict`, `redirect_chain` |
| Duplicate Content (URL/title/meta) | 12 | crawl variants + inventory export | `duplicate_url`, `duplicate_title`, `duplicate_meta_description` |
| Structured Data validity (site-wide) | 10 | rendered JSON-LD parsed per `SCHEMA.md` | `invalid_schema`, `fabricated_schema_property` |
| Broken Links | 8 | real link-check data | `broken_link` (including soft 404s per the checklist convention) |
| Mobile Readiness | 10 | real rendering checks | `mobile_issue` |
| Core Web Vitals | 10 | real field/lab data only (CrUX / GSC / PSI) | `cwv_issue` — else NOT_MEASURABLE + rescale |

## Rules

- **SEO-TS-01 · Separation rule.** The separation above is binding: findings stay in their lane; content quality is never technical evidence; technical health is never inferred from on-page polish. WHY: mixed evidence produces reports that cannot be acted on — a title fix cannot repair a robots.txt block, and no audit should imply it can.
- **SEO-TS-02 · Evidence rule.** Every audit item requires its proving data; without it the item — and its score category where no other evidence exists — is `NOT_MEASURABLE`, stated plainly, never averaged, never passed by assumption. WHY: an unaudited pass is a fabricated pass — the exact failure mode the Data Availability Policy exists to prevent.
- **SEO-TS-03 · robots.txt verification.** Fetch the real file and verify no important path is blocked; a robots.txt that is itself unreachable (5xx/timeout) is a crawlability finding — if it produces de facto disallow-all behavior, report `noindex_unintended` CRITICAL with that effect stated. WHY: it is the single smallest file with the single largest blast radius on crawl behavior.
- **SEO-TS-04 · Redirect hygiene.** Maximum 2 hops per redirect; zero loops (CRITICAL); permanent moves use 301 and temporary uses 302 — misuse is flagged with the correct code named in the fix. WHY: every hop is a chance for dropped signals and crawler budget waste; loops never resolve at all.
- **SEO-TS-05 · Sitemap discipline.** The sitemap contains canonical URLs only — no redirects, no non-canonical variants, no broken entries — and is fresh (recently regenerated). WHY: the sitemap is the site's own declaration of what it wants indexed; polluting it with non-canonical URLs invites exactly the duplication it exists to prevent.
- **SEO-TS-06 · Canonical consistency.** Every indexable page self-canonicalizes on its final URL, under one consistent scheme (https), host (www or not), and trailing-slash policy site-wide. WHY: inconsistent canonical forms manufacture duplicate URLs out of thin air.
- **SEO-TS-07 · No unintended noindex.** Any robots meta / X-Robots-Tag / robots.txt effect that removes a page meant to rank from search is CRITICAL (`noindex_unintended`) — it silently deletes the page's search presence. WHY: nothing else in the report matters if the page cannot be indexed at all.
- **SEO-TS-08 · Real rendering for mobile.** Mobile readiness is proven by rendering, not by assuming a responsive theme; viewport presence is a floor, not a pass. WHY: "looks responsive in the template" is an assumption; the audit reports measurements.
- **SEO-TS-09 · CWV only from real data.** CrUX, the GSC CWV report, or PageSpeed Insights — nothing else. No estimates, no lab-guessing field data; without data the category is NOT_MEASURABLE and the remaining categories rescale (`SCORING.md`). WHY: performance numbers invented to fill a report are indistinguishable from real ones until a deploy relies on them.
- **SEO-TS-10 · Findings map to the frozen registry.** Every deduction references a registered issue type (`VALIDATION.md`); soft 404s and orphans follow the conventions in the checklist table; anything genuinely new is reported descriptively and deferred to SEO-V41+ — never an invented type. WHY: deductions that cannot be traced to the registry are unauditable, and unauditable scoring is how scores drift into fiction.

## Output

Technical findings report mapped to the 8 Technical Score categories (names and weights frozen in `SCORING.md`):

```json
{
  "technical_seo_audit": {
    "categories": [
      { "name": "Crawlability & robots.txt", "weight": 15, "status": "MEASURABLE", "earned": 15.00, "deductions": [] },
      { "name": "Sitemap & Indexation", "weight": 20, "status": "MEASURABLE", "earned": 17.60, "deductions": [ { "issue_type": "sitemap_missing_page", "count": 1, "amount": 2.40 } ] },
      { "name": "Canonical & Redirects", "weight": 15, "status": "MEASURABLE", "earned": 13.20, "deductions": [ { "issue_type": "redirect_chain", "count": 1, "amount": 1.80 } ] },
      { "name": "Duplicate Content (URL/title/meta)", "weight": 12, "status": "MEASURABLE", "earned": 12.00, "deductions": [] },
      { "name": "Structured Data validity (site-wide)", "weight": 10, "status": "MEASURABLE", "earned": 10.00, "deductions": [] },
      { "name": "Broken Links", "weight": 8, "status": "MEASURABLE", "earned": 8.00, "deductions": [] },
      { "name": "Mobile Readiness", "weight": 10, "status": "MEASURABLE", "earned": 8.80, "deductions": [ { "issue_type": "mobile_issue", "count": 1, "amount": 1.20 } ] },
      { "name": "Core Web Vitals", "weight": 10, "status": "NOT_MEASURABLE", "earned": null, "deductions": [] }
    ],
    "findings": [
      {
        "type": "sitemap_missing_page",
        "severity": "WARNING",
        "check": "SEO-V32",
        "location": "/how-to-store-fresh-basil",
        "problem": "Canonical URL absent from sitemap.xml (file fetched 2025-01-15)",
        "why_it_matters": "Pages outside the sitemap rely on incidental discovery; indexation and refresh crawling slow down",
        "recommended_fix": "Regenerate the sitemap from the CMS's canonical page list and resubmit in Search Console"
      },
      {
        "type": "redirect_chain",
        "severity": "WARNING",
        "check": "SEO-V34",
        "location": "/kitchen-guides -> /guides/kitchen (3 hops)",
        "problem": "Crawl data shows a 3-hop chain (301 -> 301 -> 301) ending at /guides/kitchen",
        "why_it_matters": "Chains above 2 hops waste crawler effort and risk dropped signals on every re-crawl",
        "recommended_fix": "Collapse the chain to a single 301 from the origin URL to the final destination"
      }
    ],
    "search_console_integration": "verified",
    "data_availability": { "robots_txt": true, "sitemap": true, "crawl_data": true, "cms_inventory": true, "rendering": true, "cwv_field_data": false }
  }
}
```

Category deductions follow the standard formula (0.35 × critical + 0.12 × warning + 0.03 × info, capped at the weight). When Core Web Vitals is NOT_MEASURABLE, the remaining categories rescale per `SCORING.md`; a fully unevidenced audit emits status `NOT_MEASURABLE` and no score at all.

The example shows a full category set with only CWV unmeasured. A real report also carries `generated_at` and the fetch date of every input file (audit cadence rule), and every category `earned` value carries two decimals per `SCORING.md`.

## Quality Checks

| Check | Verifies here | Result |
|---|---|---|
| SEO-V31 | Indexable — no unintended noindex | `noindex_unintended` CRITICAL |
| SEO-V32 | In sitemap; canonicalized form matches | `sitemap_missing_page` WARNING |
| SEO-V33 | No duplicate URL/title/meta collisions | `duplicate_url` / `duplicate_title` (exact URL duplicate = CRITICAL) |
| SEO-V34 | No redirect chains/loops; no broken links | `redirect_chain` / `broken_link`; redirect loop = CRITICAL |
| SEO-V35 | Mobile + CWV with real data | `mobile_issue` / `cwv_issue`; no data → NOT_MEASURABLE, never PASS |

The NOT_MEASURABLE policy governs all of Section 3: a check without its data is marked, not passed and not failed.

## What this audit is not

- Not a content audit: prose quality, coverage, and information gain belong to the content modules and the Content Score (the separation rule).
- Not server administration: hosting, CDN, and infrastructure changes are the CMS team's implementation work; this audit reports outcomes with evidence.
- Not a one-shot certificate: technical health decays with every deploy; run it on a schedule and after migrations.
- Not a promise of rankings: a clean Technical Score means the site is legible and available to crawlers — nothing more, nothing less (`SCORING.md` anti-gaming rule 5).
- Not a substitute for the content gate: a site can score 100/100 technically while every article on it fails the content checks — both gates must pass.
- Not a security audit: HTTPS consistency matters here (SEO-TS-06), but vulnerability scanning is out of scope.

## Audit cadence

Full audit quarterly; light re-check (robots.txt, sitemap, redirect spot-check) after every platform deploy, template change, or migration; CWV monitoring continuous when the integration exists. Any NOT_MEASURABLE item that gains an evidence source is re-audited immediately rather than waiting for the next cycle. Every audit records its own run date and the fetch dates of every input file, so a reader can tell exactly how stale the evidence is.

## NOT_MEASURABLE quick reference

| Situation | Correct output |
|---|---|
| No technical access at all | Technical Score: NOT_MEASURABLE; no findings; no score |
| Crawl data present, CWV data absent | 7 categories scored; Core Web Vitals NOT_MEASURABLE; remaining categories rescaled per `SCORING.md` |
| Inventory absent, crawl data present | duplicate title/meta/H1 items UNAVAILABLE; all crawl-based items score normally |
| GSC verified, crawl data absent | indexation facts reported via `INDEXING.md`; crawl-based items remain NOT_MEASURABLE |
| Rendering data absent, all else present | Mobile Readiness NOT_MEASURABLE; the other categories score normally |
| Only robots.txt + sitemap fetched, no crawl data | redirect/duplicate/orphan items NOT_MEASURABLE; robots and sitemap items score normally |

## Failure Handling

- **No access data at all:** the entire audit is NOT_MEASURABLE — emit the status plainly and stop; no findings, no score, no hedged claims of "generally healthy".
- **Partial access:** audit exactly the items with evidence; mark the rest NOT_MEASURABLE per category.
- **Crawl data and platform data disagree:** cite both in the finding's `problem`; the stricter, more conservative interpretation wins.
- **A fix requires infrastructure changes** (server config, CDN, hosting): report it with evidence; implementing infrastructure is the CMS team's job (`SKILL.md` §5 scope note).
- **Suspected but unproven issues** ("probably duplicate content"): not findings — collect the evidence first, then re-run.
- **Audit output will be consumed by non-specialists:** keep every finding's `why_it_matters` plain-language and evidence-anchored; an unexplainable finding is an unused finding.
- **Search Console unverified:** note the status; indexation reporting then belongs to `INDEXING.md`'s UNAVAILABLE path, not to guessed numbers here.
- **Finding count explodes** (thousands of broken links, hundreds of duplicates): aggregate by pattern, list the top URLs as examples, and report pattern totals — the fix is usually one platform change, not a thousand edits.

## Cross-References

- `SKILL.md` — Data Availability Policy (§7), `technical_access` input row (§6), scope boundaries (§4).
- `SCORING.md` — the 8 Technical Score categories, weights, deduction formula, CWV rescaling rule, NOT_MEASURABLE semantics, Overall SEO Health blend.
- `VALIDATION.md` — SEO-V31..V35 and the frozen issue-type registry.
- `INDEXING.md` — the Search Console side of indexation and sitemap status; shared evidence rule.
- `SCHEMA.md` — the per-page JSON-LD validation checklist reused site-wide (audit item 11).
- `CONTENT-REFRESH.md` — where technical findings (broken links, schema decay) become refresh actions.
- `ON-PAGE-SEO.md` — the on-page fields this module deliberately does not grade (separation rule).
- `CANNIBALIZATION.md` — page-level duplication strategy vs. this module's URL-level duplication findings.
