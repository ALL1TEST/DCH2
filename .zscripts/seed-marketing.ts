// ============================================================
// MARKETING SEED — blog editorial content + demo site
// ============================================================
// Seeds the PUBLIC marketing surfaces with REAL product data:
//
//   1. Media records for the generated editorial covers
//      (public/uploads/blog/*.png → Media rows)
//   2. The platform's OWN blog articles (ContentItem, siteId NULL,
//      contentType 'post', PUBLISHED) — 4 new product-craft articles
//      + covers/categories attached to the 4 existing tech articles
//   3. A demo site owned by admin@example.com with its own content
//      so the client dashboard (Articles, Dashboard stats, Media)
//      shows real data for product screenshots
//
// Idempotent: every step upserts by a stable natural key.
// Run: bun run .zscripts/seed-marketing.ts
// ============================================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

const BLOG_DIR = path.join(process.cwd(), 'public', 'uploads', 'blog');

interface CoverSpec {
  filename: string;
  alt: string;
  seoTitle: string;
}

const COVERS: CoverSpec[] = [
  { filename: 'workflow-cover.png', alt: 'Abstract illustration of scattered documents converging into one stream', seoTitle: 'The editorial workflow issue' },
  { filename: 'seo-cover.png', alt: 'Abstract illustration of a magnifying glass over a checklist', seoTitle: 'A practical SEO checklist' },
  { filename: 'ai-writing-cover.png', alt: 'Abstract illustration of a typewriter with circuit patterns', seoTitle: 'Writing with AI' },
  { filename: 'automation-cover.png', alt: 'Abstract illustration of interconnected gears forming a path', seoTitle: 'What to automate first' },
  { filename: 'media-cover.png', alt: 'Abstract illustration of a tidy gallery grid', seoTitle: 'Organizing a media library' },
  { filename: 'typescript-cover.png', alt: 'Abstract illustration of geometric building blocks', seoTitle: 'Getting started with TypeScript' },
  { filename: 'performance-cover.png', alt: 'Abstract illustration of speed lines and an ascending chart', seoTitle: 'Next.js performance optimization' },
  { filename: 'design-system-cover.png', alt: 'Abstract illustration of design system components on a grid', seoTitle: 'Building a design system' },
  { filename: 'scaling-cover.png', alt: 'Abstract illustration of figures ascending a staircase', seoTitle: 'Startup scaling strategies' },
];

// ---- Article HTML bodies (editorial, product-honest) ----

const articleWorkflow = `
<p>Most content teams don't have a writing problem — they have a pipeline problem. The draft lives in one app, the SEO check happens in another, images sit in a shared drive, and publishing means copy-pasting into a CMS at the end of a long Friday.</p>
<h2>The real cost of tool sprawl</h2>
<p>Every hand-off between tools is a place where context gets lost. The writer doesn't see the SEO report. The editor can't find the latest image. Nobody remembers whether the canonical tags were checked. When something breaks, there's no history to inspect — just five browser tabs and a Slack thread.</p>
<p>The fix isn't another tool. It's removing the seams.</p>
<h2>One pipeline, end to end</h2>
<p>In Sitesmith, an article moves through its whole life in one place: drafted in the editor with AI assistance, checked against per-page SEO with focus keywords, illustrated from the media library, routed through review, scheduled on the calendar, and published straight to the connected site. Every state change is recorded; every asset is one click away.</p>
<ul>
<li><strong>Draft</strong> — write with prompts and editorial style checks</li>
<li><strong>Review</strong> — roles and assignments mirror a real editorial team</li>
<li><strong>Schedule</strong> — the calendar shows what ships when</li>
<li><strong>Publish</strong> — pushed to WordPress or your REST CMS directly</li>
</ul>
<h2>Where to start</h2>
<p>Pick your most repetitive content process — say, the weekly roundup — and run it entirely inside one pipeline for a month. You'll notice the difference in the first week: fewer tabs, fewer mistakes, and a searchable history of every decision.</p>
`;

