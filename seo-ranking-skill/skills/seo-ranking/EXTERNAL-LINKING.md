# External Linking — Citations That Earn Trust

> Module 10 of the seo-ranking skill · Phase: WRITE · Load when: the draft makes claims that require sources, or the brief's citation plan is being applied

## Purpose

Decide when an article must link out, and to what. External links are a trust mechanism, not a leak: a claim that needs a source and has none is an unsupported claim (CRITICAL territory), and a fabricated source is worse than no source at all. This module keeps citations honest — real URLs only — and kills the two classic pathologies: citation-free assertion and invented citations.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `article` draft containing claims | Yes | Module cannot run |
| `content_brief` citation plan (claims flagged during PLAN) | Preferred | Claims are identified in-draft; identical outcome, lower confidence noted |
| Approved source list / CMS citation policy | Optional | Default rules (SEO-EL-02, SEO-EL-04, SEO-EL-06) apply |
| Provided source URLs (from author, CMS, or brief research) | Optional | Only canonical documentation homepages are linkable without them (SEO-EL-06) |

## Procedure

1. Extract load-bearing claims: statistics, technical specifications, official-documentation references, primary-research claims, contested or surprising facts.
2. Apply the SEO-EL-01 test to each: would the claim fail review without a source? If yes, it needs an outbound citation — or an explicit estimate marker when no source exists.
3. Select the source: authoritative primary source over aggregator (SEO-EL-02); stable canonical URL (SEO-EL-07); a URL actually provided or a well-known canonical documentation homepage (SEO-EL-06).
4. Write the citation into the prose with a natural anchor (SEO-EL-03).
5. Apply rel/disclosure rules to any commercial relationship (SEO-EL-04).
6. Scan the draft as a whole for manipulative linking patterns (SEO-EL-08).
7. Emit the citation table into the brief or revision notes, with the real source URL for every cited claim.

## Rules

### When to link out

- **SEO-EL-01 · Link when the claim would fail without a source.** Statistics, technical specifications, official documentation references, primary-source claims, and contested or surprising facts require an outbound link — or an explicit estimate marker when no source exists. WHY: an unsourced load-bearing claim is `unsupported_claim` (SEO-V08, CRITICAL when load-bearing); a linked one is verifiable reporting.

### What to link to

- **SEO-EL-02 · Primary sources over aggregators.** Prefer official documentation, standards bodies, the original publisher of research, and official brand/product pages — not link roundups, scrapers, or secondhand quotes of quotes. WHY: the reader must be able to verify the claim in one hop, and the canonical source is the one that stays true.
- **SEO-EL-07 · Link stability.** Prefer stable canonical URLs; avoid ephemeral pages (campaign URLs, session-parameterized URLs, press-release mirrors) when a canonical alternative exists. WHY: a rotting citation turns a trust signal into a `broken_link` finding later (SEO-V34 audit territory).

### How to link out

- **SEO-EL-03 · Natural anchors.** The anchor describes what the source is — "Google's documentation on title links", "the university's basil storage study" — and reads as prose. It is never a keyword string, and never a bare "link" or "here".
- **SEO-EL-04 · rel attributes and disclosure.** Editorial citations are normal follow links by default — no blanket nofollow of honest citations. Sponsored or affiliate relationships MUST be disclosed per the CMS's policy (rel="sponsored" or the platform's disclosure mechanism). Never hide a commercial relationship in either direction. WHY: undisclosed commercial linking is a trust failure for readers and, at scale, a link-spam problem for the site.

### Integrity

- **SEO-EL-06 · Never fabricate citations.** Only link URLs that were actually provided in the inputs or that are well-known canonical documentation homepages. Linking `https://developers.google.com/search/docs` is fine; inventing a deep link to a "study" that was never seen is fabrication. An invented citation is `fabricated_data` (SEO-V09, CRITICAL — integrity override): the single worst output this module can produce.

### The myths section

- **SEO-EL-05 · The "SEO leak" myth.** Linking out to authoritative sources does not "leak SEO" — cite-worthy content links to its evidence. Do not strip citations to hoard hypothetical link equity. WHY: the premise is false, and removing evidence weakens exactly the trust signals (helpfulness, verifiability) that Google's guidance rewards; see `GOOGLE-GUIDANCE.md`.

### Link schemes

- **SEO-EL-08 · No manipulative link schemes.** No excessive reciprocal linking, no link-exchange networks, no linking arrangements designed to manipulate PageRank — Google's link spam policies treat these as violations, and so does this skill. Every outbound link answers one question only: does the reader need this source?

### When NOT to link out

