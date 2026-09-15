'use client';

// ============================================================
// BLOG — editorial list + article pages
// ============================================================
// Serves the platform's REAL editorial content from
// /api/public/blog (ContentItems the product team publishes in
// Sitesmith itself). Featured article, category filter, card
// grid, full article view with TOC + related articles + the
// newsletter signup (real /api/subscribers flow).
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Eyebrow, MarketingButton, Reveal } from './primitives';
import { MKT } from './marketing-header';
import { FinalCta } from './home-page';

interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  category: { name: string; slug: string } | null;
  author: { name: string };
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
  image: { url: string; alt: string } | null;
}

interface ArticleDetail extends BlogArticle {
  seoTitle: string | null;
  seoDescription: string | null;
  author: { name: string; bio: string | null };
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// -------------------- Newsletter signup --------------------

function BlogNewsletter() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 409) throw new Error('failed');
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h3 className="text-lg font-bold text-text-primary">{t('mkt.blog.newsletterTitle')}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('mkt.blog.newsletterBody')}</p>
      {state === 'done' ? (
        <p className="mt-5 rounded-xl bg-mkt-accent-soft px-4 py-3 text-sm font-medium text-mkt-accent-soft-fg" role="status">
          {t('mkt.blog.newsletterSuccess')}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <label className="sr-only" htmlFor="blog-newsletter-email">
            {t('mkt.blog.newsletterPlaceholder')}
          </label>
          <input
            id="blog-newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('mkt.blog.newsletterPlaceholder')}
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className="mkt-focus h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('mkt.blog.newsletterCta')}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {t('mkt.blog.newsletterError')}
        </p>
      )}
    </div>
  );
}

// -------------------- Blog card --------------------

