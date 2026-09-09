'use client';

import { create } from 'zustand';
import { postApi, getApi } from '@/lib/api-client';
import type { UserRole } from '@/shared/types';
import { useSiteStore } from './site-store';

// -------------------- Types --------------------

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: string;
  billingMode: 'EXTERNAL' | 'INTERNAL' | 'EXEMPT';
  pagePermissions?: string[] | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

// Raw API user shape (what /api/auth/me and /api/auth/login return)
interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  status: string;
  billingMode?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  pagePermissions?: string[] | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  authorProfile?: unknown;
  permissions?: string[];
  session?: unknown;
}

function mapApiUser(raw: ApiUser): CurrentUser {
  const billingMode = (raw.billingMode === 'INTERNAL' || raw.billingMode === 'EXEMPT' ? raw.billingMode : 'EXTERNAL') as 'EXTERNAL' | 'INTERNAL' | 'EXEMPT';
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    avatarUrl: raw.avatar ?? null,
    role: raw.role as UserRole,
    status: raw.status,
    billingMode,
    pagePermissions: Array.isArray(raw.pagePermissions) ? raw.pagePermissions : null,
    createdAt: raw.createdAt ?? null,
    lastLoginAt: raw.lastLoginAt ?? null,
  };
}

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = 'cms_auth_user';

// -------------------- Store --------------------

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await postApi<{ user: ApiUser; token: string }>('/api/auth/login', { email, password });
      const user = mapApiUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      useSiteStore.getState().reset();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await postApi('/api/auth/logout');
    } catch {
      // Best-effort: clear local state regardless
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      useSiteStore.getState().reset();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      // Try to restore from localStorage first for instant UI
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const user = JSON.parse(stored) as CurrentUser;
          set({ user, isAuthenticated: true });
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Verify session with server
      const res = await getApi<{ user: ApiUser }>('/api/auth/me');
      const user = mapApiUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isCheckingAuth: false, error: null });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },

  clearError: () => set({ error: null }),
}));