- **SEO-EL-09 · Not every sentence needs a source.** Common knowledge ("basil is a herb"), the article's own observations and original analysis, and clearly-marked estimates do not require citations. Do not sprinkle links to look well-sourced — link density that serves appearance over verification is its own kind of noise, and it buries the citations that matter. The test is always SEO-EL-01's: would the claim fail review without a source?

## Worked example

Claim in the shared scenario draft: "Fresh basil keeps 5–7 days at room temperature."

- A provided source exists in the brief (a university extension page on herb storage, URL supplied during PLAN) → cite it with the anchor "the extension's herb storage notes", follow link, placed on the sentence carrying the claim. The URL is real because it was provided — not because it sounded plausible.
- No source provided, none known → the citation entry is `null` with a recommended action: "find a real source, mark the claim as an estimate, or delete the claim." Never substitute an invented URL.
- Claim about how Google rewrites titles → cite the canonical documentation homepage `https://developers.google.com/search/docs/appearance/title-link` (well-known canonical documentation — linkable without provision per SEO-EL-06).

## Claim-handling decision table

Deterministic routing for every load-bearing claim found in a draft:

| Claim type | Example | Action |
|---|---|---|
| Statistic with a provided primary source | "Basil keeps 5–7 days at room temperature" | Cite the provided source; normal follow link |
| Official documentation claim | "Google rewrites titles in results" | Cite the canonical documentation URL |
| Technical specification | "This air fryer holds 5.8 quarts" | Cite the manufacturer's official product page |
| Contested or surprising fact | "Refrigeration darkens basil leaves" | Cite a primary source, or present as the article's own observation with honest hedging |
| Load-bearing claim, no source exists | "Most home cooks waste their basil" | Mark as an explicit estimate or delete the claim — never publish bare |
| Common knowledge | "Basil is the classic pesto herb" | No citation — do not link for appearance (SEO-EL-09) |

## Output

Citation plan (brief) or applied-citation table (draft):

```json
{
  "external_linking": {
    "citations": [
      { "claim": "Fresh basil keeps 5-7 days at room temperature", "source_url": "[URL provided in brief]", "anchor": "the extension's herb storage notes", "rel": "follow" }
    ],
    "disclosures": [],
    "unresolved_claims": [
      { "claim": "example unsourced claim", "action": "find a real source or mark as estimate" }
    ],
    "fabrication_check": "no invented URLs detected"
  }
}
```

`[URL provided in brief]` marks a placeholder for a real, provided URL — the shape is illustrative; the values never are.

## Quality Checks

| Check | Verifies here | Result |
|---|---|---|
| SEO-V24 | Load-bearing claims/statistics link to authoritative primary sources | `missing_external_sources` WARNING |
| SEO-V08 (adjacent) | Claims needing sources have them or are marked estimates | `unsupported_claim` WARNING / CRITICAL when load-bearing |
| SEO-V09 (adjacent) | No invented studies, statistics, or URLs | `fabricated_data` CRITICAL — integrity override, fails the gate |

Scoring: SEO-V24 findings feed the **On-Page SEO** category (weight 22) of the SEO Content Score (`SCORING.md`); integrity findings follow the special-case deduction table.

## Failure Handling

- Claim needs a source and none exists: mark it as an estimate or delete it — never publish it bare and never invent a citation.
- Source URL provided but unverified: label `needs_verification` for the human editor; do not present it as checked.
- Suspected commercial relationship behind an "editorial" link: flag it for the CMS's disclosure policy rather than deciding unilaterally.
- Citation target is ephemeral with no canonical alternative: keep the citation, note the stability risk, schedule it for the broken-links audit (`site-level/TECHNICAL-SEO.md` — maintenance context only).
- Draft cites only aggregators where primaries exist: replace with the primary source per SEO-EL-02; note the swap.

## Cross-References

- `GOOGLE-GUIDANCE.md` — link spam policies; the people-first principle behind honest citation.
- `INFORMATION-GAIN.md` — original analysis reduces how often borrowed, cited claims are the only option.
- `EEAT-TRUST.md` — sourcing as a trust signal; fake experience is the adjacent failure.
- `AI-SEARCH-GEO.md` — cited claims and honest hedging for answer engines.
- `ON-PAGE-SEO.md` — anchor text inside body copy.
- `site-level/TECHNICAL-SEO.md` — site-wide broken-link auditing for outbound URLs (maintenance context only, never per-article).
- `VALIDATION.md` — SEO-V24, SEO-V08, SEO-V09 definitions and severities.
- `SCORING.md` — On-Page SEO category; integrity special-case deductions.
