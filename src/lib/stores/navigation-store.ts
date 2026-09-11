'use client';

import { create } from 'zustand';

// -------------------- Types --------------------

interface NavigationState {
  currentModule: string;
  currentItemId: string | null;
  currentSubPage: string | null;
  initialAiPrompt?: string | null;
  initialArticleTitle?: string | null;

  setInitialAiPrompt: (prompt: string | null, title?: string | null) => void;
  navigate: (mod: string, itemId?: string | null, subPage?: string | null) => void;
  readFromHash: () => void;
}

/**
 * Canonical SEO sub-pages. The legacy standalone routes ('sitemap', 'robots',
 * 'redirects') were consolidated into the Settings page as tabs, so they are
 * canonicalized to "settings/<tab>" HERE — synchronously, at the single point
 * where raw hash text becomes navigation state. Every consumer (SeoRouter,
 * Breadcrumbs, sub-nav, page title) therefore reads the canonical sub-page from
 * the very first paint and no intermediate/duplicate Robots.txt-style screen can
 * flash while some component "catches up".
 */
const SEO_LEGACY_SUBPAGES: Record<string, string> = {
  'sitemap': 'settings/sitemap',
  'robots': 'settings/robots',
  'redirects': 'settings/redirects',
};

/**
 * Parse a hash string like "#content", "#content/cm2x123", "#content/new"
 * into { mod, itemId, subPage }.
 */