function BlogCard({ article, featured = false }: { article: BlogArticle; featured?: boolean }) {
  const { t, locale } = useT();
  const href = `${MKT.blog}/${article.slug}`;

  return (
    <a
      href={href}
      className={`mkt-card-hover mkt-focus group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card ${
        featured ? 'lg:flex-row' : ''
      }`}
    >
      {article.image && (
        <div className={`relative overflow-hidden bg-muted ${featured ? 'aspect-[16/9] lg:aspect-auto lg:w-1/2' : 'aspect-[16/9]'}`}>
          <img
            src={article.image.url}
            alt={article.image.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className={`flex flex-1 flex-col gap-3 p-6 ${featured ? 'lg:justify-center lg:p-10' : ''}`}>
        {article.category && (
          <span className="w-fit rounded-full bg-mkt-accent-soft px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-mkt-accent-soft-fg">
            {article.category.name}
          </span>
        )}
        <h3 className={`font-bold leading-snug text-text-primary ${featured ? 'text-xl sm:text-2xl' : 'text-base'}`}>
          {article.title}
        </h3>
        <p className={`text-sm leading-relaxed text-text-secondary ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>
          {article.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-text-muted">
          <span>
            {t('mkt.blog.by')} {article.author?.name ?? 'Sitesmith Editorial'}
          </span>
          {article.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {formatDate(article.publishedAt, locale)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {t('mkt.blog.readingTime').replace('{minutes}', String(article.readingMinutes))}
          </span>
        </div>
      </div>
    </a>
  );
}

// -------------------- Blog list page --------------------

export function BlogPage() {
  const { t } = useT();
  const [articles, setArticles] = useState<BlogArticle[] | null>(null);
  const [error, setError] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(false);
    setArticles(null);
    try {
      const res = await fetch('/api/public/blog');
      if (!res.ok) throw new Error('blog failed');
      const json = (await res.json()) as { data?: { articles: BlogArticle[] } };
      setArticles(json.data?.articles ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    if (!articles) return [];
    const set = new Map<string, string>();
    for (const a of articles) if (a.category) set.set(a.category.slug, a.category.name);
    return Array.from(set.entries());
  }, [articles]);

  const filtered = useMemo(
    () => (activeCat ? articles?.filter((a) => a.category?.slug === activeCat) : articles),
    [articles, activeCat],
  );

  const [featured, ...rest] = filtered ?? [];

  return (
    <>
      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mkt-dotgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="mkt-container relative pb-4">
          <Reveal>
            <div className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>{t('mkt.blog.featured')}</Eyebrow>
              <h1 className="mkt-display text-4xl text-text-primary sm:text-5xl">{t('mkt.blog.title')}</h1>
              <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                {t('mkt.blog.subtitle')}
              </p>
            </div>
          </Reveal>

          {/* Category filter */}
          {categories.length > 1 && (
            <Reveal delay={80}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label={t('mkt.blog.categories')}>
                <button
                  role="tab"
                  aria-selected={activeCat === null}
                  onClick={() => setActiveCat(null)}
                  className={`mkt-focus h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
                    activeCat === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t('mkt.blog.all')}
                </button>
                {categories.map(([slug, name]) => (
                  <button
                    key={slug}
                    role="tab"
                    aria-selected={activeCat === slug}
                    onClick={() => setActiveCat(slug)}
                    className={`mkt-focus h-9 rounded-full border px-4 text-xs font-medium transition-colors ${
                      activeCat === slug
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {/* Content */}
          <div className="mt-12 pb-8">
            {error ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-sm text-text-secondary">{t('mkt.blog.error')}</p>
                <button
                  onClick={load}
                  className="mkt-focus inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-text-primary hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('mkt.pricing.retry')}
                </button>
              </div>
            ) : !articles ? (
              <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('mkt.blog.loading')}
              </div>
            ) : articles.length === 0 ? (
              <p className="py-16 text-center text-sm text-text-muted">{t('mkt.blog.empty')}</p>
            ) : (
              <div className="flex flex-col gap-6 sm:gap-8">
                {featured && (
                  <Reveal>
                    <div>
                      <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t('mkt.blog.featured')}
                      </p>
                      <BlogCard article={featured} featured />
                    </div>
                  </Reveal>
                )}
                {rest.length > 0 && (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((a, i) => (
                      <Reveal key={a.slug} delay={i * 60} className="h-full">
                        <BlogCard article={a} />
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mkt-section pt-8">
        <div className="mkt-container max-w-3xl">
          <Reveal>
            <BlogNewsletter />
          </Reveal>
        </div>
      </section>
    </>
  );
}

// -------------------- Article page --------------------

export function BlogArticlePage({ slug }: { slug: string }) {
  const { t, locale } = useT();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [related, setRelated] = useState<BlogArticle[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'notfound'>('loading');

  // Per-article document title (overrides the generic route title).
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} — ${t('mkt.brand.name')}`;
    }
  }, [article, t]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const res = await fetch(`/api/public/blog/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setState('notfound');
          return;
        }
        if (!res.ok) throw new Error('failed');
        const json = (await res.json()) as { data?: { article: ArticleDetail; related: BlogArticle[] } };
        if (!json.data) throw new Error('no data');
        setArticle(json.data.article);
        setRelated(json.data.related ?? []);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2.5 pt-24 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('mkt.blog.loading')}
      </div>
    );
  }

  if (state === 'error' || state === 'notfound' || !article) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 pt-24 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          {state === 'notfound' ? t('mkt.common.notFoundTitle') : t('mkt.common.errorTitle')}
        </h1>
        <p className="max-w-sm text-sm text-text-secondary">{t('mkt.common.notFoundBody')}</p>
        <MarketingButton href={MKT.blog} variant="secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('mkt.blog.backToBlog')}
        </MarketingButton>
      </div>
    );
  }

  return (
    <>
      <article className="pt-28 sm:pt-36">
        <div className="mkt-container max-w-3xl">
          <Reveal>
            <a
              href={MKT.blog}
              className="mkt-focus inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('mkt.blog.backToBlog')}
            </a>

            <header className="mt-8 flex flex-col gap-5">
              {article.category && (
                <span className="w-fit rounded-full bg-mkt-accent-soft px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-mkt-accent-soft-fg">
                  {article.category.name}
                </span>
              )}
              <h1 className="mkt-display text-3xl text-text-primary sm:text-[2.75rem]">{article.title}</h1>
              <p className="text-base leading-relaxed text-text-secondary sm:text-lg">{article.excerpt}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border py-3.5 text-sm text-text-muted">
                <span className="font-medium text-text-secondary">
                  {t('mkt.blog.by')} {article.author.name}
                </span>
                {article.publishedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(article.publishedAt, locale)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('mkt.blog.readingTime').replace('{minutes}', String(article.readingMinutes))}
                </span>
              </div>
            </header>
          </Reveal>

          {article.image && (
            <Reveal delay={80}>
              <figure className="mt-10 overflow-hidden rounded-2xl border border-border">
                      <img
                  src={article.image.url}
                  alt={article.image.alt}
                  loading="eager"
                  decoding="async"
                  className="w-full object-cover"
                />
              </figure>
            </Reveal>
          )}

          <Reveal delay={100}>
            <div
              className="mkt-prose mt-10"
              // Article HTML is generated by the product's own Tiptap
              // editor + curated seed content (no user-supplied input).
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          </Reveal>

          {/* Author bio */}
          {article.author.bio && (
            <div className="mt-12 rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-text-primary">{article.author.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{article.author.bio}</p>
            </div>
          )}
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mkt-section pt-10" aria-labelledby="related-heading">
          <div className="mkt-container max-w-5xl">
            <h2 id="related-heading" className="text-lg font-bold text-text-primary">
              {t('mkt.blog.related')}
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <BlogCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="pb-8 pt-6">
        <div className="mkt-container max-w-3xl">
          <BlogNewsletter />
        </div>
      </section>
    </>
  );
}
