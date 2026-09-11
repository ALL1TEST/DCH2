# Structured Data — Schema That Matches the Page

> Module 12 of the seo-ranking skill · Phase: WRITE · Load when: JSON-LD is being selected, built, or validated for an article, or schema findings are being remediated

## Purpose

Produce JSON-LD structured data that is (1) the right type for the content, (2) technically valid, and (3) honest — every property backed by something visible on the page. Structured data helps machines understand the page precisely; misleading structured data is a spam-policy violation per Google and a CRITICAL integrity override in this skill.

The order of operations matters: type selection, then visible-content matching, then syntax. Perfect syntax describing fabricated properties is worse than no schema at all — no schema is merely an unclaimed opportunity; fabricated schema is a violation.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `article` — full body plus metadata (title, publish/modified dates) | Yes | Module cannot run |
| CMS author record (real authors as the CMS assigns them) | Yes for author properties | Omit author-dependent markup; never invent authors (SEO-SD-03) |
| Real publish/modified dates from the CMS | Yes for date properties | Omit `datePublished`/`dateModified`; never guess or default to "now" (SEO-SD-09) |
| Product/offer/review data (product content only) | Only when genuine | Product name-only, or no Product type at all (SEO-SD-03) |
| Site hierarchy (real breadcrumbs) | For BreadcrumbList | Omit BreadcrumbList rather than invent hierarchy |

## Procedure

1. **Determine applicability.** Does this page carry content that maps to a schema type (table in SEO-SD-01)? An article page always qualifies at minimum for `Article`/`BlogPosting`; a page with no article body, recipe, product, Q&A, or steps may legitimately carry only the site-wide types.
2. **Select the type(s)** strictly per the mapping table (SEO-SD-01). Site-wide types (`Organization`, `WebSite`, `BreadcrumbList`) are emitted by the CMS template — verify them, do not duplicate them per article.
3. **Enumerate the visible evidence.** For each candidate property, find the visible or verifiable page element that backs it (SEO-SD-02). No evidence → property omitted.
4. **Apply the fabrication blacklist** to every property (SEO-SD-03).
5. **Build the JSON-LD block** with required properties (SEO-SD-05), correct nesting (SEO-SD-08), and a unique `@id` per entity (SEO-SD-07).
6. **Validate deterministically** in the fixed order of SEO-SD-10: parse → structure → required fields → visible-content cross-check.
7. **Flag** invalid syntax as CRITICAL `invalid_schema` and any fabricated property as CRITICAL `fabricated_schema_property`; emit the schema block plus validation notes.

## Rules

### Type selection

- **SEO-SD-01 · Type selection mapping.** Choose schema types ONLY from this mapping; when nothing matches, carry no content-specific type (site-wide types may still apply):

| Content (as actually present on the page) | Schema type | Notes |
|---|---|---|
| Standard article / guide | `Article` or `BlogPosting` | Default for CMS articles; `BlogPosting` when the CMS's content model is a blog post |
| News reporting (time-sensitive) | `NewsArticle` | Actual news content only, not evergreen guides |
| Recipe with real ingredients and steps | `Recipe` | Requires a visible ingredient list and visible step instructions |
| Genuine product data provided | `Product` | Real product data only; `offers`/`aggregateRating` only when real (SEO-SD-03) |
| Visible question-answer pairs | `FAQPage` | Every question in markup must be visible on the page (SEO-SD-06) |
| Genuine step-by-step instructions | `HowTo` | Steps must be visible as numbered instructions in the body |
| Site-wide (template-level) | `Organization` + `WebSite` + `BreadcrumbList` | Emitted by the CMS template; `BreadcrumbList` must match the real site hierarchy |

### Honesty

- **SEO-SD-02 · The match-visible-content rule.** Use a schema type only when it matches actual visible content on the page, and include a property only when it is backed by something the user can see or verify there. The schema is a description of the page, not an aspiration for it. WHY: markup describing absent content misleads search engines and the users of search engines — the exact class of violation Google's spam policies name.
- **SEO-SD-03 · The fabrication blacklist.** NEVER emit: reviews or ratings (`aggregateRating`, `reviewCount`, `review`) without real review data; prices, offers, or availability without a real offer; authors other than real authors the CMS assigns; dates other than real publish/modified dates from the CMS; or ANY property not true of the page. Fabricated properties are flagged `fabricated_schema_property` (CRITICAL, integrity override) and zero the Structured Data category (`SCORING.md`).

### JSON-LD validity (deterministic)

