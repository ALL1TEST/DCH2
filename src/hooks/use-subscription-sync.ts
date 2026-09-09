'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useSiteStore } from '@/lib/stores/site-store';
import type { ClientBillingState } from '@/lib/platform/platform-data';

// ============================================================
// SUBSCRIPTION SERVER SYNC — the active plan single source of truth.
// ============================================================
// Billing & Subscription reads /api/platform/billing/me; this hook
// reads the SAME endpoint under the SAME TanStack Query key, so:
//   - the profile badge (sidebar footer + dropdown header) always
//     shows exactly what Billing & Subscription shows — the server
//     resolves the active plan identically (DB Subscription → legacy
//     customer → Free default) and returns the plan id + name;
//   - when the billing page changes/cancels the plan it invalidates
//     the shared ['platform-billing-me'] query → this observer
//     refetches → syncFromServer updates the store → every badge
//     updates IMMEDIATELY (no reload needed);
//   - on every refresh/login the query remounts and re-syncs, so the
//     badge stays consistent (no stale/default value);
//   - until the first sync lands the badge render sites stay hidden
//     (serverSynced=false) — a hardcoded "Free" is never displayed.
//
// The store snapshot (localStorage) persists the last server-synced
// plan, so a refresh renders the correct badge instantly and the
// query then re-verifies it.
//
// Keep this key in sync with the Billing & Subscription page's
// billingQuery (same literal — TanStack Query hashes them together).
export const BILLING_ME_QUERY_KEY = ['platform-billing-me'] as const;

/**
 * Mirror the user's ACTIVE server-side subscription into the
 * subscription store. Mounted ONCE in the admin app shell
 * (admin-app.tsx) — every badge render site then reads the store.
 */
export function useSubscriptionServerSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data } = useQuery({
    queryKey: BILLING_ME_QUERY_KEY,
    queryFn: () => getApi<ClientBillingState>('/api/platform/billing/me'),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data?.plan) return;
    useSubscriptionStore.getState().syncFromServer({
      planId: data.plan.id,
      planName: data.plan.name,
      status: data.status,
      trialEnd: data.trialEnd,
    });
    // Immediately re-fetch sites whenever the user's plan changes (no refresh needed)
    useSiteStore.getState().fetchSites();
  }, [data?.plan?.id, data?.plan?.name, data?.status, data?.trialEnd]);
}
