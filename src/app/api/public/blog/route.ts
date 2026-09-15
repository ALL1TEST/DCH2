import { db } from '@/lib/db';
import { ok, fail } from '@/lib/platform/platform-auth';

// ============================================================
// GET /api/public/blog — PUBLIC editorial feed for the marketing
// site's Blog page.
// ============================================================
// Read-only, unauthenticated. Serves the platform's OWN published
// editorial content: ContentItems with a NULL siteId (platform-level
// articles, not any tenant's site data). Tenant site content is
// NEVER exposed here — the marketing blog only shows what the
// product team publishes in Sitesmith itself.
//
// Shape (ApiResponse envelope):
//   {
//     articles: Array<{
//       slug, title, excerpt, html, category: { name, slug } | null,
//       author: { name }, publishedAt, readingMinutes, image: { url, alt } | null
//     }>
//   }
// ============================================================

const WORDS_PER_MINUTE = 200;

function readingMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export async function GET() {
  try {
    const rows = await db.contentItem.findMany({
      where: {
        status: 'PUBLISHED',
        siteId: null,
        deletedAt: null,
        contentType: { slug: 'post' },
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
        category: { select: { name: true, slug: true } },
        featuredImage: { select: { url: true, alt: true } },
      },
    });

    const articles = rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt ?? '',
      html: r.content ?? '',
      category: r.category
        ? { name: r.category.name, slug: r.category.slug }
        : null,
      author: { name: r.author?.name ?? 'Sitesmith Editorial' },
      publishedAt: r.publishedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      readingMinutes: readingMinutes(r.content),
      image: r.featuredImage
        ? { url: r.featuredImage.url, alt: r.featuredImage.alt ?? r.title }
        : null,
    }));

    return ok({ articles });
  } catch {
    return fail('BLOG_UNAVAILABLE', 'The blog is temporarily unavailable', 503);
  }
}
