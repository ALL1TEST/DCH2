// ============================================================
// SITE CONNECTION TYPES — Standardized External Connection Layer
// ============================================================

export type PlatformType = 'standard' | 'wordpress';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'UNREACHABLE'
  | 'INVALID_API'
  | 'UNSUPPORTED_PLATFORM'
  | 'PENDING'
  | 'DISCONNECTED';

export interface StandardConnectionConfig {
  siteUrl: string;
  apiBaseUrl: string;
  apiKey?: string;
  encryptedApiKey?: string;
}

export interface WordPressConnectionConfig {
  siteUrl: string;
  restApiUrl: string;
  username?: string;
  appPassword?: string;
  encryptedPassword?: string;
}

export interface SiteConnectionData {
  platform: PlatformType;
  siteUrl: string;
  apiBaseUrl: string;
  connectionType: 'api_key' | 'application_password' | 'none';
  status: ConnectionStatus;
  lastVerifiedAt?: string;
  capabilities?: string[];
  diagnostics?: string;
  // Encrypted secrets (only stored server-side in DB, NEVER sent to frontend)
  encryptedCredentials?: string;
  // WordPress-specific public fields (safe to display)
  username?: string;
  // Sanitized client flags
  hasCredentials?: boolean;
}

export interface VerificationRequest {
  platform: PlatformType;
  siteUrl: string;
  apiBaseUrl?: string;
  apiKey?: string;
  restApiUrl?: string;
  username?: string;
  appPassword?: string;
}

export interface VerificationResponse {
  ok: boolean;
  status: ConnectionStatus;
  message: string;
  capabilities?: string[];
  details?: {
    siteName?: string;
    description?: string;
    version?: string;
    responseTimeMs?: number;
    username?: string;
    roles?: string[];
    [key: string]: unknown;
  };
}
