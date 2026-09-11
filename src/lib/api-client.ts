// ============================================================
// API CLIENT — Enterprise Multi-Site CMS
// ============================================================

import type { ApiResponse, ApiError, PaginationParams, FilterParam } from '@/shared/types';
import { generateRequestId } from '@/lib/utils';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

// -------------------- Request Config --------------------

export interface ApiRequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeout?: number;
  /** Skip the standard ApiResponse envelope parsing */
  raw?: boolean;
  /** Skip automatic siteId injection */
  skipSiteContext?: boolean;
}

// -------------------- Custom Error --------------------

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  docUrl?: string;
  requestId: string;

  constructor(apiError: ApiError) {
    const { error, meta } = apiError;
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = 0;
    this.details = error.details;
    this.docUrl = error.doc_url;
    // Defensive: some error responses omit `meta` — don't crash during
    // construction; just leave requestId empty in that case.
    this.requestId = meta?.requestId ?? '';
  }
}

export class ApiNetworkError extends Error {
  requestId: string;
  isTimeout: boolean;

  constructor(message: string, requestId: string, isTimeout = false) {
    super(message);
    this.name = 'ApiNetworkError';
    this.requestId = requestId;
    this.isTimeout = isTimeout;
  }
}

// -------------------- Interceptor Types --------------------

type RequestInterceptor = (req: RequestInit, url: string) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (res: Response, req: RequestInit, url: string) => Response | Promise<Response>;

// -------------------- Site Context Helper --------------------
// Reads the resolved DB ID (cuid) from the global set by site-store.
// This avoids sending slugs to API routes that expect DB foreign keys.

function getActiveSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const w = window as unknown as Record<string, unknown>;
    const dbId = w.__CMS_ACTIVE_SITE_DB_ID__;
    if (dbId && typeof dbId === 'string') return dbId;
  } catch {
    // ignore
  }
  return null;
}

// Routes that should NOT receive siteId (global/platform routes)
const GLOBAL_ROUTES = new Set([
  '/api/sites',
  '/api/auth',
  '/api/users',
  '/api/backups',
  '/api/audit-logs',
  '/api/jobs',
  '/api/ai',
  '/api/ai-providers',
  '/api/prompt-templates',
  '/api/notifications/unread-count',
  '/api/platform',
]);

function isGlobalRoute(path: string): boolean {
  return GLOBAL_ROUTES.has(path) || path.startsWith('/api/sites/') || path.startsWith('/api/platform/');
}

class ApiClient {
  private baseUrl = '';
  private defaultTimeout = 30_000;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  // -------------------- Interceptors --------------------

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter((i) => i !== interceptor);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter((i) => i !== interceptor);
    };
  }

  // -------------------- Core Fetch --------------------

  async request<T>(method: HttpMethod, path: string, config: ApiRequestConfig = {}): Promise<T> {
    const requestId = generateRequestId();
    const { params, body, timeout = this.defaultTimeout, raw, skipSiteContext, ...init } = config;

    // Build URL with query params + auto-inject siteId
    let url = `${this.baseUrl}${path}`;
    const searchParams = new URLSearchParams();

    // Auto-inject siteId from context (unless global route or explicitly skipped)
    if (!skipSiteContext && !isGlobalRoute(path)) {
      const activeSiteId = getActiveSiteId();
      if (activeSiteId) {
        searchParams.set('siteId', activeSiteId);
      }
    }

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      ...init.headers,
    };

    // Build request init
    let reqInit: RequestInit = {
      method,
      headers,
      ...init,
    };

    // Add body for non-GET methods
    if (body !== undefined && method !== 'GET') {
      reqInit.body = JSON.stringify(body);
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      reqInit = await interceptor(reqInit, url);
    }

    const isAiRoute = path.startsWith('/api/content/ai') || path.startsWith('/api/ai') || path.includes('/generate');
    const effectiveTimeout = timeout !== this.defaultTimeout ? timeout : (isAiRoute ? 85_000 : this.defaultTimeout);

    // Execute with timeout and support user-provided AbortSignal
    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    try {
      response = await fetch(url, {
        ...reqInit,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (init.signal?.aborted) {
          const cancelErr = new Error('Request cancelled by user');
          cancelErr.name = 'AbortError';
          throw cancelErr;
        }
        throw new ApiNetworkError(`Request timeout after ${effectiveTimeout}ms`, requestId, true);
      }
      throw new ApiNetworkError(
        err instanceof Error ? err.message : 'Network request failed',
        requestId,
      );
    }
    clearTimeout(timeoutId);

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response, reqInit, url);
    }

    // Parse response
    if (!response.ok) {
      let apiError: ApiError;
      try {
        apiError = await response.json();
      } catch {
        const error = new ApiClientError({
          error: {
            code: 'UNKNOWN_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
          meta: { requestId, timestamp: new Date().toISOString() },
        });
        error.status = response.status;
        throw error;
      }
      const clientError = new ApiClientError(apiError);
      clientError.status = response.status;
      throw clientError;
    }

    // No content
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();

    if (raw) {
      return json as T;
    }

    // Unwrap ApiResponse envelope
    const envelope = json as ApiResponse<T>;
    return envelope.data;
  }

  // -------------------- Public Helpers --------------------
}

// -------------------- Singleton Instance --------------------

const apiClient = new ApiClient();

// -------------------- Exported Functions --------------------

export async function fetchApi<T>(
  method: HttpMethod,
  path: string,
  config?: ApiRequestConfig,
): Promise<T> {
  return apiClient.request<T>(method, path, config);
}

export async function getApi<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  config?: Omit<ApiRequestConfig, 'params'>,
): Promise<T> {
  return apiClient.request<T>('GET', path, { ...config, params });
}

export async function postApi<T>(
  path: string,
  body?: unknown,
  config?: Omit<ApiRequestConfig, 'body'>,
): Promise<T> {
  return apiClient.request<T>('POST', path, { ...config, body });
}

export async function patchApi<T>(
  path: string,
  body?: unknown,
  config?: Omit<ApiRequestConfig, 'body'>,
): Promise<T> {
  return apiClient.request<T>('PATCH', path, { ...config, body });
}

export async function putApi<T>(
  path: string,
  body?: unknown,
  config?: Omit<ApiRequestConfig, 'body'>,
): Promise<T> {
  return apiClient.request<T>('PUT', path, { ...config, body });
}

export async function deleteApi<T>(
  path: string,
  config?: ApiRequestConfig,
): Promise<T> {
  return apiClient.request<T>('DELETE', path, config);
}

// -------------------- Interceptor Export --------------------

export const addRequestInterceptor = (interceptor: RequestInterceptor) =>
  apiClient.addRequestInterceptor(interceptor);

export const addResponseInterceptor = (interceptor: ResponseInterceptor) =>
  apiClient.addResponseInterceptor(interceptor);

export default apiClient;
