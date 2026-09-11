# Internal Linking — Inventory-Driven Link Recommendations

> Module 09 of the seo-ranking skill · Phase: WRITE · Load when: an article draft is being linked, or the brief requests internal-link / backlink / orphan recommendations

## Purpose

Decide which internal links a new or revised article should carry, and which existing pages should link to it — using **only real CMS inventory data**. Good internal links move readers toward complementary coverage and connect isolated pages; an invented link does the opposite: it ships a broken URL to production. This module therefore treats the inventory as the only source of truth for what exists, and refuses to recommend anything it cannot trace to an inventory row.

The module's output becomes live HTML. That is why its honesty bar is the same as the Data Availability Policy's: an unavailable inventory yields no recommendations, and a fabricated URL is a fabrication, not a suggestion.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `article` — draft or outline (title, slug, primary keyword, intent, section plan) | Yes | Module cannot run |
| `cms_inventory` — per page: URL/slug, title, primary keyword, intent | Yes for any recommendation | Mark `UNAVAILABLE`; skip ALL recommendations (contextual, backlink, orphan) — never invent substitutes |
| Inlink counts / link graph (CMS or crawl data) | Optional | Orphan scan not possible; note it honestly rather than guessing |
| `keyword_map` — entities and secondary keywords | Optional | Candidate ranking degrades to title/slug/topic comparison; note reduced confidence |

## Procedure