const articleSeo = `
<p>SEO tools love complexity. Rankings dashboards, score widgets, a hundred signals blinking for attention. But when you're about to hit publish, you only need a short, honest checklist.</p>
<h2>Before you publish</h2>
<ul>
<li><strong>One focus keyword per page.</strong> Decide what this page should rank for, and make sure the title, the opening paragraph, and one heading actually contain it.</li>
<li><strong>A title that earns the click.</strong> Under 60 characters, specific, and written for a human who is scanning a results page.</li>
<li><strong>A meta description that adds information.</strong> It won't rank for you, but it's your ad copy on the results page.</li>
<li><strong>Descriptive URL slug.</strong> Short, lowercase, hyphenated, no filler words.</li>
<li><strong>One H1.</strong> Then a clear hierarchy of H2s and H3s that a scanner can follow.</li>
</ul>
<h2>Structural checks</h2>
<p>Open the SEO panel and confirm the technical layer: canonical tag set, Open Graph and Twitter images in place, internal links pointing at live pages, and no broken links in the body. If your site has a sitemap, verify the new URL will be included; if it has an indexing monitor, check the page isn't accidentally noindexed.</p>
<h2>After you publish</h2>
<p>Give the page a week, then look at the numbers that matter: impressions in Search Console, average position for the focus keyword, and clicks. Adjust the title or the opening paragraph if impressions are there but clicks aren't. SEO is a feedback loop, not a one-shot game.</p>
`;

const articleAiWriting = `
<p>AI writing has a reputation problem: everything it produces sounds like everything else. The smooth, confident, flavorless voice of a million optimized posts. But the problem isn't the model — it's how people use it.</p>
<h2>Use AI for structure, not for voice</h2>
<p>The parts of writing that benefit most from AI are the mechanical ones: turning a rough idea into an outline, generating a first pass at a section you already understand, rephrasing a paragraph that fights you. The parts that need you are judgment, taste, and lived experience — the reason a reader chooses your site over the first search result.</p>
<h2>A workflow that keeps your voice</h2>
<ul>
<li><strong>Start with your own notes.</strong> Even ten messy bullet points anchor the draft in what you actually think.</li>
<li><strong>Draft sections, not the whole piece.</strong> Generate in pieces and rewrite as you go — don't outsource the whole arc.</li>
<li><strong>Read it aloud.</strong> Any sentence you wouldn't say out loud is a sentence to rewrite.</li>
<li><strong>Run a style check.</strong> Sitesmith's editorial skills can flag generic phrasing and off-style constructions before you publish.</li>
</ul>
<h2>Bring your own model</h2>
<p>There's no reason your assistant should be locked to one vendor. Connect your own AI provider, keep your keys, and pick the model that fits the job — a fast one for outlines, a stronger one for research-heavy sections. Usage is tracked per plan, so the bill never surprises you.</p>
<h2>The honest rule</h2>
<p>If a piece could have been written by anyone, it will be read by no one. Use AI to remove friction, not to remove yourself.</p>
`;

const articleAutomation = `
<p>"Automation" conjures images of complicated flowcharts and brittle integrations. In practice, the best automations are small, boring, and deeply specific to your routine.</p>
<h2>Start with what you repeat</h2>
<p>For two weeks, write down every task you do more than twice around publishing. The list usually looks like this:</p>
<ul>
<li>Sharing each new article to the newsletter</li>
<li>Running an SEO check before publishing</li>
<li>Notifying the editor when a draft is ready for review</li>
<li>Re-generating the sitemap after publishing</li>
<li>Archiving expired campaigns</li>
</ul>
<p>Each of these is a candidate. None of them needs a flowchart with nineteen nodes.</p>
<h2>The trigger-action habit</h2>
<p>Every automation is just a trigger and a few steps. <em>When an article is published → send the newsletter campaign → notify the team → log the run.</em> Build one, watch it run for a week, then build the next. Sitesmith's automation builder gives you triggers on content events, publishing steps, and schedules — plus a run history so you can see exactly what happened, and why.</p>
<h2>Know when not to automate</h2>
<p>Don't automate anything you haven't done manually at least five times. You can't automate a process you don't understand, and the failure mode is silent: an automation that quietly does the wrong thing every Tuesday. Keep humans in the loop for anything with judgment in it — first drafts, replies to readers, pricing pages.</p>
<p>Automate the boring. Keep the craft.</p>
`;

