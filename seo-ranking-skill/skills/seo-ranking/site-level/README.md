# Site-Level SEO — Optional Maintenance Reference

> **NOT part of the article-generation pipeline.** The modules in this folder never auto-execute when an article is generated, regenerated, edited, improved, or bulk-produced. They run only when a human or a scheduled maintenance job explicitly requests a site-level review, and only with real access data.

## Why this folder exists

The CMS this skill integrates into already owns site-level SEO in its own SEO section:

- SEO Overview
- SEO Audit
- Search Console
- SEO Settings
- Sitemap
- Robots.txt
- Redirects
- Technical SEO monitoring

These are **site-level concerns**. This skill package does not redesign them, does not duplicate them, and does not re-run them per article. Generating an article must never trigger a robots.txt audit, a sitemap audit, a Core Web Vitals audit, a crawlability sweep, or a site-wide indexing/redirect/broken-link/architecture audit.

The two modules kept here are **optional maintenance references** — condensed, evidence-gated methodology for the rare occasions where the integrating agent is asked to help with site-level maintenance work (a technical sprint, a ranking-drop diagnosis that is not content-related, a Search Console review). They are reference material, not pipeline stages.

## Contents

| Module | Covers | Runs when |
|---|---|---|
| `TECHNICAL-SEO.md` | Crawlability, robots.txt, sitemap hygiene, canonicals, redirects, duplicates, broken links, mobile, Core Web Vitals — all evidence-gated | Manual/scheduled site-level audits only |
| `INDEXING.md` | Indexation status, sitemap coverage, Search Console performance reporting | Manual/scheduled reviews with a real GSC integration only |

## Effect on per-article scoring

In the per-article pipeline, the validation report's **Technical section is `NOT_MEASURABLE` by default** and the **Technical SEO Score is `null`** — the article gate is the SEO Content Score plus the verdict, and Overall SEO Health is reported on a `content-only` basis. Site-level technical numbers appear in reports only when the CMS explicitly supplies real site-level data, and then they are maintenance context, never an article-generation gate.

See `../PIPELINE.md` §5 for the full article-level vs site-level scope table, and `../SCORING.md` §2 for the scoring consequences.