1. Verify inventory availability. If `cms_inventory` is absent, record `"internal_linking": "UNAVAILABLE"` in the brief or revision notes and stop — no recommendations of any kind. This is not a failure verdict (Data Availability Policy, `SKILL.md` §7).
2. Build the candidate pool from the inventory: pages with topical overlap (shared entities, keyword family, or subtopics) or complementary intent (the reader's next or previous question on the journey).
3. Rank candidates by genuine reader value at specific points in the draft — not by keyword match alone.
4. Select contextual link targets: 2–6 for a typical 1,000–1,800-word article, proportional to length and genuine relevance (SEO-IL-06).
5. Assign each link a placement: the point in the prose where the linked topic arises (SEO-IL-07).
6. Draft anchor text per link: descriptive of the destination, varied across the article, reading naturally inside its sentence (SEO-IL-05, SEO-IL-10).
7. Run the reverse pass: identify inventory pages that should link TO the new article, each with a suggested anchor and insertion context (SEO-IL-08).
8. Scan for orphan opportunities when inlink data exists (SEO-IL-09).
9. Emit the linking block with its `data_availability` markers into the brief (PLAN output) or the revision notes (WRITE/maintenance).

## Rules

### Inventory and honesty

- **SEO-IL-01 · Real inventory or nothing.** Every link recommendation requires a real `cms_inventory` providing URL/slug, title, primary keyword, and intent per page. If absent, mark `UNAVAILABLE` and SKIP recommendations entirely — including backlink and orphan suggestions. WHY: the output becomes live HTML; an invented URL is a fabrication that ships to readers.
- **SEO-IL-02 · Never invent pages.** Do not invent URLs, slugs, article IDs, or page titles — not "plausible" ones, not placeholders the CMS might fix later. A recommendation names a real inventory row or it does not exist.

### Selection

- **SEO-IL-03 · Relevance over reach.** Recommend (a) articles with topical overlap — shared entities or subtopics; (b) articles with complementary intent — a method article links to the related technique or purchase articles the reader's journey implies (storage how-to → growing guide, drying guide, equipment guide); (c) only pages that actually exist in the inventory. A keyword match without reader value is not a reason to link.
- **SEO-IL-04 · Include hub and category pages when they help.** The relevant category or hub page is a legitimate target — it orients readers and consolidates topical structure — provided it exists in the inventory with its real URL. One hub link is usually enough for a standard article.

### Anchor text

- **SEO-IL-05 · Natural anchors.** Anchor text must be descriptive of the destination, read as prose in its sentence, and vary across the article. Forbidden: bare generic anchors ("click here", "this article", "read more") and exact-match keyword strings repeated link after link. An anchor like "drying herbs the right way" inside a natural sentence is right; a bare "store basil" bolted onto an unrelated sentence is wrong.
- **SEO-IL-10 · Anchor diversity.** Never point multiple links with the same anchor text. If two links would naturally carry the same anchor, rephrase one to describe its destination differently. WHY: uniform anchor patterns read as manipulation to search engines and as noise to readers.

### Quantity and placement

- **SEO-IL-06 · Quality over quota.** 2–6 contextual links for a typical 1,000–1,800-word article, proportional to length and to genuine relevance. Fewer genuinely relevant links beat a filled quota: zero links is a WARNING (SEO-V22) only when relevant inventory pages actually exist; a quota padded with marginal links is a `weak_anchor_text` problem (SEO-V23) instead.
- **SEO-IL-07 · Contextual placement only.** Place each link where its topic arises in the text. Never emit a "related links" list appended to the end of the body — that is a link dump, and the CMS's own related-content components own that slot, not the body copy.

### Reverse recommendations and orphans

- **SEO-IL-08 · Backlink recommendations.** Emit reverse recommendations: inventory pages whose readers would benefit from linking TO the new article, each with a suggested anchor and an insertion hint (where it fits the target page's flow). Label them clearly as edits to OTHER pages for the CMS editor — they are not part of the current draft.
- **SEO-IL-09 · Orphan opportunities.** When inlink data exists, flag inventory pages with zero or few inlinks and propose natural linking opportunities involving the new article. WHY: orphan pages are reachable only by direct URL; linking them restores them to the site's graph at near-zero cost.

## Worked mini-example

Shared scenario article: "How to Store Fresh Basil" (`/how-to-store-fresh-basil`, informational, primary keyword "how to store fresh basil").

Provided inventory (real rows, abbreviated):

| URL | Title | Primary keyword | Intent |
|---|---|---|---|
| `/growing-basil-indoors` | Growing Basil Indoors: A Complete Guide | growing basil indoors | informational |
| `/how-to-dry-herbs` | How to Dry Herbs for Long-Term Storage | how to dry herbs | informational |
| `/category/herb-garden` | Herb Garden (hub) | — | hub page |
| `/best-kitchen-scales` | Best Kitchen Scales | best kitchen scales | commercial |

Contextual links emitted (placement → anchor → target):

1. Introduction, where harvesting is mentioned: "Basil you grew yourself keeps best when the stems are fresh-cut — our [guide to growing basil indoors](/growing-basil-indoors) covers harvesting without bruising the leaves."
2. Drying subtopic (covered only briefly per the brief): "For storage beyond a week, [drying herbs the right way](/how-to-dry-herbs) preserves most of the flavor."
3. Closing orientation line: "More kitchen-garden guides in our [herb garden hub](/category/herb-garden)."

Backlink recommendations emitted:

- `/growing-basil-indoors` should link TO the new article after its harvest steps — suggested anchor: "how to store fresh basil after harvesting".
- `/how-to-dry-herbs` may reference the bunch-and-jar method — suggested anchor: "keeping fresh basil for up to a week" (phrased differently from the other recommendation: anchor diversity, SEO-IL-10).

Rejected: `/best-kitchen-scales` — commercial intent, no topical overlap with a storage how-to; linking it would be quota padding, not relevance (SEO-IL-03, SEO-IL-06).

## Output

A linking block inside the content brief (PLAN) or the revision notes (WRITE/maintenance):

```json
{
  "internal_linking": {
    "status": "AVAILABLE",
    "contextual_links": [
      { "target": "/how-to-dry-herbs", "anchor": "drying herbs the right way", "placement": "Drying section, second sentence" }
    ],
    "backlink_recommendations": [
      { "source_page": "/growing-basil-indoors", "anchor": "how to store fresh basil after harvesting", "placement_hint": "after the harvest steps" }
    ],
    "orphan_opportunities": [],
    "data_availability": { "cms_inventory": true, "inlink_data": true }
  }
}
```

When the inventory is absent, the block is exactly `{ "internal_linking": { "status": "UNAVAILABLE" } }` — with nothing else. Illustrative shape; real slugs come from the provided inventory only.

## Quality Checks

| Check | What it verifies here | Result |
|---|---|---|
| SEO-V22 | Contextual links to relevant inventory pages exist (2–6 guidance, length-proportional); backlink suggestions emitted | `missing_internal_links` WARNING when inventory is available and links are absent; `UNAVAILABLE` when the inventory is absent |
| SEO-V23 | Anchors descriptive and varied, not exact-match spam | `weak_anchor_text` WARNING |

Scoring: findings feed the **Internal Linking** category (weight 8) of the SEO Content Score (`SCORING.md`). An `UNAVAILABLE` inventory never deducts and never fails the verdict.

## Failure Handling

- **Inventory absent:** mark `UNAVAILABLE`, skip, continue the phase — never stall the pipeline, never invent substitutes.
- **Inventory suspected stale** (a slug that 404s on spot check): note the suspicion in the output; recommend the editor verify before publishing; do not silently drop the link.
- **Too many candidates:** rank by reader value, keep the top few, list the remainder as optional — never force the full quota.
- **Platform auto-generates related-links blocks:** keep body links strictly contextual and avoid double-linking the same target within one view.
- **Anchor collision with CMS conventions** (platform styles links oddly): still emit the recommendation; styling is the platform's problem, the anchor text is ours.

## Cross-References

- `SKILL.md` — Data Availability Policy (§7), module map, PLAN/WRITE phase order.
- `CONTENT-BRIEF.md` — where the linking block is stored in the generation contract.
- `CANNIBALIZATION.md` — same inventory input; an overlap verdict there changes the plan before linking matters.
- `KEYWORD-STRATEGY.md` — entities and secondary keywords used for relevance ranking.
- `ON-PAGE-SEO.md` — keyword placement in the text surrounding links.
- `VALIDATION.md` — SEO-V22 / SEO-V23 definitions, severities, `UNAVAILABLE` semantics.
- `SCORING.md` — Internal Linking category (weight 8), deduction formula.
- `schemas/content-brief.schema.json` — the brief contract carrying this block.
