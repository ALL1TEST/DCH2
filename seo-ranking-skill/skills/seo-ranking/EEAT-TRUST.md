# E-E-A-T and Trust

> Module 07 of the seo-ranking skill · Phase: WRITE · Load when: drafting or reviewing anything that makes claims a reader might rely on — and always for YMYL topics

## Purpose

Determine what trust signals the article can honestly carry, and enforce the boundary: content claims may never exceed what the CMS actually provides. Experience, Expertise, Authority, and Trust are evaluated as signals a page can genuinely support — never as decorations to assert.

WHY: E-E-A-T is where AI-assisted content most often fails honestly — by fabricating first-hand experience, inventing author credentials, or implying authority the site has not earned. Those are integrity overrides in this skill (SEO-V09/V10, CRITICAL always). The honest floor is high: demonstrate what you have, state the limits of what you know, and never simulate the rest.

## Inputs

| Input | Required | If absent |
|---|---|---|
| Draft / brief | Yes | Nothing to evaluate |
| Author data (real name, real credentials, real biographical claims) | No | The article MUST NOT present author experience or credentials — none exist to present |
| First-hand material (real photos, real process notes, real test observations supplied by the CMS) | No | No first-hand experience claims may be made |
| `topic` classification | Yes | Needed to detect YMYL (SEO-EEAT-08) |
| Site policy on AI-content disclosure | No | Follow the default in SEO-EEAT-10: neither add nor remove disclosures |

## Procedure

1. **Inventory what is real.** List what the CMS actually supplied: author identity and credentials (or none), first-hand material (or none), citation-worthy sources (or none), the site's actual topical track record per the inventory.
2. **Conclude what the content can honestly claim.** For each of the four signals, write one line: supportable / not supportable, and why. Claims may never exceed this inventory.
3. **Demonstrate expertise where it is always available** — accuracy, depth, correct terminology, and correctly-scoped claims (SEO-EEAT-03). This is the one signal AI-assisted content can always earn.
4. **Apply the transparency techniques that are always honest** (SEO-EEAT-09): accurate dates, honest update notes, cited sources, clear scope statements, acknowledged uncertainty.
5. **Check YMYL status.** If the topic touches health, finance, legal, or safety, apply the higher standards in SEO-EEAT-08.
6. **Check disclosure policy.** Apply the site's AI-content disclosure policy as given (SEO-EEAT-10).
7. **Emit the E-E-A-T assessment:** per-signal supportable/not-supportable, the transparency techniques used, YMYL status, and the resulting claims the article may make.

## Rules

**SEO-EEAT-01 — Four signals, honestly defined.**

- **Experience** — first-hand use, testing, or practice of what the content describes. Exists only when supplied as real input.
- **Expertise** — skill and knowledge visible in the content itself: accuracy, depth, correct terminology, correctly scoped claims. Demonstrated, not claimed.
- **Authority** — the site's standing with readers and in its topic area: consistent topical coverage, real citations earned and given. Site-level and slow; not asserted in text.
- **Trust** — the page being truthful and safe to rely on: accuracy, transparency, honest sourcing, acknowledged limitations, a clear correction path.

**SEO-EEAT-02 — Experience only when genuinely available.** First-hand experience claims are permitted ONLY when the CMS supplies real author experience, credentials, or photos/process notes as input. NEVER generate fake first-hand experience — no invented "we tested", "in our kitchen", "after years of growing", no fabricated anecdotes. Missing input means no experience claims, and that is a normal outcome, not a deficiency to paper over.

**SEO-EEAT-03 — Expertise is demonstrated, not claimed.** The article demonstrates expertise through accuracy, depth, and correct terminology — the right terms used correctly, conditions and limits stated, the mechanics explained. Writing "as expert gardeners, we know..." claims nothing and demonstrates less; the correct term used precisely does more than any credential sentence.

**SEO-EEAT-04 — Authority is site-level, not a paragraph.** Authority comes from consistent topical coverage over time and real citations — it is earned by the site and observed by readers, not asserted by the article. Do not write authority claims ("the leading resource on..."); do build the site-level habits: coherent topic clusters, internal links to related depth, external citations where claims warrant them.

**SEO-EEAT-05 — Trust is the floor under everything.** Trust means: accurate statements, transparent sourcing, honest treatment of what is unknown, acknowledged limitations, and a correction policy the site actually honors. A single fabricated statistic voids trust entirely — which is why fabrication is CRITICAL always.

**SEO-EEAT-06 — Claims may never exceed inputs.** The evaluation is a two-step ledger: what the CMS actually provides → what the content can honestly claim. Any claim not traceable to an input (author data, first-hand material, cited sources, or common well-established knowledge) is unsupported and MUST be removed or re-scoped.

**SEO-EEAT-07 — Never fabricate E-E-A-T signals.** No invented author credentials, no fake first-hand experience, no fabricated citations or studies, no simulated test results. These are integrity overrides: SEO-V09 (`fabricated_data`) and SEO-V10 (`fake_experience`), CRITICAL always, verdict FAIL regardless of any other quality.

