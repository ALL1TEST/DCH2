'use client';

import { create } from 'zustand';
import { getApi, postApi } from '@/lib/api-client';

// -------------------- Types --------------------

export interface Site {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'ARCHIVED';
  config: Record<string, unknown> | null;
  planId?: string;
  planScope?: string | null;
  billingInterval?: string;
  plan?: {
    planId: string;
    name: string;
    badgeVariant?: string;
    priceMonthly?: number;
    priceYearly?: number;
    currency?: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    contentItems: number;
    media: number;
    categories: number;
    tags: number;
  };
}

export type SiteContext =
  | { type: 'all' }
  | { type: 'site'; siteId: string; siteSlug: string };

const STORAGE_KEY = 'cms_active_site';
const DBID_STORAGE_KEY = 'cms_active_site_dbid';

// -------------------- State --------------------

interface SiteState {
  sites: Site[];
  /** The site's DB `id` (cuid) when a single site is active, null for All Sites */
  activeSiteDbId: string | null;
  /** Human-readable slug for URL persistence */
  activeSiteSlug: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  fetchSites: () => Promise<void>;
  /** Switch site by DB id, slug, or null for All Sites */
  setActiveSite: (siteRef: string | null) => void;
  /** Switch directly to All Sites / Network mode */
  setAllSites: () => void;
  /** Get the active site object (null if All Sites) */
  getActiveSite: () => Site | null;
  /** Whether we're in All Sites / Network mode */
  isAllSites: () => boolean;
  /** Get the canonical site context */
  getSiteContext: () => SiteContext;
  /** Get the DB id to send in API calls (null for All Sites) */
  createSite: (data: {
    name: string;
    slug: string;
    domain?: string;
    description?: string;
    planId?: string;
    siteType?: 'standard' | 'wordpress';
    config?: Record<string, unknown>;
  }) => Promise<Site>;
  updateSite: (id: string, data: { name?: string; slug?: string; domain?: string; description?: string; status?: string; planId?: string; config?: Record<string, unknown> }) => Promise<void>;
  deleteSite: (id: string) => Promise<void>;
  reset: () => void;
}

// -------------------- Helpers --------------------

function readFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readDbIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(DBID_STORAGE_KEY);
    return v && v !== 'all' ? v : null;
  } catch {
    return null;
  }
}

function writeToStorage(slug: string | null, dbId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!slug) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DBID_STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, slug);
      if (dbId) localStorage.setItem(DBID_STORAGE_KEY, dbId);
    }
  } catch {
    // Storage full or unavailable
  }
}

function readFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const siteId = params.get('siteId');
  if (!siteId || siteId === 'all' || siteId === '') return null;
  return siteId;
}

/**
 * Resolve a slug or DB id to { dbId, slug }.
 * Checks slug first (URL), then DB id.
 */
function resolveSiteRef(ref: string | null, sites: Site[]): { dbId: string | null; slug: string | null } {
  if (!ref || ref === 'all') return { dbId: null, slug: null };

  // Try matching by slug first (what the URL contains)
  const bySlug = sites.find((s) => s.slug === ref);
  if (bySlug) return { dbId: bySlug.id, slug: bySlug.slug };

  // Try matching by DB id (cuid)
  const byId = sites.find((s) => s.id === ref);
  if (byId) return { dbId: byId.id, slug: byId.slug };

  // Unknown reference — the stored/URL site no longer exists in the
  // user's visible list (deleted, or filtered out by a plan change).
  // Fall back to "All Sites" (null) so the selector never points at a
  // nonexistent site. Previously this returned the stale ref as-is,
  // leaving the selector pinned to a site the user can no longer
  // access. "All Sites" is always a valid global selection.
  return { dbId: null, slug: null };
}

// -------------------- Store --------------------

const initialPreloadSlug = typeof window !== 'undefined' ? (readFromUrl() ?? readFromStorage()) : null;
const initialPreloadDbId = typeof window !== 'undefined' ? readDbIdFromStorage() : null;