function parseHash(hash: string): {
  mod: string;
  itemId: string | null;
  subPage: string | null;
} {
  // Strip leading #
  const path = hash.replace(/^#\/?/, '') || 'dashboard';
  const segments = path.split('/');

  const mod = segments[0] || 'dashboard';
  const second = segments[1] ?? null;

  // Canonicalize legacy SEO standalone routes (e.g. "#seo/robots") to their
  // compound Settings form ("settings/robots") BEFORE any state is stored.
  if (mod === 'seo' && second && SEO_LEGACY_SUBPAGES[second.toLowerCase()]) {
    return { mod, itemId: null, subPage: SEO_LEGACY_SUBPAGES[second.toLowerCase()] };
  }

  // Canonicalize legacy standalone routes to Articles Categories & Tags dialog
  if (mod === 'categories') {
    return { mod: 'content', itemId: null, subPage: 'categories' };
  }
  if (mod === 'tags') {
    return { mod: 'content', itemId: null, subPage: 'tags' };
  }

  // All known sub-page keywords across ALL modules.
  // IMPORTANT: Settings has children named 'seo', 'api', 'media', 'ai', etc.
  // These MUST be recognized as sub-pages so they are NOT treated as item IDs.
  const SUB_PAGE_KEYWORDS = new Set([
    // Content
    'create', 'new', 'edit', 'versions', 'translations', 'preview', 'categories', 'tags',
    // SEO
    'redirects', 'sitemap', 'robots', 'search-console', 'indexing', 'broken-links',
    'social-preview', 'schema', 'canonicals', 'internal-links', 'audit', 'settings',
    // Email Templates
    'smtp-settings',
    // AI
    'providers', 'prompts', 'models', 'playground', 'jobs', 'usage', 'marketplace',
    // Backups
    'backups', 'schedules', 'restore', 'storage', 'logs',
    // Automation
    'create', 'edit', 'details', 'runs', 'generate',
    // Newsletter
    'subscribers', 'campaigns', 'collections',
    // Media
    'folders', 'upload',
    // Settings — ALL children must be here
    'settings', 'general', 'localization', 'reading', 'discussion',
    'seo', 'media', 'search', 'email', 'security', 'api', 'ai', 'cache',
    'maintenance', 'multi-site', 'import-export', 'advanced', 'smtp',
    // Audit
    'audit',
  ]);

  // Compound "settings/<tab>" sub-pages (e.g. SEO "settings/robots") — preserve
  // the full compound key so the route is reachable via hash/refresh. Without
  // this, "#seo/settings/robots" collapses to subPage="settings" (Sitemap tab),
  // so the Robots tab would never load on direct-URL navigation.
  if (second && second.toLowerCase() === 'settings' && segments[2]) {
    const SETTINGS_SUBTABS = new Set(['sitemap', 'robots', 'redirects']);
    const subTab = segments[2].toLowerCase();
    if (SETTINGS_SUBTABS.has(subTab)) {
      return { mod, itemId: null, subPage: `settings/${subTab}` };
    }
  }

  if (second && SUB_PAGE_KEYWORDS.has(second.toLowerCase())) {
    return { mod, itemId: null, subPage: second.toLowerCase() };
  }

  // Otherwise second segment is an item ID, third is sub-page
  const itemId = second;
  const subPage = segments[2] ? segments[2].toLowerCase() : null;

  return { mod, itemId, subPage };
}

/**
 * Build a hash string from navigation state.
 */
function buildHash(mod: string, itemId?: string | null, subPage?: string | null): string {
  if (!mod || mod === 'dashboard') return '#';

  if (subPage && !itemId) {
    return `#${mod}/${subPage}`;
  }

  if (itemId && subPage) {
    return `#${mod}/${itemId}/${subPage}`;
  }

  if (itemId) {
    return `#${mod}/${itemId}`;
  }

  return `#${mod}`;
}

// -------------------- Initial State --------------------

const RAW_INITIAL_HASH =
  typeof window !== 'undefined' ? window.location.hash : '#';

const initialState = parseHash(RAW_INITIAL_HASH);

// If the initial URL used a legacy form (e.g. "#seo/robots"), canonicalize the
// address bar too — the rendered page is already canonical, so this is purely a
// cosmetic URL cleanup with no visual effect.
if (typeof window !== 'undefined') {
  const canonicalHash = buildHash(
    initialState.mod,
    initialState.itemId,
    initialState.subPage,
  );
  const normalizedInitial = `#${RAW_INITIAL_HASH.replace(/^#\/?/, '')}`;
  if (normalizedInitial !== '#' && normalizedInitial !== canonicalHash) {
    window.history.replaceState(null, '', canonicalHash || '#');
  }
}

// -------------------- Store --------------------

export const useNavigationStore = create<NavigationState>((set) => ({
  currentModule: initialState.mod,
  currentItemId: initialState.itemId,
  currentSubPage: initialState.subPage,
  initialAiPrompt: null,
  initialArticleTitle: null,

  setInitialAiPrompt: (prompt, title = null) =>
    set({ initialAiPrompt: prompt, initialArticleTitle: title }),

  navigate: (mod, itemId = null, subPage = null) => {
    let targetMod = mod;
    let targetItemId = itemId;
    let targetSubPage = subPage;

    if (targetMod === 'categories') {
      targetMod = 'content';
      targetSubPage = 'categories';
    } else if (targetMod === 'tags') {
      targetMod = 'content';
      targetSubPage = 'tags';
    }

    set({
      currentModule: targetMod,
      currentItemId: targetItemId,
      currentSubPage: targetSubPage,
    });

    // Update browser hash without triggering a page reload
    const hash = buildHash(targetMod, targetItemId, targetSubPage);
    window.history.replaceState(null, '', hash);
  },

  readFromHash: () => {
    const hash = window.location.hash;
    const parsed = parseHash(hash);
    set({
      currentModule: parsed.mod,
      currentItemId: parsed.itemId,
      currentSubPage: parsed.subPage,
    });
  },
}));

// -------------------- Hash / History Change Listener --------------------

function syncHashToStore() {
  const hash = window.location.hash;
  const parsed = parseHash(hash);
  useNavigationStore.setState({
    currentModule: parsed.mod,
    currentItemId: parsed.itemId,
    currentSubPage: parsed.subPage,
  });

  // Canonicalize legacy hash forms (e.g. "#seo/robots") in the address bar.
  // replaceState does NOT fire hashchange, so no loop is possible.
  const canonical = buildHash(parsed.mod, parsed.itemId, parsed.subPage);
  if (hash !== canonical && canonical) {
    window.history.replaceState(null, '', canonical);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', syncHashToStore);
  window.addEventListener('popstate', syncHashToStore);
}