- **SEO-SD-04 · Syntax floor.** The block must parse as valid JSON — no trailing commas, no comments, no unescaped quotes or raw line breaks in strings — and must include `"@context": "https://schema.org"` plus a `@type`.
- **SEO-SD-05 · Required properties per type.** Emit only complete schema objects; a type missing required properties is `invalid_schema`:

| Type | Required | Recommended |
|---|---|---|
| `Article` / `BlogPosting` / `NewsArticle` | `headline`, `datePublished`, `author` | `image`, `dateModified`, `description` |
| `Recipe` | `name`, `recipeIngredient`, `recipeInstructions` | `recipeYield`, `cookTime`, `totalTime`, `image` |
| `HowTo` | `name`, `step` | `totalTime`, `estimatedCost` (only when real), `image` |
| `FAQPage` | `mainEntity` with `Question`/`Answer` pairs | — (every question visible on the page) |
| `Product` | `name`, plus at least one of `offers` or `aggregateRating` — both must be REAL | `image`, `description` |
| `BreadcrumbList` | `itemListElement` matching the real site hierarchy | `name` per item |

- **SEO-SD-06 · FAQPage visibility.** Every `Question` in FAQPage markup must be visible on the page — as an actual FAQ block or as question headings. Markup-only questions describe content that does not exist, and are fabricated properties.
- **SEO-SD-07 · @id uniqueness.** No duplicate or conflicting `@id` for the same entity across blocks. One entity, one @id, referenced consistently.
- **SEO-SD-08 · Nesting rules.** Nest entities as objects with their own required fields: `author` as a `Person` (or `Organization`) object with the real name; `recipeInstructions` as `HowToStep` objects matching the visible steps; `BreadcrumbList` entries as `ListItem` objects. Do not flatten entities into bare strings where schema.org expects objects.
- **SEO-SD-09 · Dates only from the CMS.** `datePublished`/`dateModified` come from CMS metadata only — never guessed, never defaulted to the generation timestamp, never bumped for recency (the same never-fake-freshness principle as `CONTENT-REFRESH.md`).
- **SEO-SD-10 · Validation procedure (deterministic checklist).** (1) Parse the JSON — syntax failures are CRITICAL `invalid_schema`. (2) Check `@context`/`@type` and the required properties per type — missing → CRITICAL `invalid_schema`. (3) Cross-check EVERY property against visible page content — mismatches and unverifiable properties → CRITICAL `fabricated_schema_property`. (4) Check `@id` uniqueness and nesting — defects → CRITICAL `invalid_schema`. There is no WARNING tier for honesty defects here: a property is backed by the page or it is not.

### Common errors catalog (Bad → Good)

**Error 1 — missing @context.**

Bad:

```json
{
  "@type": "Article",
  "headline": "How to Store Fresh Basil",
  "datePublished": "2025-01-15",
  "author": { "@type": "Person", "name": "Author Name From CMS" }
}
```

Good: add `"@context": "https://schema.org"` as the first property. Without it, parsers cannot resolve the vocabulary — `invalid_schema` (SEO-SD-04).

**Error 2 — FAQPage with questions not on the page.**

Bad: markup whose `mainEntity` contains "Does basil last longer in the fridge?" while the visible page has no FAQ block and no such heading — the markup describes content that does not exist (SEO-SD-06 violation, `fabricated_schema_property`).

Good: only questions that appear as visible headings or FAQ entries. In the shared basil scenario, the FAQ block does not exist yet, so FAQPage is deferred and surfaces as the INFO `schema_missing` opportunity — exactly the fixture behavior frozen in `VALIDATION.md`.

**Error 3 — aggregateRating on a page with no reviews.**

Bad:

```json
{
  "@type": "Product",
  "name": "Herb Storage Container",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "213" }
}
```

on a page with zero visible reviews — fabricated social proof (SEO-SD-03).

Good: `Product` with `name` plus real `offers` data if provided; no rating markup until the CMS actually holds the reviews it claims.

**Error 4 — Review with a fabricated reviewer.**

Bad: a `Review` block with `author` "Maria G." invented to populate the page — a fabricated reviewer identity.

Good: no `Review` markup at all unless the CMS stores real reviews with real reviewer identities. A fabricated reviewer is `fabricated_schema_property` — CRITICAL.

**Error 5 — Recipe with missing required properties.**