**SEO-EEAT-08 — YMYL topics carry higher trust standards.** Topics touching health, finance, legal, or safety: cite authoritative sources for load-bearing claims, defer to qualified professionals for decisions that need them, avoid specific advice that requires a license (medical dosing, legal directions, financial instruments), and state scope plainly ("general information, not professional advice" — as a scope statement, not a disclaimer-shaped substitute for accuracy). When sources are unavailable, narrow the claim rather than softening the language around an unsupported one.

**SEO-EEAT-09 — Transparency techniques available to AI-assisted content.** These are always honest and SHOULD be used: accurate publish and update dates; honest update notes that say what changed and why; cited sources for claims that warrant them; clear scope statements ("this covers sweet basil, not Thai basil behavior"); acknowledged uncertainty ("storage life varies with freshness at purchase; expect ranges, not guarantees"). None of these simulate experience — they make the content verifiable, which is the trust a reader can actually check.

**SEO-EEAT-10 — AI-content disclosure follows site policy.** If the CMS or site has a disclosure policy for AI-assisted content, follow it exactly. Do not add disclosures on your own initiative and do not remove or dilute existing ones — disclosure is the site owner's decision, made once, deliberately.

**SEO-EEAT-11 — Output feeds the gate.** The E-E-A-T assessment feeds check SEO-V12 and the Content Quality & E-E-A-T score category. Its per-signal ledger is the evidence; "supportable" without a named input is an audit error.

## Output

The E-E-A-T assessment:

```json
{
  "topic_ymyl": false,
  "signals": {
    "experience": {
      "supportable": false,
      "basis": "No author experience data or first-hand material supplied by the CMS"
    },
    "expertise": {
      "supportable": true,
      "basis": "Correct terminology (Ocimum basilicum, storage conditions), accurate method mechanics, scoped claims"
    },
    "authority": {
      "supportable": false,
      "basis": "Site-level signal; not assertable by this article — built via consistent coverage over time"
    },
    "trust": {
      "supportable": true,
      "basis": "Honest ranges instead of invented durations; limitations acknowledged; no fabricated sources"
    }
  },
  "permitted_claims": [
    "Method descriptions and conditions",
    "Honest shelf-life ranges with their drivers",
    "Explanations of why methods work or fail"
  ],
  "prohibited_claims": [
    "First-hand testing or personal experience",
    "Author credentials or biography",
    "Studies, statistics, or quotes without a supplied source"
  ],
  "transparency_techniques_used": [
    "accurate dates",
    "clear scope statement",
    "acknowledged uncertainty on storage durations"
  ],
  "disclosure_policy": "follow-site-policy (none supplied)"
}
```

This is the shared-scenario assessment: nothing about basil storage requires experience the CMS did not supply — the article earns its expertise and trust honestly, and claims nothing else.

## Quality Checks

| Check | What this module feeds |
|---|---|
| SEO-V09 (fabricated data absent) | The claims ledger is the check's evidence base; any fabricated statistic, study, quote, spec, or review is CRITICAL `fabricated_data` always |
| SEO-V10 (fake experience absent) | The experience signal's basis line; any fabricated first-hand experience or credential is CRITICAL `fake_experience` always |
| SEO-V12 (E-E-A-T transparency) | The assessment's supportable ledger, transparency techniques, and YMYL handling → `weak_eeat_transparency` when author/publisher presentation is dishonest or YMYL caution is missing |

## Failure Handling

- **CMS supplied no author data:** normal state — the article makes no author claims, demonstrates expertise through the text, and proceeds. Not a failure.
- **Draft contains experience or credential claims with no input behind them:** remove or re-scope them; this is a CRITICAL integrity issue, not a style edit.
- **YMYL topic without authoritative sources:** narrow the claims to what common well-established knowledge supports, state the scope, and recommend the professional-deferral framing — do not soften wording around an unsupported specific claim.
- **Site has no disclosure policy:** follow SEO-EEAT-10's default — neither add nor remove; flag the policy gap to the pipeline owner as an INFO-level note.
- **Assessment and draft disagree after edits:** re-run the ledger on the edited sections; the ledger is cheap, and it is the only thing standing between the article and an integrity override.

## Cross-References

- `SKILL.md` — integrity overrides, Data Availability Policy
- `INFORMATION-GAIN.md` — honest specifics and uncertainty handling overlap (SEO-IG-06)
- `EXTERNAL-LINKING.md` — how authoritative citations are placed when claims warrant them
- `SCHEMA.md` — author properties in structured data must trace to real inputs (no fabricated schema authors)
- `VALIDATION.md` — SEO-V09, SEO-V10, SEO-V12; issue types `fabricated_data`, `fake_experience`, `weak_eeat_transparency`
- `SCORING.md` — Content Quality & E-E-A-T category (weight 14); fabrication zeroes it and fails the gate
