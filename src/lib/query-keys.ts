// ============================================================// TANSTACK QUERY KEY FACTORY — Enterprise CMS Admin Dashboard// ============================================================

/**
 * Creates a query-key factory object for a given module.
 *
 * Usage:
 *   queryKeys.content.list(filters)   // ['content', 'list', { ...filters }]
 *   queryKeys.content.detail(id)      // ['content', 'detail', id]
 */
function createQueryKeys<TScope extends string>(scope: TScope) {
  return {
    all: [scope] as const,
    list: (filters?: Record<string, unknown>) =>
      [scope, 'list', filters] as const,
    detail: (id: string) =>
      [scope, 'detail', id] as const,
    count: (filters?: Record<string, unknown>) =>
      [scope, 'count', filters] as const,
  };
}

/**
 * Extended factory for modules that have sub-resources.
 */
function createNestedQueryKeys<TScope extends string>(scope: TScope) {
  const base = createQueryKeys(scope);
  return {
    ...base,
    /** Sub-resource keys, e.g. content.versions.list(contentId) */
    nested: <TSub extends string>(sub: TSub) =>
      createQueryKeys(`${scope}:${sub}`),
  };
}

export const queryKeys = {
  // -------------------- Sites --------------------
  sites: createQueryKeys('sites'),

  // -------------------- Content --------------------
  content: createNestedQueryKeys('content'),

  // -------------------- Content Types --------------------
  contentTypes: createQueryKeys('content-types'),

  // -------------------- Content Versions --------------------
  contentVersions: {
    all: ['content-versions'] as const,
    list: (contentItemId: string) =>
      ['content-versions', 'list', contentItemId] as const,
    detail: (id: string) =>
      ['content-versions', 'detail', id] as const,
  },

  // -------------------- Translations --------------------
  translations: {
    all: ['translations'] as const,
    list: (contentItemId: string) =>
      ['translations', 'list', contentItemId] as const,
    detail: (id: string) =>
      ['translations', 'detail', id] as const,
  },

  // -------------------- Reviews --------------------
  reviews: {
    all: ['reviews'] as const,
    list: (contentItemId?: string, filters?: Record<string, unknown>) =>
      ['reviews', 'list', contentItemId, filters] as const,
    detail: (id: string) =>
      ['reviews', 'detail', id] as const,
  },

  // -------------------- Media --------------------
  media: createQueryKeys('media'),

  // -------------------- Media Folders --------------------
  mediaFolders: createQueryKeys('media-folders'),

  // -------------------- Media Collections --------------------
  mediaCollections: createQueryKeys('media-collections'),

  // -------------------- Users --------------------
  users: createQueryKeys('users'),

  // -------------------- Author Profiles --------------------
  authorProfiles: createQueryKeys('author-profiles'),

  // -------------------- Categories --------------------
  categories: createQueryKeys('categories'),

  // -------------------- Tags --------------------
  tags: createQueryKeys('tags'),

  // -------------------- Tasks (Kanban) --------------------
  tasks: createQueryKeys('tasks'),

  // -------------------- Comments --------------------
  comments: createQueryKeys('comments'),

  // -------------------- Newsletters --------------------
  newsletterSubscribers: createQueryKeys('newsletter-subscribers'),
  newsletterCampaigns: createQueryKeys('newsletter-campaigns'),

  // -------------------- SEO --------------------
  seoConfig: {
    all: ['seo-config'] as const,
    detail: (resourceType: string, resourceId: string) =>
      ['seo-config', 'detail', resourceType, resourceId] as const,
  },
  redirects: createQueryKeys('redirects'),
  seoOverview: {
    all: ['seo-overview'] as const,
    stats: () => ['seo-overview', 'stats'] as const,
  },
  seoSitemap: {
    all: ['seo-sitemap'] as const,
  },
  seoRobots: {
    all: ['seo-robots'] as const,
  },
  seoSearchConsole: createQueryKeys('seo-search-console'),
  seoSearchConsoleStats: {
    all: ['seo-sc-stats'] as const,
    // `range` encodes either a preset ({ days: 14 }) or a custom span
    // ({ from, to }) so the query re-fetches whenever the range changes.
    list: (range?: Record<string, unknown>) => ['seo-sc-stats', 'list', range] as const,
  },
  seoSearchConsoleQueries: {
    all: ['seo-sc-queries'] as const,
    list: (filters?: Record<string, unknown>) => ['seo-sc-queries', 'list', filters] as const,
  },
  seoSearchConsolePages: {
    all: ['seo-sc-pages'] as const,
    list: (filters?: Record<string, unknown>) => ['seo-sc-pages', 'list', filters] as const,
  },
  seoIndexing: createQueryKeys('seo-indexing'),
  seoBrokenLinks: createQueryKeys('seo-broken-links'),
  seoIssues: createQueryKeys('seo-issues'),
  seoSettings: {
    all: ['seo-settings'] as const,
  },
  seoSchema: {
    all: ['seo-schema'] as const,
    detail: (id: string) => ['seo-schema', 'detail', id] as const,
  },
  seoSocialPreview: {
    all: ['seo-social-preview'] as const,
    detail: (id: string) => ['seo-social-preview', 'detail', id] as const,
  },
  seoCanonicals: {
    all: ['seo-canonicals'] as const,
  },
  seoInternalLinks: {
    all: ['seo-internal-links'] as const,
  },
  seoMetaAnalysis: {
    all: ['seo-meta-analysis'] as const,
    detail: (id: string) => ['seo-meta-analysis', 'detail', id] as const,
  },
  seoAudit: {
    all: ['seo-audit'] as const,
  },


  // -------------------- Analytics --------------------
  analytics: {
    all: ['analytics'] as const,
    overview: (range?: Record<string, unknown>) =>
      ['analytics', 'overview', range] as const,
    topContent: (range?: Record<string, unknown>) =>
      ['analytics', 'top-content', range] as const,
    traffic: (range?: Record<string, unknown>) =>
      ['analytics', 'traffic', range] as const,
    events: (filters?: Record<string, unknown>) =>
      ['analytics', 'events', filters] as const,
  },

  // -------------------- Dashboard --------------------
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    recentActivity: () => ['dashboard', 'recent-activity'] as const,
  },

  // -------------------- Notifications --------------------
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['notifications', 'list', filters] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },

  // -------------------- AI --------------------
  aiProviders: createQueryKeys('ai-providers'),
  aiModels: createQueryKeys('ai-models'),
  aiPrompts: createNestedQueryKeys('ai-prompts'),
  aiJobs: createQueryKeys('ai-jobs'),
  aiUsage: {
    all: ['ai-usage'] as const,
    summary: (filters?: Record<string, unknown>) =>
      ['ai-usage', 'summary', filters] as const,
  },
  aiLogs: createQueryKeys('ai-logs'),
  aiSettings: createQueryKeys('ai-settings'),
  aiFallbacks: createQueryKeys('ai-fallbacks'),
  aiMarketplace: createQueryKeys('ai-marketplace'),
  aiPlayground: {
    all: ['ai-playground'] as const,
  },

  // -------------------- Webhooks --------------------
  webhooks: createQueryKeys('webhooks'),
  webhookDeliveries: {
    all: ['webhook-deliveries'] as const,
    list: (webhookId: string, filters?: Record<string, unknown>) =>
      ['webhook-deliveries', 'list', webhookId, filters] as const,
    detail: (id: string) =>
      ['webhook-deliveries', 'detail', id] as const,
  },

  // -------------------- Settings --------------------
  settings: {
    all: ['settings'] as const,
    byCategory: (category: string) =>
      ['settings', 'category', category] as const,
    byScope: (scope: string) =>
      ['settings', 'scope', scope] as const,
    byKey: (key: string) =>
      ['settings', 'key', key] as const,
    search: (query: string) =>
      ['settings', 'search', query] as const,
    auditLog: (filters?: Record<string, unknown>) =>
      ['settings', 'audit-log', filters] as const,
    categories: () => ['settings', 'categories'] as const,
    defaults: () => ['settings', 'defaults'] as const,
  },

  // -------------------- Security --------------------
  security: {
    all: ['security'] as const,
  },
  ipRules: createQueryKeys('ip-rules'),
  sessions: createQueryKeys('sessions'),

  // -------------------- Backups --------------------
  backups: createQueryKeys('backups'),
  backupSchedules: createQueryKeys('backup-schedules'),
  backupLogs: createQueryKeys('backup-logs'),
  backupStorage: createQueryKeys('backup-storage'),
  backupStats: {
    all: ['backup-stats'] as const,
    dashboard: () => ['backup-stats', 'dashboard'] as const,
  },
  // Monitoring module has been removed from the CMS.
  jobs: createQueryKeys('jobs'),
  auditLog: {
    all: ['audit-log'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['audit-log', 'list', filters] as const,
    detail: (id: string) =>
      ['audit-log', 'detail', id] as const,
  },

  // -------------------- API Module (REMOVED) --------------------
  // The API Developer module has been completely removed from the CMS.

  // -------------------- Feature Flags --------------------
  featureFlags: createQueryKeys('feature-flags'),

  // -------------------- Bulk Operations --------------------
  bulkOperations: {
    all: ['bulk-operations'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['bulk-operations', 'list', filters] as const,
    detail: (id: string) =>
      ['bulk-operations', 'detail', id] as const,
  },

  // -------------------- Import/Export --------------------
  importExport: createQueryKeys('import-export'),

  // -------------------- Saved Filters --------------------
  savedFilters: {
    all: ['saved-filters'] as const,
    list: (module?: string) =>
      ['saved-filters', 'list', module] as const,
  },

  // -------------------- Homepage Layout --------------------
  homepageLayout: createQueryKeys('homepage-layout'),

  // -------------------- Content Templates --------------------
  contentTemplates: createQueryKeys('content-templates'),

  // -------------------- Reusable Blocks --------------------
  reusableBlocks: createQueryKeys('reusable-blocks'),

  // -------------------- Email Templates --------------------
  emailTemplates: createNestedQueryKeys('email-templates'),
  smtpSettings: createQueryKeys('smtp-settings'),

  // -------------------- Analytics --------------------
  analytics: createQueryKeys('analytics'),
} as const;

export type QueryKeys = typeof queryKeys;