Bad:

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Pesto alla Genovese"
}
```

A name-only Recipe is `invalid_schema` (SEO-SD-05): `recipeIngredient` and `recipeInstructions` are required, and both must mirror the visible ingredient list and the visible steps.

Good: emit `Recipe` only when the page visibly carries the ingredients and the steps — and mirror them exactly, `HowToStep` by visible step.

**Error 6 — conflicting @id for the same entity.**

Bad: two `Article` blocks on one page sharing one `@id` but carrying different `headline` values — a parser cannot tell which block describes the page (SEO-SD-07).

Good: one entity, one @id, one block; other blocks reference the @id instead of redefining it.

## Worked example

Shared scenario article: "How to Store Fresh Basil", with a CMS-assigned author, a real publish date, and a real media-library image URL.

Emitted block (bracketed values are placeholders for the real CMS data):

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Store Fresh Basil",
  "datePublished": "[real CMS publish date]",
  "author": { "@type": "Person", "name": "[real CMS-assigned author]" },
  "image": ["[real CMS image URL]"]
}
```

Adjacent decisions, recorded in the `type_rationale`:

- `HowTo` is applicable in principle (the methods sections carry visible numbered steps); emit it only when the step mapping is one-to-one with the visible lists — otherwise `Article` alone is the honest choice.
- `FAQPage` is deferred: no visible FAQ block exists yet, so it is recorded as the INFO `schema_missing` opportunity with its trigger condition ("when a visible FAQ block is added") — matching the frozen fixture behavior in `VALIDATION.md`.
- No `Product`, `Review`, or `aggregateRating` markup of any kind: none of that data exists for this page, and fabricating it is the blacklist (SEO-SD-03).

## Output

Schema block(s) for the CMS to embed, plus a validation note:

```json
{
  "schema": {
    "emit": [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "How to Store Fresh Basil",
        "datePublished": "[real CMS publish date]",
        "author": { "@type": "Person", "name": "[real CMS-assigned author]" },
        "image": ["[real CMS image URL]"]
      }
    ],
    "type_rationale": "Standard how-to article; HowTo optional once visible steps are verified; FAQPage deferred until a visible FAQ block exists",
    "validation": {
      "syntax": "valid",
      "required_properties": "complete",
      "visible_content_match": "verified",
      "fabrications": []
    }
  }
}
```

Bracketed values are placeholders for real CMS-provided data — the shape is illustrative, the values never are.

## Quality Checks

| Check | Verifies here | Result |
|---|---|---|
| SEO-V27 | Applicable schema type present and matching visible content (mapping in SEO-SD-01) | `schema_missing` (WARNING when an applicable type is absent; INFO-level opportunity when the content does not exist yet, e.g., FAQPage before the FAQ block) / `schema_type_mismatch` WARNING |
| SEO-V28 | Valid JSON-LD, required properties present, no fabricated reviews/ratings/prices/authors/dates | `invalid_schema` / `fabricated_schema_property` — **CRITICAL, core-field: fails the gate regardless of score** |

Scoring: the **Structured Data** category (weight 8) of the SEO Content Score; `invalid_schema` and `fabricated_schema_property` zero the category outright (`SCORING.md` special-case table).

## Failure Handling

- JSON does not parse: fix syntax first — nothing else is verifiable until it parses.
- Applicable type unclear: default to `Article`/`BlogPosting`, note the ambiguity; never stack speculative types "just in case".
- Property unverifiable (e.g., no author record): omit the property; if it is required for the type, drop the type.
- Conflicting blocks (duplicate `@id`, competing types): keep the one matching visible content, remove the other — conflicts are `invalid_schema`.
- CMS already emits site-wide types: do not duplicate `Organization`/`WebSite` per article; verify `BreadcrumbList` against the real hierarchy only.
- A required property's data is expected to arrive later (FAQ block, review system): defer the type and record the INFO `schema_missing` opportunity with its trigger condition.

## Cross-References

- `GOOGLE-GUIDANCE.md` — misleading structured data as a spam-policy violation; the people-first principle behind SEO-SD-02.
- `FEATURED-SNIPPETS.md` — visible steps and Q&A sections are the same structures that feed HowTo/FAQPage markup.
- `AI-SEARCH-GEO.md` — structured data complements machine-legible text; it never substitutes for visible content.
- `CONTENT-REFRESH.md` — schema staleness is a refresh trigger; the date-honesty rule is shared (SEO-SD-09).
- `site-level/TECHNICAL-SEO.md` — site-wide schema validation audit (Structured Data validity category; maintenance context only, never per-article).
- `EEAT-TRUST.md` — real authors, real dates, real experience.
- `VALIDATION.md` — SEO-V27 / SEO-V28 definitions; `invalid_schema` / `fabricated_schema_property` / `schema_missing` / `schema_type_mismatch` registry entries.
- `SCORING.md` — Structured Data category (weight 8) and the special-case zeroing rule.