const articleMedia = `
<p>Every content site eventually faces the same dark closet: a media library with names like <code>final_v3_FINAL2.png</code>, no folders, no alt text, and 40 versions of the same logo.</p>
<h2>Why it matters more than you think</h2>
<p>A messy library taxes every future article. Writers can't find the right image, so they upload a duplicate. SEO suffers because alt text is missing. Storage fills with orphans nobody dares delete. The library is infrastructure — treat it like a product.</p>
<h2>Four rules that fix 90% of it</h2>
<ul>
<li><strong>Name files for humans.</strong> <code>team-offsite-2025-group-photo.png</code>, not <code>IMG_4471.jpg</code>.</li>
<li><strong>Folder by purpose, not by date.</strong> "Brand", "Blog covers", "Product screenshots" — structures that mirror how you search.</li>
<li><strong>Alt text is not optional.</strong> Write it when you upload, while context is fresh. It's an accessibility feature and an SEO input at once.</li>
<li><strong>One canonical version.</strong> Duplicates multiply; pick one, delete the rest.</li>
</ul>
<h2>Make the tool do the work</h2>
<p>A real media library gives you search, folders, per-site scoping, and usage tracking against your plan's storage. In Sitesmith, every upload carries its alt text, caption, and SEO fields with it — so when the image lands in an article, the metadata lands too. That's the whole trick: metadata at upload time, not at deadline time.</p>
`;

// Existing tech articles get covers + categories (title match)
const existingCovers: Array<{ titleMatch: string; cover: string; categorySlug: string }> = [
  { titleMatch: 'Getting Started with TypeScript', cover: 'typescript-cover.png', categorySlug: 'technology' },
  { titleMatch: 'Next.js Performance', cover: 'performance-cover.png', categorySlug: 'technology' },
  { titleMatch: 'Design System', cover: 'design-system-cover.png', categorySlug: 'design' },
  { titleMatch: 'Startup Scaling', cover: 'scaling-cover.png', categorySlug: 'business' },
];

