import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, fail } from '@/lib/platform/platform-auth';

// ============================================================
// GET /api/public/blog/[slug] — PUBLIC single article for the
// marketing site's editorial article page.
// ============================================================
// Read-only, unauthenticated. Same scoping rule as the list
// endpoint: platform-level (siteId NULL) published content only.
// Also returns up to 3 related articles (same category, excluding
// the current one) for the related-articles rail.
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

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const article = await db.contentItem.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        siteId: null,
        deletedAt: null,
        contentType: { slug: 'post' },
      },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        updatedAt: true,
        seoTitle: true,
        seoDescription: true,
        author: { select: { name: true, bio: true } },
        category: { select: { name: true, slug: true } },
        featuredImage: { select: { url: true, alt: true } },
      },
    });

    if (!article) {
      return fail('ARTICLE_NOT_FOUND', 'Article not found', 404);
    }

    // Related articles — same category, published, not this one.
    let relatedArticles: Array<{
      slug: string;
      title: string;
      excerpt: string;
      readingMinutes: number;
      image: { url: string; alt: string } | null;
    }> = [];

    if (article.category) {
      const rel = await db.contentItem.findMany({
        where: {
          status: 'PUBLISHED',
          siteId: null,
          deletedAt: null,
          contentType: { slug: 'post' },
          slug: { not: article.slug },
          OR: [
            { category: { slug: article.category.slug } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          content: true,
          author: { select: { name: true } },
          featuredImage: { select: { url: true, alt: true } },
        },
      });
      relatedArticles = rel.map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt ?? '',
        author: { name: r.author?.name ?? 'Karmax Editorial' },
        readingMinutes: readingMinutes(r.content),
        image: r.featuredImage
          ? { url: r.featuredImage.url, alt: r.featuredImage.alt ?? r.title }
          : null,
      }));
    }

    return ok({
      article: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? '',
        html: article.content ?? '',
        publishedAt: article.publishedAt?.toISOString() ?? null,
        updatedAt: article.updatedAt.toISOString(),
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        author: {
          name: article.author?.name ?? 'Karmax Editorial',
          bio: article.author?.bio ?? null,
        },
        category: article.category
          ? { name: article.category.name, slug: article.category.slug }
          : null,
        readingMinutes: readingMinutes(article.content),
        image: article.featuredImage
          ? { url: article.featuredImage.url, alt: article.featuredImage.alt ?? article.title }
          : null,
      },
      related: relatedArticles,
    });
  } catch {
    return fail('ARTICLE_UNAVAILABLE', 'Article is temporarily unavailable', 503);
  }
}
