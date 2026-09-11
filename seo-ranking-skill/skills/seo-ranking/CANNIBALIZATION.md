# Cannibalization — New vs. Existing Overlap Control

> Module 15 of the seo-ranking skill · Phase: PLAN · Load when: any new topic/article proposal enters PLAN (before the brief is finalized), including every item of a bulk batch

## Purpose

Stop the CMS from competing with itself. Keyword cannibalization happens when two pages target the same query: search engines pick one — usually unpredictably — and both pages may suffer. This module runs on EVERY new topic/article proposal against the real CMS inventory, assigns a deterministic risk level, and prescribes an action before a single word is generated.

## Inputs

| Input | Required | If absent |
|---|---|---|
| New proposal: title, primary keyword, intent | Yes | Module cannot run |
| `cms_inventory` — per page: URL, title, primary keyword, intent | Yes for the overlap analysis | Mark `UNAVAILABLE` and proceed with the plan at reduced confidence; no risk level is claimed and no report object is emitted |
| Subtopic lists (proposed outline + existing pages' subtopics) | Recommended | Overlap analysis degrades to keyword/intent/slug-title comparison; note it |

## Procedure

1. Verify inventory availability. Absent → record `cannibalization: "UNAVAILABLE"` in the brief, proceed, and flag that the check MUST re-run when inventory becomes available (SEO-CN-01).
2. For each inventory page, run the overlap analysis (SEO-CN-08): compare primary keyword (exact or near-variant), search intent, core topic, and subtopics; compute the shared subtopic list.
3. Assign the risk level per SEO-CN-03/04/05 — the HIGHEST level triggered by any single existing page wins.
4. Select the recommendation per SEO-CN-07 (HIGH) or SEO-CN-09 (MEDIUM); LOW → proceed.
5. Emit the cannibalization report JSON conforming to `schemas/cannibalization-report.schema.json`.
6. Honor the gate rule: HIGH blocks the new article at PLAN (SEO-CN-10).

## Rules

- **SEO-CN-01 · Runs on every proposal.** Every new topic/article proposal — manual, AI-idea, automation, or bulk — is checked against the inventory when one exists; bulk batches check EVERY item, because bulk generation is the classic cannibalization factory. When the inventory is unavailable, mark `UNAVAILABLE`, proceed at reduced confidence, and re-run when inventory exists. WHY: skipping the check is how five near-identical variants of one article accumulate silently.
- **SEO-CN-02 · Detection signals.** Overlap is detected by four signals: same primary keyword (exact or near-variant), same search intent, same core topic, overlapping subtopics. All four are compared per existing page, and the shared subtopic list is recorded explicitly in the report.
- **SEO-CN-03 · LOW.** Different primary keyword AND different intent, or minor subtopic overlap only. Action: proceed.
- **SEO-CN-04 · MEDIUM.** Same intent with a different angle or keyword variant, or meaningful shared subtopics. Action: proceed ONLY with explicit differentiation (SEO-CN-09).
- **SEO-CN-05 · HIGH.** Same primary keyword AND same intent. Action: the recommendation ladder in SEO-CN-07.
- **SEO-CN-06 · What HIGH means.** Two pages competing for the same query: search engines pick one (usually unpredictably), and both may suffer — split internal signals, fluctuating positions, the weaker page winning by accident. HIGH is not a style problem; it is a strategy collision, and it is resolved at PLAN, not by rewriting later.
- **SEO-CN-07 · HIGH recommendations (preference order).**
  1. **improve_existing** — preferred when the existing page is indexed and relevant: strengthen the existing article (add the new angle's subtopics, refresh its data) instead of competing with it.
  2. **merge** — consolidate the new angle into the existing page and redirect/avoid duplication.
  3. **change_intent** — serve a different query: the existing "best air fryers" comparison stays; the new article becomes "how to clean an air fryer" (how-to).
  4. **change_angle** — differentiate the subtopic focus: "best air fryers for small kitchens" targets a variant with distinct emphasis and distinct subtopics.
  5. **abandon** — when nothing differentiates: drop the topic and spend the effort on the existing page.
- **SEO-CN-08 · Overlap analysis procedure.** Deterministic per existing page: (1) compare primary keywords — exact match or near-variant (stemmed, pluralized, word-order, or filler-word variants); (2) compare intents; (3) compare core topics; (4) list shared subtopics explicitly; (5) note slug/title similarity. The shared subtopic list and a one-line overlap summary go into that page's report entry.
- **SEO-CN-09 · MEDIUM differentiation requirement.** MEDIUM never proceeds silently: the report's rationale must name the differentiation (subtopic emphasis, format, depth, audience), and the brief must carry it. Without a differentiation statement, MEDIUM is treated as HIGH.
- **SEO-CN-10 · The gate rule.** HIGH blocks the new article at PLAN: no brief is generated for the duplicate as-is. Resolve via SEO-CN-07's options first (`SKILL.md` §13; `VALIDATION.md` failure handling). The block is recorded with issue type `cannibalization_high`.

## Risk-level decision table

| Signals (per existing page) | Risk level | Action | Reporting type |
|---|---|---|---|
| Different primary keyword AND different intent | LOW | proceed | `cannibalization_low` (INFO) |
| Different keyword, minor subtopic overlap only | LOW | proceed | `cannibalization_low` (INFO) |
| Same intent, different angle / keyword variant | MEDIUM | proceed with explicit differentiation (SEO-CN-09) | `cannibalization_medium` (WARNING) |
| Meaningful shared subtopics | MEDIUM | proceed with explicit differentiation (SEO-CN-09) | `cannibalization_medium` (WARNING) |
| Same primary keyword AND same intent | HIGH | SEO-CN-07 ladder, in preference order | `cannibalization_high` (blocks at PLAN) |

Near-variant means the same query in the searcher's mind: stemmed ("air fryer" / "air fryers"), pluralized, word-order ("best air fryers 2025" / "best air fryers"), or filler-word variants. When several pages trigger different levels, the HIGHEST level any single page triggers wins.

## Worked example

Proposal: "Best Air Fryers 2025" — primary keyword "best air fryers", commercial (comparison) intent.

Inventory hit: `/reviews/best-air-fryers` — title "Best Air Fryers (Tested and Ranked)" — primary keyword "best air fryers" — commercial intent.

Overlap analysis: same primary keyword (exact); same intent (commercial comparison); shared subtopics: top-picks ranking, capacity/sizes comparison, price-vs-value notes, what to avoid. → **HIGH**.

Report (abridged; conforming to `schemas/cannibalization-report.schema.json`):

```json
{
  "new_article": { "title": "Best Air Fryers 2025", "primary_keyword": "best air fryers", "intent": "commercial" },
  "existing_pages": [
    {
      "url": "/reviews/best-air-fryers",
      "title": "Best Air Fryers (Tested and Ranked)",
      "primary_keyword": "best air fryers",
      "intent": "commercial",
      "shared_subtopics": ["top picks ranking", "capacity comparison", "price vs value", "what to avoid"],
      "overlap_summary": "Exact primary keyword match with identical commercial comparison intent and a fully shared subtopic space."
    }
  ],
  "risk_level": "HIGH",
  "recommendation": "improve_existing",
  "rationale": "The existing review targets the exact same keyword and intent; a second page would split signals with the outcome chosen unpredictably. Preferred action: strengthen the existing page with the 2025 update rather than publish a competing 'best air fryers' article.",
  "data_availability": { "cms_inventory": true },
  "generated_at": "2025-01-15T10:30:00Z"
}
```

Contrast case (LOW): a proposal "How to Freeze Basil" — primary keyword "how to freeze basil", informational intent — checked against the same inventory. Different primary keyword, and freezing is a minor subtopic of the existing storage article rather than its core; the shared subtopic list is short and peripheral. Verdict: LOW, proceed — with a note to keep the new article focused on freezing depth and to cross-link both pages, so the minor overlap stays complementary instead of drifting toward duplication over time.

## Output

The cannibalization report JSON (schema above), stored with the PLAN outputs. Risk levels map to reporting issue types: `cannibalization_high` (blocks the new article at PLAN), `cannibalization_medium` (WARNING — differentiation required), `cannibalization_low` (INFO — proceed). When the inventory is absent: NO report object is emitted; the brief carries `"cannibalization": "UNAVAILABLE"` instead.

## Quality Checks

| Aspect | Definition source | Result |
|---|---|---|
| Risk-level criteria | SEO-CN-03 / SEO-CN-04 / SEO-CN-05 | LOW / MEDIUM / HIGH recorded in the report |
| HIGH gate | SEO-CN-10, `SKILL.md` §13, `VALIDATION.md` failure handling | `cannibalization_high` blocks the new article at PLAN |
| MEDIUM differentiation | SEO-CN-09 | `cannibalization_medium` WARNING; a missing differentiation statement escalates to HIGH treatment |
| LOW note | SEO-CN-03 | `cannibalization_low` INFO — proceed |

An `UNAVAILABLE` inventory is never scored and never blocks — it is recorded honestly as a limitation, with the re-run obligation attached.

## Failure Handling

- **Inventory absent:** mark UNAVAILABLE, proceed with the plan, schedule the re-run (SEO-CN-01); never claim a risk level without inventory evidence.
- **Inventory stale** (pages published or removed since the export): note the staleness; treat conclusions as provisional.
- **Borderline LOW/MEDIUM:** classify MEDIUM and require the differentiation statement — the stricter integrity rule wins.
- **Bulk batch with multiple HIGH collisions:** resolve every collision before generating any item of the batch; collision resolution may change the batch plan itself.
- **The human editor overrides a HIGH verdict:** record the override with its rationale in the report's `rationale`; the skill states the risk, the editor owns the decision.

## Cross-References

- `SKILL.md` — PLAN phase order (cannibalization runs before the brief) and §13 gate semantics.
- `CONTENT-BRIEF.md` — carries the differentiation statement for MEDIUM outcomes.
- `CONTENT-REFRESH.md` — the improve_existing path executes as a refresh with the new angle's subtopics.
- `INTERNAL-LINKING.md` — same inventory input; merge decisions change link targets.
- `VALIDATION.md` — `cannibalization_high` / `cannibalization_medium` / `cannibalization_low` registry entries; fixture pairing (`cannibalized-topic.md` + `cms-inventory.json`).
- `SCORING.md` — cannibalization findings do not deduct from the per-article Content Score; they gate the plan.
- `schemas/cannibalization-report.schema.json` — the output contract.
