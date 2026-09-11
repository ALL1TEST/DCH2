# References — Third-Party Projects and License Notes

> Reference module (unnumbered) of the seo-ranking skill · Phase: — · Load when: provenance or licensing of this package's influences is questioned, or a new third-party source is proposed as authority

## Purpose

Record exactly which third-party projects were consulted while shaping this skill package, what they were used for, and the license boundaries that govern any reuse. This module exists so the integrating team never wonders what came from where — and never accidentally imports someone else's licensed material.

## Inputs

None — this module is a static provenance record.

## Procedure

1. When provenance is questioned, point to the list below: these projects were conceptual references only (REF-01).
2. Before reusing anything from a listed repository, review that repository's own license first (REF-02).
3. When a third-party source conflicts with Google Search Central, apply REF-03.
4. Before any new third-party authority is cited anywhere in the skill, record it here in the same disclosure format.

## Rules

- **REF-01 · Disclosure.** The third-party projects consulted during this skill's development are listed below, and their role is stated exactly: conceptual references for skill structure and SEO-checklist organization — nothing more. The influence stayed at the level of how to organize a skill into modules and how to group an SEO checklist into content / on-page / technical sections; every rule, threshold, ID, and registry in this package was written for it.
- **REF-02 · License boundary.** These projects' own licenses govern their own contents. Nothing — code, prose, checklists — was copied from them into this package. If the integrating team wants to reuse anything from those repositories, they must review each repository's license first and decide independently; no compatibility is assumed or implied.
- **REF-03 · Conflict rule.** Google Search Central documentation (see `GOOGLE-GUIDANCE.md`) takes priority over all third-party sources when anything conflicts. Third-party SEO opinion never overrides, amends, or supplements the primary authority on questions of what Google rewards or penalizes.

## Third-party reference projects

Role for ALL entries: conceptual references for skill structure and SEO-checklist organization — nothing more. No content copied. The list is stable as of skill version 1.0.0; see Change policy below for how it evolves.

- https://github.com/marketingskills/seo
- https://github.com/mikezupper/google-seo-skill
- https://github.com/seranking/seo-skills
- https://github.com/seoskillsai/seo-skills-ai
- https://github.com/ninryt/seo-analysis-skill
- https://github.com/iannuttall/seo
- https://github.com/seo-skills/seo-audit-skill

URLs are listed exactly as consulted; no mirror, fork, or archived copy was used.

## Google canonical links (repeated for convenience)

Repeated from `GOOGLE-GUIDANCE.md` so provenance and conflict decisions never require loading another file. The primary authority — principles and precedence statement in `GOOGLE-GUIDANCE.md`:

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/fundamentals/ai-features

## Editorial-publisher conceptual references (sibling skill)

The sibling `content-style` skill used the following editorial publishers as conceptual references for general editorial principles only — no content copied, no affiliation implied:

RecipeTin Eats · Pinch of Yum · The Spruce · Bob Vila · Gardening Know How · PetMD · NerdWallet · Investopedia · The Points Guy · TechRadar · How-To Geek · Car and Driver · MotorTrend · BabyCenter · Lifehacker · IGN · Allure · Britannica

These names are recorded for the same provenance reason as REF-01: so the integrating team knows exactly what shaped the package's conventions, and knows that none of it is licensed material inside this repository.

## How the references were used (group level)

For the group as a whole, consultation informed two things and nothing else:

1. **Skill structure.** How a practical SEO skill can be decomposed into loadable modules with stable rule IDs, a validation gate, and progressive disclosure — the architecture pattern, not any specific file or rule.
2. **Checklist organization.** How professional SEO checklists group their concerns (content quality, on-page elements, technical site health) — the grouping logic, not any checklist item, threshold, or wording.

Every rule ID, severity, threshold, issue type, schema, and line of prose in this package was authored for it. Nothing was adapted, translated, or condensed from those repositories. Nothing about the scoring math, the deduction formula, or the issue registry derives from any of them — those are this package's own frozen design decisions.

## What was NOT taken

- No code, scripts, or prompts.
- No prose, checklists, tables, or threshold values.
- No check IDs, severity scales, or registry structures.
- No fixture or test data.
- No endorsement implied: listing these projects implies no relationship, no approval, and no affiliation.

## Integration guidance for the adopting team

Before reusing anything from a listed repository:

1. Open the repository and read its LICENSE file (and any NOTICE or CONTRIBUTING file that carries license terms).
2. Determine whether the intended reuse (code, prose, or checklist) is permitted under that license for the team's context.
3. Keep the provenance trail: record what was reused, from where, under which license.
4. Keep REF-03 in force: any SEO practice taken from a third-party repository remains subordinate to Google's live documentation.

## Sources of this package's own content

Everything in this package was authored as original work against two inputs: Google Search Central's public documentation (as principles — canonical links and precedence in `GOOGLE-GUIDANCE.md`) and the package's own design decisions recorded in `SKILL.md`, `VALIDATION.md`, and `SCORING.md`. Examples and fixtures use a synthetic shared scenario (an article on storing fresh basil) so that no real third-party content appears anywhere in `examples/` or `fixtures/`.

## Provenance summary

| Source group | Role in this package's development | License status of the source's own content |
|---|---|---|
| Google Search Central documentation | Primary authority; consulted as principles (`GOOGLE-GUIDANCE.md`) | Public documentation; cited by canonical URL, nothing copied |
| The seven third-party repositories listed above | Conceptual references for skill structure and checklist organization | Governed by each repository's own license; nothing copied into this package |
| The editorial publishers listed for the sibling skill | General editorial principles only (sibling `content-style-skill`) | Their original content remains theirs; nothing copied |

## Output

None — this module emits no reports; it is consulted.

## Quality Checks

None apply (no SEO-Vxx checks are defined here). Provenance correctness is this module's own quality bar: the lists above are exhaustive for this package's development, and the license statements in REF-02 are binding on how the integrating team reuses anything listed. A reviewer can verify this module in minutes: confirm each URL resolves, and confirm no file in this package reproduces third-party content.

## Failure Handling

- **A listed repository disappears or moves:** note it here at the next release; the license boundary (REF-02) is unaffected by link rot.
- **A license review finds a repo unusable for the integrating team's purposes:** that decision affects their reuse, not this package — nothing was copied, so nothing must be removed.
- **A team member proposes copying a checklist from a listed repo:** refuse within this package's files — REF-02 requires the license review first, and this package's content is original regardless of what the review concludes.
- **A new third-party authority is proposed:** record it here with its exact role before it is cited anywhere in the skill; Google's documentation remains primary (REF-03).
- **A new reference is suggested mid-integration:** it is recorded here before first use, with its role stated and its license reviewed — provenance is append-only, never retrofitted.

## Change policy

This module changes only when the provenance record changes: a repository is added, removed, or its license status materially changes. Such a change is a normal note in the package release — no SEO-Vxx check or issue type depends on this file's contents.

## Cross-References

- `GOOGLE-GUIDANCE.md` — the primary authority, the canonical links, and the precedence statement this module's conflict rule defers to.
- `SKILL.md` — authority order (§3).
- The sibling `content-style-skill` package — whose editorial-publisher references are recorded above.
- Package-level `README.md` and `LICENSE` (MIT) — this package's own license and source notes.
