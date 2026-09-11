# Image SEO — Useful Images, Honestly Described

> Module 11 of the seo-ranking skill · Phase: WRITE · Load when: images are being planned, placed, or described for an article, or alt-text remediation is needed

## Purpose

Decide whether an article needs images at all, where each image goes, and how each image is described to machines (alt text, filename, caption) — without ever inventing what an image shows. Image SEO here reduces to two honest questions: does the image help the reader, and does the description tell the truth? A stuffed or invented alt text fails both.

## Inputs

| Input | Required | If absent |
|---|---|---|
| `article` draft/outline with sections and steps | Yes | Module cannot run |
| Image assets (files or CMS media entries) with filenames and CMS metadata | Optional | Module produces the image *plan* only (usefulness, placement, filename/alt requirements); no alt suggestions |
| Provided image descriptions (from author, stock library captions, or vision tooling) | Optional | Alt text for undescribed images → `NEEDS_VERIFICATION`, never invented (SEO-IMG-08) |
| Platform image capabilities (featured-image slot, caption field, lazy-loading) | Optional | Delivery notes stay generic INFO-level |

## Procedure

1. Classify the article's image potential per section: demonstrative (showing the thing), instructive (showing the step or its result), comparative (showing the difference), decorative (nothing — usually skippable) (SEO-IMG-01).
2. Decide per section whether an image earns its place; a text-only article is a legitimate outcome (SEO-IMG-02).
3. Assign placement: near the relevant text; step images inline with the steps; comparison images beside the compared options (SEO-IMG-03).
4. Specify the featured image when the CMS renders cards or index pages (SEO-IMG-04).
5. For each image: emit filename guidance (SEO-IMG-10); produce alt text only when the image content is actually known (SEO-IMG-05..07), otherwise mark `NEEDS_VERIFICATION` (SEO-IMG-08); add a caption only when it contributes information (SEO-IMG-09).
6. Append format/delivery notes as INFO-level guidance only (SEO-IMG-11).
7. Emit the image plan into the brief or revision notes, including the alt verification queue.

## Rules

### Usefulness and placement

- **SEO-IMG-01 · Usefulness first.** Classify every planned image: demonstrative (shows the thing — a basil bunch standing in a jar of water), instructive (shows the step or its result — wrapping leaves in a damp paper towel), comparative (shows the difference — fresh vs. week-old leaves), or decorative (adds nothing; usually skippable). Only the first three earn a place in body copy.
- **SEO-IMG-02 · Text-only is fine.** Never add an image to satisfy an imagined quota. A generic stock photo of "fresh herbs" decorating a storage how-to is an `image_not_useful` WARNING (SEO-V25), not enrichment. Decide usefulness per section, and skip images the content does not need.
- **SEO-IMG-03 · Placement follows relevance.** Images sit near the text they serve: step images inline with the step they illustrate, comparison images adjacent to the comparison, one orienting image near the introduction only when it genuinely orients. An image floating in an unrelated section fails placement.
- **SEO-IMG-04 · Featured image serves the CMS, not the body.** Provide a featured image when the platform renders cards/index pages — it serves listings and social previews. It still requires honest alt text and a descriptive filename; it does not duplicate body images.

### Alt text

- **SEO-IMG-05 · Describe what is actually shown.** Alt text describes the image's content and function as a screen-reader user or a search engine needs it: "Basil bunch standing in a glass jar of water on a kitchen counter". The subject, not the article topic; the image, not the keyword.
  When the image IS a link, the alt describes the link's destination instead ("Complete guide to growing basil indoors") — "function" in this rule is literal.
- **SEO-IMG-06 · Concise.** Roughly 125 characters max guidance; longer descriptions belong in captions or body text.
- **SEO-IMG-07 · No keyword stuffing.** An alt like "basil basil storage how to store basil fresh basil" is a violation — `stuffed_alt_text` (SEO-V26, a core-field WARNING that caps the verdict at WARNING). One natural mention of the subject, when it is genuinely in the image, is the ceiling.
- **SEO-IMG-08 · The honesty limit.** If the agent cannot see the image (no vision capability) and no description was provided, it MUST NOT invent alt text. Suggest alt text only when the image content is known from the filename, CMS metadata, or a provided description. Otherwise mark the alt as `NEEDS_VERIFICATION` for a human or vision pass. WHY: invented alt text describes an image that may not exist as described — a fabrication whose victims include screen-reader users.
- **SEO-IMG-09 · Decorative images get empty alt.** Purely decorative images (dividers, background textures) take `alt=""` so assistive technology skips them. This is correct semantics, not a missing-alt violation.

### Captions, filenames, delivery