async function main() {
  console.log('— Marketing seed —');

  const ownerUser = await db.user.findUnique({ where: { email: 'owner@example.com' } });
  if (!ownerUser) throw new Error('owner@example.com not found — run bootstrap first.');

  // ContentItem.authorId carries a SECOND FK to AuthorProfile.userId —
  // every user acting as an article author needs a profile row.
  for (const u of [ownerUser]) {
    const existing = await db.authorProfile.findUnique({ where: { userId: u.id } });
    if (!existing) {
      await db.authorProfile.create({
        data: {
          userId: u.id,
          displayName: 'Platform Owner',
          slug: 'platform-owner',
          bio: 'Writes about content platforms and the craft of publishing.',
        },
      });
      console.log('  + author profile for owner@example.com');
    }
  }

  // ---------- 1. Media records for covers ----------
  const mediaByFile: Record<string, string> = {};
  for (const c of COVERS) {
    const p = path.join(BLOG_DIR, c.filename);
    if (!fs.existsSync(p)) {
      console.warn(`  ! missing cover file: ${c.filename} (skipped)`);
      continue;
    }
    const stat = fs.statSync(p);
    const url = `/uploads/blog/${c.filename}`;
    const existing = await db.media.findFirst({ where: { url }, select: { id: true } });
    const id =
      existing?.id ??
      (
        await db.media.create({
          data: {
            filename: c.filename,
            originalName: c.filename,
            mimeType: 'image/png',
            size: stat.size,
            width: 1344,
            height: 768,
            alt: c.alt,
            seoTitle: c.seoTitle,
            url,
            thumbnailUrl: url,
            uploadedById: ownerUser.id,
          },
        })
      ).id;
    mediaByFile[c.filename] = id;
  }
  console.log(`  Media covers: ${Object.keys(mediaByFile).length}`);

  // ---------- 2. Blog articles (platform-level, siteId NULL) ----------
  const postType = await db.contentType.findFirst({ where: { slug: 'post' } });
  if (!postType) throw new Error('Content type "post" not found — run the base seed first.');
  const editorUser = (await db.user.findUnique({ where: { email: 'editor@example.com' } })) ?? ownerUser;

  const catTech = await db.category.findFirst({ where: { slug: 'technology' } });
  const catDesign = await db.category.findFirst({ where: { slug: 'design' } });
  const catBusiness = await db.category.findFirst({ where: { slug: 'business' } });
  const catSeo = (await db.category.findFirst({ where: { slug: 'seo' } })) ??
    (await db.category.create({ data: { name: 'SEO', slug: 'seo', description: 'Search engine optimization' } }));
  const catProduct = (await db.category.findFirst({ where: { slug: 'product-craft' } })) ??
    (await db.category.create({ data: { name: 'Product Craft', slug: 'product-craft', description: 'Notes on building Sitesmith and content workflows' } }));

  const newArticles = [
    {
      slug: 'editorial-workflow-one-pipeline',
      title: 'The Editorial Workflow Issue: Why Six Tools Is Five Too Many',
      excerpt: 'Most content teams don’t have a writing problem — they have a pipeline problem. Here’s how to remove the seams.',
      html: articleWorkflow,
      cover: 'workflow-cover.png',
      categoryId: catProduct.id,
      authorId: ownerUser.id,
      daysAgo: 3,
    },
    {
      slug: 'practical-seo-checklist-before-publish',
      title: 'A Practical SEO Checklist Before You Hit Publish',
      excerpt: 'Score widgets can wait. This is the short, honest list to run through before an article goes live.',
      html: articleSeo,
      cover: 'seo-cover.png',
      categoryId: catSeo.id,
      authorId: editorUser.id,
      daysAgo: 10,
    },
    {
      slug: 'writing-with-ai-without-sounding-like-everyone',
      title: 'Writing With AI Without Sounding Like Everyone Else',
      excerpt: 'Use AI for structure, not for voice. A workflow that keeps your writing yours.',
      html: articleAiWriting,
      cover: 'ai-writing-cover.png',
      categoryId: catProduct.id,
      authorId: ownerUser.id,
      daysAgo: 17,
    },
    {
      slug: 'what-to-automate-first',
      title: 'From Manual to Automatic: What to Automate First',
      excerpt: 'The best automations are small, boring, and deeply specific. Start with what you repeat.',
      html: articleAutomation,
      cover: 'automation-cover.png',
      categoryId: catProduct.id,
      authorId: ownerUser.id,
      daysAgo: 25,
    },
    {
      slug: 'organizing-media-library',
      title: 'Organizing a Media Library You’ll Actually Use',
      excerpt: 'Four rules that fix 90% of the dark closet problem — and how metadata at upload time saves deadlines.',
      html: articleMedia,
      cover: 'media-cover.png',
      categoryId: catProduct.id,
      authorId: editorUser.id,
      daysAgo: 32,
    },
  ];

  for (const a of newArticles) {
    const existing = await db.contentItem.findFirst({ where: { slug: a.slug, siteId: null } });
    const data = {
      title: a.title,
      slug: a.slug,
      status: 'PUBLISHED' as const,
      content: a.html,
      excerpt: a.excerpt,
      authorId: a.authorId,
      contentTypeId: postType.id,
      featuredImageId: mediaByFile[a.cover] ?? null,
      categoryId: a.categoryId,
      siteId: null,
      publishedAt: new Date(Date.now() - a.daysAgo * 24 * 3600 * 1000),
      seoTitle: a.title,
      seoDescription: a.excerpt,
    };
    if (existing) {
      await db.contentItem.update({ where: { id: existing.id }, data });
      console.log(`  ~ updated: ${a.slug}`);
    } else {
      await db.contentItem.create({ data });
      console.log(`  + created: ${a.slug}`);
    }
  }

  // ---------- 3. Existing tech articles: covers + categories ----------
  for (const ec of existingCovers) {
    const item = await db.contentItem.findFirst({
      where: { title: { contains: ec.titleMatch }, siteId: null },
    });
    if (!item) {
      console.warn(`  ! no existing article matches "${ec.titleMatch}"`);
      continue;
    }
    const cat = ec.categorySlug === 'technology' ? catTech : ec.categorySlug === 'design' ? catDesign : catBusiness;
    await db.contentItem.update({
      where: { id: item.id },
      data: {
        featuredImageId: mediaByFile[ec.cover] ?? item.featuredImageId,
        categoryId: cat?.id ?? item.categoryId,
        excerpt: item.excerpt ?? item.title,
      },
    });
    console.log(`  ~ cover attached: ${item.title}`);
  }

  // Ensure the existing "About Us"/"Privacy Policy" demo items are Pages
  // (the public blog feed filters to contentType 'post').
  const pageType = await db.contentType.findFirst({ where: { slug: 'page' } });
  if (pageType) {
    for (const t of ['About Us', 'Privacy Policy']) {
      const item = await db.contentItem.findFirst({ where: { title: t, siteId: null } });
      if (item && item.contentTypeId !== pageType.id) {
        await db.contentItem.update({ where: { id: item.id }, data: { contentTypeId: pageType.id } });
        console.log(`  ~ reclassified as page: ${t}`);
      }
    }
  }

  // ---------- 4. Demo site for dashboard screenshots ----------
  const adminUser = await db.user.findUnique({ where: { email: 'admin@example.com' } });
  if (!adminUser) throw new Error('admin@example.com not found — run the base seed first.');

  let demoSite = await db.site.findFirst({ where: { slug: 'craft-journal', ownerId: adminUser.id } });
  if (!demoSite) {
    demoSite = await db.site.create({
      data: {
        name: 'The Craft Journal',
        slug: 'craft-journal',
        description: 'A demo site about content craft — managed in Sitesmith.',
        status: 'ACTIVE',
        ownerId: adminUser.id,
      },
    });
    console.log('  + demo site: The Craft Journal');
  } else {
    console.log('  = demo site exists');
  }

  // Site-scoped categories
  const siteCats: Record<string, string> = {};
  for (const c of [
    { name: 'Craft', slug: 'craft' },
    { name: 'Field Notes', slug: 'field-notes' },
  ]) {
    const cat =
      (await db.category.findFirst({ where: { slug: c.slug, siteId: demoSite.id } })) ??
      (await db.category.create({ data: { name: c.name, slug: c.slug, siteId: demoSite.id } }));
    siteCats[c.slug] = cat.id;
  }

  const siteArticles = [
    { title: 'Why Small Teams Write Better Documentation', slug: 'small-teams-better-documentation', status: 'PUBLISHED', daysAgo: 2, cat: 'craft', cover: 'workflow-cover.png' },
    { title: 'The Two-Hour Editorial Calendar', slug: 'two-hour-editorial-calendar', status: 'PUBLISHED', daysAgo: 6, cat: 'craft', cover: 'media-cover.png' },
    { title: 'Notes on Running a Weekly Newsletter', slug: 'running-weekly-newsletter', status: 'PUBLISHED', daysAgo: 12, cat: 'field-notes', cover: 'automation-cover.png' },
    { title: 'Interviewing Your Own Readers', slug: 'interviewing-your-own-readers', status: 'IN_REVIEW', daysAgo: 1, cat: 'field-notes', cover: 'seo-cover.png' },
    { title: 'A Gentle Argument for Fewer Plugins', slug: 'argument-for-fewer-plugins', status: 'DRAFT', daysAgo: 0, cat: 'craft', cover: 'design-system-cover.png' },
    { title: 'What We Learned Migrating 200 Posts', slug: 'migrating-200-posts', status: 'SCHEDULED', daysAhead: 3, cat: 'craft', cover: 'performance-cover.png' },
  ];

  for (const sa of siteArticles) {
    const existing = await db.contentItem.findFirst({ where: { slug: sa.slug, siteId: demoSite.id } });
    if (existing) continue;
    await db.contentItem.create({
      data: {
        title: sa.title,
        slug: sa.slug,
        status: sa.status as 'PUBLISHED' | 'IN_REVIEW' | 'DRAFT' | 'SCHEDULED',
        content: `<p>${sa.title} — a working draft managed in the Sitesmith demo site. The editor, media library, SEO panel and publishing flow are all part of the real product.</p><h2>Why this exists</h2><p>Demo content for the Craft Journal shows how a real editorial team uses one pipeline for drafts, review, scheduling and publishing.</p>`,
        excerpt: `Notes from the Craft Journal: ${sa.title.toLowerCase()}.`,
        authorId: adminUser.id,
        contentTypeId: postType.id,
        featuredImageId: mediaByFile[sa.cover] ?? null,
        categoryId: siteCats[sa.cat],
        siteId: demoSite.id,
        publishedAt:
          sa.status === 'PUBLISHED'
            ? new Date(Date.now() - (sa.daysAgo ?? 0) * 24 * 3600 * 1000)
            : sa.status === 'SCHEDULED'
              ? new Date(Date.now() + (sa.daysAhead ?? 0) * 24 * 3600 * 1000)
              : null,
        scheduledAt:
          sa.status === 'SCHEDULED' ? new Date(Date.now() + (sa.daysAhead ?? 0) * 24 * 3600 * 1000) : null,
      },
    });
    console.log(`  + site article: ${sa.title} [${sa.status}]`);
  }

  // ---------- 5. Summary ----------
  const blogCount = await db.contentItem.count({
    where: { status: 'PUBLISHED', siteId: null, deletedAt: null, contentType: { slug: 'post' } },
  });
  console.log(`\nDone. Public blog articles: ${blogCount}`);
  console.log('Demo site articles:', await db.contentItem.count({ where: { siteId: demoSite.id } }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