export const useSiteStore = create<SiteState>((set, get) => ({
  sites: [],
  activeSiteDbId: initialPreloadSlug && initialPreloadSlug !== 'all' ? (initialPreloadDbId ?? initialPreloadSlug) : null,
  activeSiteSlug: initialPreloadSlug && initialPreloadSlug !== 'all' ? initialPreloadSlug : null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const urlRef = readFromUrl();
    const storedRef = readFromStorage();
    const storedDbId = readDbIdFromStorage();
    const initialRef = urlRef !== null ? urlRef : storedRef;

    // Set preliminary state
    set({
      activeSiteSlug: initialRef,
      activeSiteDbId: initialRef && initialRef !== 'all' ? (storedDbId ?? initialRef) : null,
      isLoading: true,
    });

    try {
      await get().fetchSites();
      // After sites are loaded, resolve the reference properly
      const { activeSiteSlug: currentRef, sites } = get();
      const resolved = resolveSiteRef(currentRef, sites);
      set({
        activeSiteDbId: resolved.dbId,
        activeSiteSlug: resolved.slug,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load sites',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  fetchSites: async () => {
    try {
      const data = await getApi<Site[]>('/api/sites', { pageSize: 100 });
      const sites = Array.isArray(data) ? data : [];
      set({ sites });
      // After a re-fetch (e.g. when queries are invalidated after a
      // plan change or site create/delete), the currently-selected
      // site may no longer be in the visible list. If so, fall back to
      // "All Sites" so the selector never points at a site the user
      // can no longer access. "All Sites" (null activeSiteDbId) is
      // always valid — even when the user has 0 sites.
      const { activeSiteDbId, activeSiteSlug } = get();
      if (activeSiteDbId) {
        const stillExists = sites.some((s) => s.id === activeSiteDbId);
        if (!stillExists) {
          set({ activeSiteDbId: null, activeSiteSlug: null });
          writeToStorage(null, null);
        }
      } else if (activeSiteSlug) {
        // Slug-only stale state (no dbId resolved yet) — clear it too.
        const slugExists = sites.some((s) => s.slug === activeSiteSlug);
        if (!slugExists) {
          set({ activeSiteSlug: null });
          writeToStorage(null, null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    }
  },

  setActiveSite: (siteRef) => {
    if (!siteRef || siteRef === 'all') {
      get().setAllSites();
      return;
    }

    const { sites } = get();
    const { dbId, slug } = resolveSiteRef(siteRef, sites);

    set({ activeSiteDbId: dbId, activeSiteSlug: slug });
    writeToStorage(slug, dbId);

    // Update URL with slug for human readability
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (slug) {
        url.searchParams.set('siteId', slug);
      } else {
        url.searchParams.delete('siteId');
      }
      window.history.replaceState(null, '', url.toString());
    }
  },

  setAllSites: () => {
    set({ activeSiteDbId: null, activeSiteSlug: null });
    writeToStorage(null, null);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('siteId');
      window.history.replaceState(null, '', url.toString());
    }
  },

  getActiveSite: () => {
    const { sites, activeSiteDbId } = get();
    if (!activeSiteDbId) return null;
    return sites.find((s) => s.id === activeSiteDbId) ?? null;
  },

  isAllSites: () => {
    const { activeSiteDbId } = get();
    return !activeSiteDbId;
  },

  getSiteContext: () => {
    const { activeSiteDbId, activeSiteSlug } = get();
    if (!activeSiteDbId) return { type: 'all' };
    return { type: 'site', siteId: activeSiteDbId, siteSlug: activeSiteSlug ?? activeSiteDbId };
  },

  getSiteDbId: () => {
    return get().activeSiteDbId;
  },

  createSite: async (data) => {
    const site = await postApi<Site>('/api/sites', data);
    await get().fetchSites();
    return site;
  },

  updateSite: async (id, data) => {
    const { patchApi } = await import('@/lib/api-client');
    await patchApi<Site>(`/api/sites/${id}`, data);
    await get().fetchSites();
  },

  deleteSite: async (id) => {
    const { deleteApi } = await import('@/lib/api-client');
    await deleteApi(`/api/sites/${id}`);
    // If we deleted the active site, switch to All Sites
    if (get().activeSiteDbId === id) {
      get().setAllSites();
    }
    await get().fetchSites();
  },

  reset: () => {
    writeToStorage(null, null);
    set({
      sites: [],
      activeSiteDbId: null,
      activeSiteSlug: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  },
}));

// -------------------- URL Change Listener --------------------

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const urlRef = readFromUrl();
    const { activeSiteSlug, sites } = useSiteStore.getState();
    const currentSlug = urlRef;

    if (currentSlug !== activeSiteSlug) {
      const resolved = resolveSiteRef(currentSlug, sites);
      useSiteStore.setState({
        activeSiteDbId: resolved.dbId,
        activeSiteSlug: resolved.slug,
      });
      writeToStorage(resolved.slug, resolved.dbId);
    }
  });
}

// -------------------- Global accessor for api-client (avoids circular deps) --------------------
// This is read by api-client.ts to get the active site's DB ID for API calls.

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__CMS_ACTIVE_SITE_DB_ID__ = undefined;

  // Keep a global in sync with the store
  useSiteStore.subscribe((state) => {
    (window as unknown as Record<string, unknown>).__CMS_ACTIVE_SITE_DB_ID__ = state.activeSiteDbId;
  });

  // Initialize the global immediately
  (window as unknown as Record<string, unknown>).__CMS_ACTIVE_SITE_DB_ID__ = useSiteStore.getState().activeSiteDbId;
}