- **SEO-IMG-10 · Captions add, never repeat.** A caption is short and supplies information the image itself cannot show (what changed between frames, what to notice, when the photo was taken). A caption that restates the alt text adds nothing and dilutes both.
- **SEO-IMG-11 · Descriptive filenames.** Use lowercase-hyphenated descriptive filenames: `fresh-basil-in-jar-of-water.jpg`, not `IMG_8371.jpg` or `basil FINAL v2.jpg`.
- **SEO-IMG-12 · Delivery is INFO-level.** Modern formats, appropriately sized images, and lazy-loading below the fold are worth noting — but implementation belongs to the CMS platform, not to article content. Emit as INFO notes; never block content and never score it on delivery choices.

## Worked example

Shared scenario article: "How to Store Fresh Basil" (informational how-to, three storage methods plus a mistakes section).

| Planned image | Classification | Decision | Notes |
|---|---|---|---|
| Basil bunch standing in a jar of water | instructive (shows the step's result) | keep, inline with the room-temperature method's step 2 | alt verified from the provided description |
| Fresh vs. week-old basil leaves, side by side | comparative (shows the difference) | keep, beside the "how to tell it is past its best" passage | alt verified; caption states what changed between sides |
| Generic stock photo of a kitchen counter | decorative | drop | adds nothing; a text-only mistakes section is fine (SEO-IMG-02) |
| Photo of hands chopping basil | decorative in THIS article | drop | belongs to a prep article, not a storage guide — relevance is per-article, not per-image |

Resulting alt-text examples:

- Good: "Basil bunch standing in a glass jar of water on a kitchen counter" — describes the image that is actually there.
- Violation: "how to store basil store basil fresh basil storage tips" — keyword stuffing into alt (SEO-IMG-07), a core-field WARNING at the gate.
- Honest unknown: the featured image `how-to-store-fresh-basil.jpg` has no description and no vision is available → `alt_status: "NEEDS_VERIFICATION"` — a queued verification item, never a guessed description (SEO-IMG-08).

## Output

Image plan (brief) or applied image block (draft):

```json
{
  "image_seo": {
    "images": [
      {
        "filename": "fresh-basil-in-jar-of-water.jpg",
        "purpose": "instructive",
        "placement": "Room-temperature bunch method, after step 2",
        "alt": "Basil bunch standing in a glass jar of water on a kitchen counter",
        "alt_status": "verified",
        "caption": "Change the water every 1-2 days so the stems keep drinking."
      }
    ],
    "alt_needing_verification": [],
    "featured_image": { "filename": "how-to-store-fresh-basil.jpg", "alt_status": "NEEDS_VERIFICATION" },
    "delivery_notes": ["lazy-load images below the fold", "serve appropriately sized variants"]
  }
}
```

`alt_status` is one of: `verified` (content known from file, metadata, or description), `suggested` (drafted from known content; editor confirms), `NEEDS_VERIFICATION` (content unknown — human or vision pass required before publish).

## Quality Checks

| Check | Verifies here | Result |
|---|---|---|
| SEO-V25 | Images serve comprehension (demonstrative/instructive) and sit near the relevant text | `image_not_useful` WARNING |
| SEO-V26 | Alt present, describes the actual image, no stuffing, ~125 char guidance | `missing_alt_text` / `stuffed_alt_text` WARNING — **core-field warning: caps the verdict at WARNING** |

Scoring: findings feed the **Image SEO** category (weight 6) of the SEO Content Score (`SCORING.md`). An unresolved `NEEDS_VERIFICATION` alt is recorded in `next_actions` as an open item; at publish time it is scored as `missing_alt_text` if still unresolved.

## Failure Handling

- No vision and no descriptions: emit the plan with every unknown alt marked `NEEDS_VERIFICATION`; do not guess. Resolve via a human or vision pass before publishing.
- Filename-only knowledge ("basil-jar.jpg"): it justifies a `suggested` alt, never a `verified` one — label accordingly.
- Platform cannot render captions or featured images: drop those fields; alt and filename rules still apply to what remains.
- Image exists but is decorative: keep it out of the instructive count, give it empty alt, take no deduction.
- Stock library supplies its own alt/caption text: treat it as a *provided description* (usable for `verified`/`suggested` status), still checked against stuffing rules.
- An image is the only evidence for a step but cannot be verified: flag the step text itself for review — unverifiable support is a content problem, not just an image problem.

## Cross-References

- `SKILL.md` — Data Availability Policy; alt honesty is a data-availability question.
- `FEATURED-SNIPPETS.md` / `AI-SEARCH-GEO.md` — images do not earn snippets or AI citations directly; text structure does.
- `SCHEMA.md` — Article schema's `image` property must reference real image URLs; same honesty bar.
- `ON-PAGE-SEO.md` — alt text is an on-page field; the stuffing prohibition is shared with SEO-V19.
- `VALIDATION.md` — SEO-V25 / SEO-V26 definitions, severities, core-field status.
- `SCORING.md` — Image SEO category (weight 6), deduction formula.
