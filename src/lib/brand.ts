// ============================================================
// PRODUCT BRAND IDENTITY — single source of truth
// ============================================================
// Shared by the root layout metadata (server) and client-side
// surfaces (e.g. resetting the document title when the auth shell
// flips from the marketing site to the dashboard). Extracted from
// app/layout.tsx so client components can import the constants
// without a server↔client circular import.
// ============================================================

export const SITE_NAME = 'Sitesmith';
export const SITE_TAGLINE = 'Craft content that ranks.';
export const SITE_DESCRIPTION =
  'Sitesmith is the multi-site content platform with AI writing, a full SEO suite, and workflow automation — connect WordPress or any REST CMS and publish from one calm dashboard.';
