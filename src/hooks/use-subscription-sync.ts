'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useSiteStore } from '@/lib/stores/site-store';
import type { ClientBillingState } from '@/lib/platform/platform-data';

// ============================================================
// SUBSCRIPTION SERVER SYNC — the active plan single source of truth.
// ============================================================
export const BILLING_ME_QUERY_KEY = ['platform-billing-me'] as const;

/**
 * Mirror the user's ACTIVE server-side subscription into the
 * subscription store. Mounted ONCE in the admin app shell
 * (admin-app.tsx) — every badge render site then reads the store.
 */
export function useSubscriptionServerSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const lastPlanIdRef = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: BILLING_ME_QUERY_KEY,
    queryFn: () => getApi<ClientBillingState>('/api/platform/billing/me'),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data?.plan) return;
    const newPlanId = data.plan.id;

    useSubscriptionStore.getState().syncFromServer({
      planId: data.plan.id,
      planName: data.plan.name,
      status: data.status,
      trialEnd: data.trialEnd,
    });

    // If plan changed, immediately re-fetch sites and invalidate all queries
    if (lastPlanIdRef.current && lastPlanIdRef.current !== newPlanId) {
      useSiteStore.getState().fetchSites();
      queryClient.invalidateQueries();
    }
    lastPlanIdRef.current = newPlanId;
  }, [data?.plan?.id, data?.plan?.name, data?.status, data?.trialEnd, queryClient]);
}
