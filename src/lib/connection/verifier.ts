// ============================================================
// SITE CONNECTION VERIFIER — Server-Side Handshake & Diagnostic Engine
// ============================================================

import { VerificationRequest, VerificationResponse, ConnectionStatus } from './types';

const TIMEOUT_MS = 8000;

/**
 * Normalize and clean up a base URL (remove trailing slashes, enforce http/https)
 */
function normalizeUrl(urlStr: string): string {
  let trimmed = urlStr.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Safe fetch with strict timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify a Standard CMS external API connection
 */
async function verifyStandardCms(req: VerificationRequest): Promise<VerificationResponse> {
  const startTime = Date.now();
  const siteUrl = normalizeUrl(req.siteUrl);
  const rawApiBaseUrl = normalizeUrl(req.apiBaseUrl || `${siteUrl}/api`);
  const apiKey = req.apiKey?.trim();

  if (!apiKey) {
    return {
      ok: false,
      status: 'INVALID_CREDENTIALS',
      message: 'Invalid connection token: A Connection Token is required.',
    };
  }

  // Determine exact health check URL(s) from configured API Base URL.
  // Strictly probe /api/cms/health — NEVER fall back to /api, /health, or root endpoints!
  const candidateUrls: string[] = [];
  const cleanApiBase = rawApiBaseUrl.replace(/\/+$/, '');

  if (cleanApiBase.endsWith('/api')) {
    candidateUrls.push(`${cleanApiBase}/cms/health`);
  } else {
    candidateUrls.push(`${cleanApiBase}/api/cms/health`);
    candidateUrls.push(`${cleanApiBase}/cms/health`);
  }

  // Deduplicate while preserving order
  const uniqueUrls = Array.from(new Set(candidateUrls));

  let lastStatus: ConnectionStatus = 'UNREACHABLE';
  let lastErrorMsg = 'Failed to reach API endpoint';
  let verifiedResponse: Response | null = null;
  let parsedBody: Record<string, unknown> | null = null;

  for (const targetUrl of uniqueUrls) {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Antigravity-CMS-Connection/1.0',
        'Authorization': `Bearer ${apiKey}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };

      const res = await fetchWithTimeout(targetUrl, {
        method: 'GET',
        cache: 'no-store',
        headers,
      });

      // Strict rejection on authentication failures
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: 'INVALID_CREDENTIALS',
          message: 'Invalid connection token: The external site rejected the Bearer token (HTTP 401/403).',
          details: { responseTimeMs: Date.now() - startTime },
        };
      }

      if (res.status === 404) {
        lastStatus = 'INVALID_API';
        lastErrorMsg = `External site does not implement the Standard CMS health endpoint (HTTP 404 at ${targetUrl}).`;
        continue;
      }

      if (!res.ok) {
        lastStatus = 'INVALID_API';
        lastErrorMsg = `External API error: HTTP ${res.status} at ${targetUrl}. Expected HTTP 200.`;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!isJson) {
        lastStatus = 'INVALID_API';
        lastErrorMsg = `Endpoint ${targetUrl} returned non-JSON content (${contentType}). Expected application/json.`;
        continue;
      }

      try {
        parsedBody = (await res.json()) as Record<string, unknown>;
      } catch {
        lastStatus = 'INVALID_API';
        lastErrorMsg = 'The endpoint returned malformed JSON.';
        continue;
      }

      // Explicit handshake verification requirement:
      // Response MUST be JSON and confirm connection (e.g. { ok: true } or { connected: true })
      if (!parsedBody || typeof parsedBody !== 'object') {
        lastStatus = 'INVALID_API';
        lastErrorMsg = 'Endpoint returned an invalid JSON body.';
        continue;
      }

      if (parsedBody.connected === false || parsedBody.ok === false) {
        return {
          ok: false,
          status: 'INVALID_CREDENTIALS',
          message: typeof parsedBody.error === 'string' ? parsedBody.error : 'Connection failed: External API rejected connection.',
          details: { responseTimeMs: Date.now() - startTime },
        };
      }

      const hasConfirmedConnection =
        parsedBody.ok === true ||
        parsedBody.connected === true ||
        parsedBody.service === 'standard-cms' ||
        parsedBody.status === 'connected' ||
        parsedBody.status === 'ok';

      if (!hasConfirmedConnection) {
        lastStatus = 'INVALID_API';
        lastErrorMsg = 'External API error: Handshake not confirmed. Expected JSON response with { "ok": true } or { "connected": true }.';
        continue;
      }

      verifiedResponse = res;
      break;
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'AbortError') {
        lastStatus = 'UNREACHABLE';
        lastErrorMsg = `Unable to reach external site: Connection timed out after ${TIMEOUT_MS / 1000}s.`;
      } else {
        lastStatus = 'UNREACHABLE';
        lastErrorMsg = `Unable to reach external site: ${errorObj?.message || 'could not establish connection.'}`;
      }
    }
  }

  if (!verifiedResponse || !parsedBody) {
    return {
      ok: false,
      status: lastStatus,
      message: lastErrorMsg,
      details: { responseTimeMs: Date.now() - startTime },
    };
  }

  const responseTimeMs = Date.now() - startTime;
  const siteName = typeof parsedBody?.site === 'string'
    ? parsedBody.site
    : (typeof parsedBody?.name === 'string' ? parsedBody.name : undefined);
  const platformName = typeof parsedBody?.platform === 'string' ? parsedBody.platform : 'standard-cms';

  return {
    ok: true,
    status: 'CONNECTED',
    message: siteName ? `Connected successfully to "${siteName}" (${platformName})` : 'Connected successfully to external Standard CMS API.',
    capabilities: ['articles', 'categories', 'media', 'comments', 'settings', 'seo'],
    details: {
      siteName,
      platform: platformName,
      version: typeof parsedBody?.version === 'string' ? parsedBody.version : '1.0.0',
      responseTimeMs,
      apiUrl: rawApiBaseUrl,
    },
  };
}

/**
 * Verify a WordPress REST API connection
 */
async function verifyWordPress(req: VerificationRequest): Promise<VerificationResponse> {
  const startTime = Date.now();
  const siteUrl = normalizeUrl(req.siteUrl);
  const restApiUrl = normalizeUrl(req.restApiUrl || `${siteUrl}/wp-json`);
  const username = req.username?.trim();
  // Strip whitespace from WordPress Application Passwords
  const appPassword = req.appPassword?.replace(/\s+/g, '').trim();

  if (!username || !appPassword) {
    return {
      ok: false,
      status: 'INVALID_CREDENTIALS',
      message: 'WordPress Username and Application Password are required.',
    };
  }

  // Step 1: Validate WordPress REST API discovery / root endpoint
  let rootData: Record<string, unknown> | null = null;
  try {
    const rootRes = await fetchWithTimeout(`${restApiUrl}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Antigravity-CMS-Connection/1.0',
      },
    });

    const contentType = rootRes.headers.get('content-type') || '';
    if (!rootRes.ok || !contentType.includes('application/json')) {
      return {
        ok: false,
        status: contentType.includes('text/html') ? 'UNSUPPORTED_PLATFORM' : 'INVALID_API',
        message: 'Endpoint is not a valid WordPress REST API. Expected JSON with WordPress namespaces.',
        details: { responseTimeMs: Date.now() - startTime },
      };
    }

    rootData = (await rootRes.json()) as Record<string, unknown>;
    const namespaces = Array.isArray(rootData?.namespaces) ? rootData.namespaces : [];
    if (!namespaces.includes('wp/v2')) {
      return {
        ok: false,
        status: 'UNSUPPORTED_PLATFORM',
        message: 'WordPress REST API found, but the core "wp/v2" namespace is disabled or missing.',
        details: { responseTimeMs: Date.now() - startTime },
      };
    }
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    const isTimeout = errorObj?.name === 'AbortError';
    return {
      ok: false,
      status: 'UNREACHABLE',
      message: isTimeout
        ? `Connection to ${restApiUrl} timed out after ${TIMEOUT_MS / 1000}s.`
        : `Cannot reach WordPress site: ${errorObj?.message || 'Network unreachable'}.`,
      details: { responseTimeMs: Date.now() - startTime },
    };
  }

  // Step 2: Validate Authentication against /wp/v2/users/me?context=edit
  try {
    const authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
    const authRes = await fetchWithTimeout(`${restApiUrl}/wp/v2/users/me?context=edit`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Antigravity-CMS-Connection/1.0',
      },
    });

    if (authRes.status === 401 || authRes.status === 403) {
      return {
        ok: false,
        status: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials. Please verify your WordPress username and Application Password.',
        details: { responseTimeMs: Date.now() - startTime },
      };
    }

    if (!authRes.ok) {
      return {
        ok: false,
        status: 'INVALID_API',
        message: `WordPress users endpoint returned HTTP ${authRes.status}.`,
        details: { responseTimeMs: Date.now() - startTime },
      };
    }

    const userData = (await authRes.json()) as Record<string, unknown>;
    const roles = Array.isArray(userData?.roles) ? (userData.roles as string[]) : [];

    return {
      ok: true,
      status: 'CONNECTED',
      message: 'Connected successfully to WordPress REST API.',
      capabilities: ['articles', 'categories', 'media', 'comments', 'settings', 'seo'],
      details: {
        siteName: typeof rootData?.name === 'string' ? rootData.name : undefined,
        description: typeof rootData?.description === 'string' ? rootData.description : undefined,
        username: typeof userData?.name === 'string' ? userData.name : username,
        roles,
        responseTimeMs: Date.now() - startTime,
      },
    };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    return {
      ok: false,
      status: 'UNREACHABLE',
      message: `Authentication check failed: ${errorObj?.message || 'Network error'}`,
      details: { responseTimeMs: Date.now() - startTime },
    };
  }
}

/**
 * Main verification entrypoint
 */
export async function verifyConnection(req: VerificationRequest): Promise<VerificationResponse> {
  if (!req.siteUrl || !req.siteUrl.trim()) {
    return {
      ok: false,
      status: 'UNREACHABLE',
      message: 'Site URL is required for connection verification.',
    };
  }

  if (req.platform === 'wordpress') {
    return verifyWordPress(req);
  }

  return verifyStandardCms(req);
}
