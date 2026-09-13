// ============================================================
// SITE CONNECTION CLIENT — Decoupled External API Adapter
// ============================================================

import { SiteConnectionData, PlatformType } from './types';
import { decrypt } from '@/lib/encryption';

export interface RemoteContentItem {
  id: string | number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: string;
  publishedAt?: string;
  categories?: string[];
  featuredImageUrl?: string;
}

export interface RemoteCategory {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
}

/**
 * Standardized Site Connection Interface
 */
export interface ISiteConnectionClient {
  platform: PlatformType;
  siteUrl: string;
  verify(): Promise<{ ok: boolean; message: string }>;
  fetchArticles(params?: { page?: number; limit?: number; search?: string }): Promise<RemoteContentItem[]>;
  publishArticle(data: Partial<RemoteContentItem>): Promise<RemoteContentItem>;
  fetchCategories(): Promise<RemoteCategory[]>;
}

/**
 * Standard CMS HTTP Client Implementation
 */
class StandardCmsClient implements ISiteConnectionClient {
  platform: PlatformType = 'standard';
  siteUrl: string;
  apiBaseUrl: string;
  private apiKey: string;

  constructor(siteUrl: string, apiBaseUrl: string, apiKey: string) {
    this.siteUrl = siteUrl.replace(/\/+$/, '');
    this.apiBaseUrl = (apiBaseUrl || `${siteUrl}/api`).replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiKey,
        'User-Agent': 'Antigravity-CMS-Connection/1.0',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Standard CMS API error (${res.status}): ${errText || res.statusText}`);
    }

    return (await res.json()) as T;
  }

  async verify(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await this.request<{ connected?: boolean }>('/cms/health');
      if (res && res.connected === true) {
        return { ok: true, message: 'Connected' };
      }
      return { ok: false, message: 'External API did not confirm connection' };
    } catch {
      return { ok: false, message: 'Failed to verify Standard CMS connection' };
    }
  }

  async fetchArticles(params?: { page?: number; limit?: number; search?: string }): Promise<RemoteContentItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<RemoteContentItem[]>(`/articles${qs}`);
  }

  async publishArticle(data: Partial<RemoteContentItem>): Promise<RemoteContentItem> {
    return this.request<RemoteContentItem>('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async fetchCategories(): Promise<RemoteCategory[]> {
    return this.request<RemoteCategory[]>('/categories');
  }
}

/**
 * WordPress REST API Client Implementation
 */
class WordPressClient implements ISiteConnectionClient {
  platform: PlatformType = 'wordpress';
  siteUrl: string;
  restApiUrl: string;
  private username: string;
  private appPassword: string;

  constructor(siteUrl: string, restApiUrl: string, username: string, appPassword: string) {
    this.siteUrl = siteUrl.replace(/\/+$/, '');
    this.restApiUrl = (restApiUrl || `${siteUrl}/wp-json`).replace(/\/+$/, '');
    this.username = username;
    this.appPassword = appPassword.replace(/\s+/g, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.restApiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const authHeader = 'Basic ' + Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');

    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Antigravity-CMS-Connection/1.0',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`WordPress REST API error (${res.status}): ${errText || res.statusText}`);
    }

    return (await res.json()) as T;
  }

  async verify(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request('/wp/v2/users/me?context=edit');
      return { ok: true, message: 'Connected' };
    } catch {
      return { ok: false, message: 'Failed to verify WordPress connection' };
    }
  }

  async fetchArticles(params?: { page?: number; limit?: number; search?: string }): Promise<RemoteContentItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('per_page', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    interface WpPost {
      id: number;
      title: { rendered: string };
      slug: string;
      content: { rendered: string };
      excerpt: { rendered: string };
      status: string;
      date: string;
    }

    const posts = await this.request<WpPost[]>(`/wp/v2/posts${qs}`);
    return posts.map((p) => ({
      id: p.id,
      title: p.title?.rendered || '',
      slug: p.slug,
      content: p.content?.rendered || '',
      excerpt: p.excerpt?.rendered || '',
      status: p.status,
      publishedAt: p.date,
    }));
  }

  async publishArticle(data: Partial<RemoteContentItem>): Promise<RemoteContentItem> {
    interface WpPost {
      id: number;
      title: { rendered: string };
      slug: string;
      content: { rendered: string };
      excerpt: { rendered: string };
      status: string;
      date: string;
    }

    const wpPost = await this.request<WpPost>('/wp/v2/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        slug: data.slug,
        excerpt: data.excerpt,
        status: data.status === 'PUBLISHED' ? 'publish' : 'draft',
      }),
    });

    return {
      id: wpPost.id,
      title: wpPost.title?.rendered || '',
      slug: wpPost.slug,
      content: wpPost.content?.rendered || '',
      excerpt: wpPost.excerpt?.rendered || '',
      status: wpPost.status,
      publishedAt: wpPost.date,
    };
  }

  async fetchCategories(): Promise<RemoteCategory[]> {
    interface WpCategory {
      id: number;
      name: string;
      slug: string;
      description?: string;
    }
    const cats = await this.request<WpCategory[]>('/wp/v2/categories?per_page=100');
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
    }));
  }
}

/**
 * Factory to construct an isolated client connection for a given site
 */
export async function getSiteConnectionClient(
  connectionData: SiteConnectionData,
): Promise<ISiteConnectionClient | null> {
  if (!connectionData) return null;

  // Decrypt secret if stored
  let secret = '';
  if (connectionData.encryptedCredentials) {
    try {
      secret = await decrypt(connectionData.encryptedCredentials);
    } catch (err) {
      console.error('Failed to decrypt connection credentials:', err);
    }
  }

  if (connectionData.platform === 'wordpress') {
    return new WordPressClient(
      connectionData.siteUrl,
      connectionData.apiBaseUrl,
      connectionData.username || '',
      secret,
    );
  }

  return new StandardCmsClient(
    connectionData.siteUrl,
    connectionData.apiBaseUrl,
    secret,
  );
}
