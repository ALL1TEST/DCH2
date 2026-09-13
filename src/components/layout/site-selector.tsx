'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Check,
  ChevronDown,
  LayoutGrid,
  Loader2,
  Trash2,
  Settings,
  Globe,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  AlertCircle,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { useSiteStore, type Site } from '@/lib/stores/site-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

// -------------------- WordPress Icon ----------------
function WordPressIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.373 3.528 9.92 8.427 11.474L2.83 8.85A11.95 11.95 0 0 1 12 0zm10.742 7.747c.28.986.438 2.03.438 3.111a11.97 11.97 0 0 1-2.905 7.828l3.197-9.255c-.247-.565-.494-1.127-.73-1.684zM12 24c-1.396 0-2.73-.24-3.968-.68l4.494-13.06 4.57 12.518A11.94 11.94 0 0 1 12 24zM1.168 12c0-.528.056-1.043.16-1.543l5.59 15.309A11.96 11.96 0 0 1 1.168 12z" />
    </svg>
  );
}

// -------------------- Site Colors ----------------

const SITE_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-lime-500',
];

function getSiteColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SITE_COLORS[Math.abs(hash) % SITE_COLORS.length];
}

// -------------------- Validation helpers --------------------

// Slug must be lowercase letters / numbers / hyphens, no leading/trailing hyphen.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateSiteFields(name: string, slug: string, t: (key: string) => string): { name?: string; slug?: string } {
  const errors: { name?: string; slug?: string } = {};
  if (!name.trim()) errors.name = t('siteSelector.siteNameRequired');
  if (!slug.trim()) {
    errors.slug = t('siteSelector.slugRequired');
  } else if (!SLUG_PATTERN.test(slug.trim())) {
    errors.slug = t('siteSelector.slugInvalid');
  }
  return errors;
}

// -------------------- Create Site Dialog --------------------

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (site: Site) => void;
}

type VerificationStatus =
  | 'IDLE'
  | 'VERIFYING'
  | 'CONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'UNREACHABLE'
  | 'INVALID_API'
  | 'UNSUPPORTED_PLATFORM';

interface VerificationState {
  status: VerificationStatus;
  message: string;
  details?: {
    responseTimeMs?: number;
    siteName?: string;
    version?: string;
    username?: string;
    roles?: string[];
    [key: string]: unknown;
  } | null;
  capabilities?: string[];
}

// -------------------- Create Site Dialog --------------------

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (site: Site) => void;
}

type VerificationStatus =
  | 'IDLE'
  | 'VERIFYING'
  | 'CONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'UNREACHABLE'
  | 'INVALID_API'
  | 'UNSUPPORTED_PLATFORM';

interface VerificationState {
  status: VerificationStatus;
  message: string;
  details?: {
    responseTimeMs?: number;
    siteName?: string;
    version?: string;
    username?: string;
    roles?: string[];
    [key: string]: unknown;
  } | null;
  capabilities?: string[];
}

function CreateSiteDialog({ open, onOpenChange, onCreated }: CreateSiteDialogProps) {
  const { t } = useT();
  const [siteType, setSiteType] = useState<'standard' | 'wordpress'>('standard');

  // Basic Info (Public Domain / URL removed completely; Site URL is the single canonical URL)
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [description, setDescription] = useState('');

  // Connection Configuration
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [connectionToken, setConnectionToken] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // WordPress Specific
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [showWpPassword, setShowWpPassword] = useState(false);

  // Verification & Submission state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    status: 'IDLE',
    message: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const createSite = useSiteStore((s) => s.createSite);

  const resetForm = () => {
    setSiteType('standard');
    setName('');
    setSlug('');
    setSiteUrl('');
    setDescription('');
    setApiBaseUrl('');
    setConnectionToken('');
    setIsGeneratingToken(false);
    setShowToken(false);
    setCopiedToken(false);
    setWpUsername('');
    setWpPassword('');
    setShowWpPassword(false);
    setIsVerifying(false);
    setVerification({ status: 'IDLE', message: '' });
    setError('');
    setSubmitAttempted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const fieldErrors = validateSiteFields(name, slug, t);
  const nameError = submitAttempted ? fieldErrors.name : undefined;
  const slugError = submitAttempted ? fieldErrors.slug : undefined;

  const generateSlug = useCallback((val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  // When site URL changes, auto-derive default API Base URL if user hasn't customized it
  const handleSiteUrlChange = (val: string) => {
    setSiteUrl(val);
    invalidateVerification();
    const trimmed = val.trim().replace(/\/+$/, '');
    if (trimmed) {
      setApiBaseUrl(siteType === 'wordpress' ? `${trimmed}/wp-json` : `${trimmed}/api`);
    }
  };

  // Invalidate verification state whenever connection settings change
  const invalidateVerification = () => {
    if (verification.status !== 'IDLE') {
      setVerification({ status: 'IDLE', message: '' });
    }
  };

  // Server-side cryptographic token generation
  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    setError('');
    try {
      const res = await fetch('/api/sites/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.token) {
        setConnectionToken(data.token);
        invalidateVerification();
        toast.success('Generated secure connection token');
      } else {
        setError(data.error?.message || 'Failed to generate token');
      }
    } catch {
      setError('Failed to contact server to generate token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (!connectionToken) return;
    navigator.clipboard.writeText(connectionToken);
    setCopiedToken(true);
    toast.success('Connection token copied to clipboard');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Run real server-side handshake verification
  const handleVerify = async () => {
    setError('');
    const targetSiteUrl = siteUrl.trim();

    if (!targetSiteUrl) {
      setError('Please provide your Site URL.');
      return;
    }

    if (siteType === 'standard' && !connectionToken.trim()) {
      setError('Please click "Generate Token" before verifying the connection.');
      return;
    }

    if (siteType === 'wordpress' && (!wpUsername.trim() || !wpPassword.trim())) {
      setError('WordPress Username and Application Password are required for verification.');
      return;
    }

    setIsVerifying(true);
    setVerification({ status: 'VERIFYING', message: 'Testing remote connection...' });

    const resolvedApiBaseUrl = apiBaseUrl.trim() || (
      siteType === 'wordpress'
        ? `${targetSiteUrl.replace(/\/+$/, '')}/wp-json`
        : `${targetSiteUrl.replace(/\/+$/, '')}/api`
    );

    try {
      const res = await fetch('/api/sites/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: siteType,
          siteUrl: targetSiteUrl,
          apiBaseUrl: resolvedApiBaseUrl,
          apiKey: siteType === 'standard' ? connectionToken.trim() : undefined,
          restApiUrl: siteType === 'wordpress' ? resolvedApiBaseUrl : undefined,
          username: siteType === 'wordpress' ? wpUsername.trim() : undefined,
          appPassword: siteType === 'wordpress' ? wpPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      setVerification({
        status: data.status as VerificationStatus,
        message: data.message || '',
        details: data.details,
        capabilities: data.capabilities,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during verification';
      setVerification({
        status: 'UNREACHABLE',
        message: msg,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validateSiteFields(name, slug, t);
    if (errors.name || errors.slug) {
      setSubmitAttempted(true);
      return;
    }

    if (!siteUrl.trim()) {
      setError('Site URL is required.');
      setSubmitAttempted(true);
      return;
    }

    // Strictly enforce real server-side verification before site creation
    if (verification.status !== 'CONNECTED') {
      setError('Please verify the connection before registering this site.');
      setSubmitAttempted(true);
      return;
    }

    setSubmitAttempted(false);
    setError('');
    setIsCreating(true);

    try {
      const targetSiteUrl = siteUrl.trim();
      const resolvedApiBaseUrl = apiBaseUrl.trim() || (
        siteType === 'wordpress'
          ? `${targetSiteUrl.replace(/\/+$/, '')}/wp-json`
          : `${targetSiteUrl.replace(/\/+$/, '')}/api`
      );

      const site = await createSite({
        name: name.trim(),
        slug: slug.trim(),
        siteUrl: targetSiteUrl,
        description: description.trim() || undefined,
        siteType,
        connection: {
          platform: siteType,
          siteUrl: targetSiteUrl,
          apiBaseUrl: resolvedApiBaseUrl,
          apiKey: siteType === 'standard' ? connectionToken.trim() : undefined,
          restApiUrl: siteType === 'wordpress' ? resolvedApiBaseUrl : undefined,
          username: siteType === 'wordpress' ? wpUsername.trim() : undefined,
          appPassword: siteType === 'wordpress' ? wpPassword.trim() : undefined,
          status: 'CONNECTED',
          capabilities: verification.capabilities || ['articles', 'categories', 'media', 'comments', 'settings', 'seo'],
          lastVerifiedAt: new Date().toISOString(),
        },
      });

      toast.success(`Site "${site.name}" registered and connected!`);
      handleOpenChange(false);
      onCreated(site);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('siteSelector.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t('siteSelector.createTitle')}</DialogTitle>
          <DialogDescription>
            Register an external website and connect it to the CMS through a secure API connection.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Section 1: Platform Type */}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Type
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (siteType !== 'standard') {
                    setSiteType('standard');
                    if (siteUrl.trim()) {
                      setApiBaseUrl(`${siteUrl.trim().replace(/\/+$/, '')}/api`);
                    }
                    invalidateVerification();
                  }
                }}
                className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  siteType === 'standard'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/40 hover:bg-accent/30'
                }`}
              >
                <div
                  className={`p-2.5 rounded-md shrink-0 ${
                    siteType === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">Standard CMS</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Connect any custom website via standard REST API
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (siteType !== 'wordpress') {
                    setSiteType('wordpress');
                    if (siteUrl.trim()) {
                      setApiBaseUrl(`${siteUrl.trim().replace(/\/+$/, '')}/wp-json`);
                    }
                    invalidateVerification();
                  }
                }}
                className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  siteType === 'wordpress'
                    ? 'border-[#21759b] bg-[#21759b]/5 ring-1 ring-[#21759b] shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/40 hover:bg-accent/30'
                }`}
              >
                <div
                  className={`p-2.5 rounded-md shrink-0 ${
                    siteType === 'wordpress' ? 'bg-[#21759b] text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <WordPressIcon className="h-4 w-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">WordPress</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Connect an existing self-hosted or managed WordPress site
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Basic Information */}
          <div className="grid gap-3 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Basic Information
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="site-name" className="text-xs font-medium">
                  Site Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site-name"
                  placeholder="e.g. Acme Tech Blog"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoFocus
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="site-slug" className="text-xs font-medium">
                  Site Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site-slug"
                  placeholder="acme-tech-blog"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  aria-invalid={!!slugError}
                />
                {slugError && <p className="text-xs text-destructive">{slugError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="site-url" className="text-xs font-medium">
                  Site URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site-url"
                  placeholder="https://vertest-ten.vercel.app"
                  value={siteUrl}
                  onChange={(e) => handleSiteUrlChange(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">The canonical URL of your website.</p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="site-desc" className="text-xs font-medium">
                  Description
                </Label>
                <Input
                  id="site-desc"
                  placeholder="Optional summary or notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Connection Configuration */}
          <div className="grid gap-3 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connection Configuration
            </Label>

            {/* Standard CMS Fields */}
            {siteType === 'standard' && (
              <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/[0.02]">
                <div className="grid gap-1.5">
                  <Label htmlFor="api-base-url" className="text-xs font-medium">
                    API Base URL
                  </Label>
                  <Input
                    id="api-base-url"
                    placeholder="https://vertest-ten.vercel.app/api"
                    value={apiBaseUrl}
                    onChange={(e) => {
                      setApiBaseUrl(e.target.value);
                      invalidateVerification();
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Receives CMS requests. Probes <code>/api/cms/health</code> for verification.
                  </p>
                </div>

                {/* Connection Token Field */}
                <div className="grid gap-1.5 pt-1">
                  <Label className="text-xs font-medium">Connection Token</Label>

                  {!connectionToken ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateToken}
                        disabled={isGeneratingToken}
                        className="font-medium shrink-0"
                      >
                        {isGeneratingToken ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Key className="h-3.5 w-3.5 mr-2 text-primary" />
                            Generate Token
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Generates a cryptographically secure 256-bit token to authenticate your external site.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showToken ? 'text' : 'password'}
                            value={connectionToken}
                            onChange={(e) => {
                              setConnectionToken(e.target.value);
                              invalidateVerification();
                            }}
                            placeholder="cms_live_..."
                            className="font-mono text-xs pr-20"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="text-muted-foreground hover:text-foreground p-1 rounded"
                              title={showToken ? 'Hide token' : 'Reveal token'}
                            >
                              {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyToken}
                              className="text-muted-foreground hover:text-foreground p-1 rounded"
                              title="Copy token"
                            >
                              {copiedToken ? (
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateToken}
                          disabled={isGeneratingToken}
                          className="text-xs h-9 shrink-0 text-muted-foreground hover:text-foreground"
                          title="Generate a new token"
                        >
                          <RefreshCw className="h-3 w-3 mr-1.5" />
                          Regenerate
                        </Button>
                      </div>

                      {/* Configure External Site - Instruction only */}
                      <div className="p-2.5 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground flex items-start gap-2">
                        <Key className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed">
                          Add this token to your external site&apos;s environment variables as <code className="text-foreground font-semibold px-1 py-0.5 rounded bg-background border border-border/80">CMS_CONNECTION_TOKEN</code>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WordPress Fields */}
            {siteType === 'wordpress' && (
              <div className="space-y-3.5 p-4 rounded-lg border border-[#21759b]/30 bg-[#21759b]/5">
                <div className="grid gap-1.5">
                  <Label htmlFor="wp-rest-url" className="text-xs font-medium">
                    WordPress REST API URL
                  </Label>
                  <Input
                    id="wp-rest-url"
                    placeholder="https://myblog.com/wp-json"
                    value={apiBaseUrl}
                    onChange={(e) => {
                      setApiBaseUrl(e.target.value);
                      invalidateVerification();
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">Defaults to /wp-json.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="wp-user" className="text-xs font-medium">
                      WordPress Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wp-user"
                      placeholder="admin"
                      value={wpUsername}
                      onChange={(e) => {
                        setWpUsername(e.target.value);
                        invalidateVerification();
                      }}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="wp-pwd" className="text-xs font-medium">
                      Application Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="wp-pwd"
                        type={showWpPassword ? 'text' : 'password'}
                        placeholder="•••• •••• •••• ••••"
                        value={wpPassword}
                        onChange={(e) => {
                          setWpPassword(e.target.value);
                          invalidateVerification();
                        }}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWpPassword(!showWpPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showWpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 <strong>Tip:</strong> Generate an Application Password in your WordPress Admin: <em>Users → Profile → Application Passwords</em>.
                </p>
              </div>
            )}

            {/* Verify Connection Action & Status */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full sm:w-auto font-medium"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 mr-2 text-primary" />
                      Verify Connection
                    </>
                  )}
                </Button>

                {/* Connection Status Pill beside button */}
                <div>
                  {verification.status === 'CONNECTED' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Connected ✓
                    </span>
                  )}
                  {verification.status === 'VERIFYING' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      Verifying...
                    </span>
                  )}
                  {verification.status === 'IDLE' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                      Not verified
                    </span>
                  )}
                  {verification.status !== 'IDLE' &&
                    verification.status !== 'VERIFYING' &&
                    verification.status !== 'CONNECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/20">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Connection failed
                      </span>
                    )}
                </div>
              </div>

              {/* Detailed failure message directly beneath the button */}
              {verification.status !== 'IDLE' &&
                verification.status !== 'VERIFYING' &&
                verification.status !== 'CONNECTED' && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1 animate-in fade-in-50">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {verification.status === 'INVALID_CREDENTIALS' && 'Invalid Connection Token'}
                      {verification.status === 'UNREACHABLE' && 'Endpoint Unreachable'}
                      {verification.status === 'INVALID_API' && 'Invalid API Endpoint'}
                      {verification.status === 'UNSUPPORTED_PLATFORM' && 'Unsupported Platform'}
                    </p>
                    <p className="text-[11px] opacity-90">{verification.message}</p>
                  </div>
                )}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating || isVerifying || verification.status !== 'CONNECTED'}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              'Save & Register Site'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Edit Site Dialog --------------------

interface EditSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site;
}

function EditSiteDialog({ open, onOpenChange, site }: EditSiteDialogProps) {
  const { t } = useT();
  const [name, setName] = useState(site.name);
  const [slug, setSlug] = useState(site.slug);
  const [description, setDescription] = useState(site.description || '');

  const getParsedConfig = (raw: unknown): Record<string, unknown> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return (raw as Record<string, unknown>) || {};
  };

  const initialConfig = getParsedConfig(site.config);
  const connection = (initialConfig?.connection as Record<string, unknown>) || null;
  const platform = (connection?.platform as string) || (initialConfig?.type === 'wordpress' ? 'wordpress' : 'standard');
  const isWordPress = platform === 'wordpress';

  // Canonical Site URL
  const initialSiteUrl = String(connection?.siteUrl || site.domain || initialConfig?.wordpressUrl || '');
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl);
  const [apiBaseUrl, setApiBaseUrl] = useState(String(connection?.apiBaseUrl || ''));
  const [wpUsername, setWpUsername] = useState(String(connection?.username || initialConfig?.wordpressUsername || ''));
  const [newPassword, setNewPassword] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    status: (connection?.status as VerificationStatus) || 'CONNECTED',
    message: connection?.status === 'CONNECTED' ? 'Connection registered' : '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const updateSite = useSiteStore((s) => s.updateSite);
  const deleteSite = useSiteStore((s) => s.deleteSite);

  useEffect(() => {
    setName(site.name);
    setSlug(site.slug);
    setDescription(site.description || '');
    const cfg = getParsedConfig(site.config);
    const conn = (cfg?.connection as Record<string, unknown>) || null;
    setSiteUrl(String(conn?.siteUrl || site.domain || cfg?.wordpressUrl || ''));
    setApiBaseUrl(String(conn?.apiBaseUrl || ''));
    setWpUsername(String(conn?.username || cfg?.wordpressUsername || ''));
    setNewPassword('');
    setVerification({
      status: (conn?.status as VerificationStatus) || 'CONNECTED',
      message: conn?.status === 'CONNECTED' ? 'Connection registered' : '',
    });
    setError('');
    setSubmitAttempted(false);
  }, [site]);

  const fieldErrors = validateSiteFields(name, slug, t);
  const nameError = submitAttempted ? fieldErrors.name : undefined;
  const slugError = submitAttempted ? fieldErrors.slug : undefined;

  const handleGenerateNewToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await fetch('/api/sites/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.token) {
        setNewPassword(data.token);
        toast.success('Generated new connection token. Remember to save.');
      }
    } catch {
      toast.error('Failed to generate token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleReverify = async () => {
    const targetUrl = siteUrl.trim();
    if (!targetUrl) {
      setError('Site URL is required to verify connection');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/sites/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          siteUrl: targetUrl,
          apiBaseUrl: platform === 'standard' ? apiBaseUrl.trim() : undefined,
          apiKey: platform === 'standard' && newPassword.trim() ? newPassword.trim() : undefined,
          restApiUrl: platform === 'wordpress' ? apiBaseUrl.trim() : undefined,
          username: platform === 'wordpress' ? wpUsername.trim() : undefined,
          appPassword: platform === 'wordpress' && newPassword.trim() ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      setVerification({
        status: data.status,
        message: data.message,
        details: data.details,
        capabilities: data.capabilities,
      });
    } catch (err) {
      setVerification({
        status: 'UNREACHABLE',
        message: err instanceof Error ? err.message : 'Failed to test connection',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    const errors = validateSiteFields(name, slug, t);
    if (errors.name || errors.slug) {
      setSubmitAttempted(true);
      return;
    }
    setSubmitAttempted(false);
    setError('');
    setIsSaving(true);
    try {
      const currentConfig = getParsedConfig(site.config);
      const existingConn = (currentConfig.connection as Record<string, unknown>) || {};

      const updatedConn: Record<string, unknown> = {
        ...existingConn,
        platform,
        siteUrl: siteUrl.trim() || existingConn.siteUrl,
        apiBaseUrl: apiBaseUrl.trim() || existingConn.apiBaseUrl,
        username: isWordPress ? wpUsername.trim() || existingConn.username : undefined,
        status: verification.status === 'CONNECTED' ? 'CONNECTED' : existingConn.status || 'CONNECTED',
        lastVerifiedAt: verification.status === 'CONNECTED' ? new Date().toISOString() : existingConn.lastVerifiedAt,
      };

      if (newPassword.trim()) {
        if (isWordPress) {
          updatedConn.appPassword = newPassword.trim();
        } else {
          updatedConn.apiKey = newPassword.trim();
        }
      }

      const newConfig = {
        ...currentConfig,
        connection: updatedConn,
      };

      await updateSite(site.id, {
        name: name.trim(),
        slug: slug.trim(),
        siteUrl: siteUrl.trim(),
        description: description.trim() || undefined,
        config: newConfig,
      });
      toast.success(t('siteSelector.siteUpdated'));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('siteSelector.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setIsDeleting(true);
    try {
      await deleteSite(site.id);
      toast.success(t('siteSelector.siteDeleted'));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('siteSelector.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t('siteSelector.editSiteTitle')}</DialogTitle>
          <DialogDescription>
            {t('siteSelector.editSiteDescriptionPrefix')} {site.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Row 1: Site Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-name">{t('siteSelector.siteNameLabel')}</Label>
              <Input
                id="edit-site-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                aria-invalid={!!nameError}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-slug">{t('siteSelector.editSiteSlugLabel')}</Label>
              <Input
                id="edit-site-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-invalid={!!slugError}
              />
              {slugError && <p className="text-xs text-destructive">{slugError}</p>}
            </div>
          </div>

          {/* Row 2: Site URL & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-url" className="text-xs font-medium">
                Site URL
              </Label>
              <Input
                id="edit-site-url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://vertest-ten.vercel.app"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-desc">{t('siteSelector.descriptionLabel')}</Label>
              <Input
                id="edit-site-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Connection Settings Box */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border/70 bg-accent/20">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Connection Configuration
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                Status: <strong className="text-foreground">{verification.status}</strong>
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-api-url" className="text-xs font-medium">
                API Base URL
              </Label>
              <Input
                id="edit-api-url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder={isWordPress ? 'https://example.com/wp-json' : 'https://example.com/api'}
              />
            </div>

            {isWordPress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-wp-user" className="text-xs font-medium">
                    Username
                  </Label>
                  <Input
                    id="edit-wp-user"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    placeholder="admin"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-wp-pwd" className="text-xs font-medium">
                    Update App Password (optional)
                  </Label>
                  <Input
                    id="edit-wp-pwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep existing"
                  />
                </div>
              </div>
            )}

            {!isWordPress && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-std-pwd" className="text-xs font-medium">
                    Connection Token
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateNewToken}
                    disabled={isGeneratingToken}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Key className="h-3 w-3 mr-1 text-primary" />
                    Generate New Token
                  </Button>
                </div>
                {newPassword ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-std-pwd"
                      type="text"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setVerification({ status: 'IDLE', message: '' });
                      }}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        setCopiedToken(true);
                        toast.success('New token copied to clipboard');
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="h-9 px-3 text-xs shrink-0"
                    >
                      {copiedToken ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {copiedToken ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Connected with stored token. Click &quot;Generate New Token&quot; above to rotate secrets.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReverify}
                disabled={isVerifying}
                className="text-xs h-7"
              >
                {isVerifying ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                )}
                Test Connection
              </Button>
              {verification.message && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                  {verification.message}
                </span>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="mr-auto"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('siteSelector.deleteSiteButton')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('siteSelector.updateSiteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Sidebar Site Selector --------------------

export function SiteSelector() {
  const { t } = useT();
  const sites = useSiteStore((s) => s.sites);
  const activeSite = useSiteStore((s) => s.getActiveSite());
  const isAllSites = useSiteStore((s) => s.isAllSites());
  const setActiveSite = useSiteStore((s) => s.setActiveSite);
  const setAllSites = useSiteStore((s) => s.setAllSites);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';

  // Safety cleanup: Ensure document.body.style.pointerEvents is restored
  useEffect(() => {
    if (!showCreate && !editSite && !menuOpen) {
      const timer = setTimeout(() => {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.pointerEvents = '';
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showCreate, editSite, menuOpen]);

  const handleCreated = useCallback((site: Site) => {
    setActiveSite(site.id);
    setShowCreate(false);
  }, [setActiveSite]);

  const handleDropdownOpenChange = (open: boolean) => {
    setMenuOpen(open);
    if (open) {
      useSiteStore.getState().fetchSites();
    }
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            variant="outline"
            isActive={!!activeSite}
            tooltip={{
              side: 'right',
              align: 'center',
              sideOffset: 8,
              collisionPadding: 12,
              children: t('siteSelector.switchSite'),
            }}
            className="h-9 border border-sidebar-border bg-background/60 shadow-sm hover:bg-sidebar-accent hover:border-sidebar-accent-foreground/20 hover:shadow-md data-[state=open]:bg-sidebar-accent data-[state=open]:border-sidebar-accent-foreground/20 data-[active=true]:bg-sidebar-accent/60 transition-all duration-150"
            aria-label={
              activeSite
                ? `${t('siteSelector.switchSiteCurrentPrefix')} ${activeSite.name}`
                : t('siteSelector.switchSiteAll')
            }
          >
            {isCollapsed ? (
              <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : activeSite ? (
              <span
                className={`h-2 w-2 rounded-full shrink-0 ring-2 ring-background ${getSiteColor(activeSite.slug)}`}
                aria-hidden="true"
              />
            ) : (
              <LayoutGrid className="h-4 w-4 shrink-0 text-sidebar-foreground/70" aria-hidden="true" />
            )}
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate text-sm font-medium">
                  {activeSite ? activeSite.name : t('siteSelector.allSites')}
                </span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </>
            )}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isCollapsed ? 'center' : 'start'}
          side={isCollapsed ? 'right' : 'bottom'}
          sideOffset={isCollapsed ? 8 : 4}
          collisionPadding={12}
          className="w-72"
          onCloseAutoFocus={(e) => {
            if (showCreate || editSite) {
              e.preventDefault();
            }
          }}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            {t('siteSelector.switchSite')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* All Sites option */}
          <DropdownMenuItem
            className={isAllSites ? 'bg-accent' : ''}
            onClick={() => {
              setAllSites();
              setMenuOpen(false);
              const forbiddenInAllSites = new Set([
                'seo',
                'ai',
                'automation',
                'settings',
                'notifications',
                'email-templates',
                'backups',
              ]);
              const curMod = useNavigationStore.getState().currentModule;
              if (forbiddenInAllSites.has(curMod)) {
                const isInternal = useAuthStore.getState().user?.role === 'INTERNAL';
                useNavigationStore.getState().navigate(isInternal ? 'internal-dashboard' : 'dashboard');
              }
            }}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span className="flex-1">{t('siteSelector.allSites')}</span>
            {isAllSites && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Individual sites */}
          {sites.filter((s) => s.status === 'ACTIVE').map((s) => {
            const rawCfg = typeof s.config === 'string'
              ? (() => { try { return JSON.parse(s.config); } catch { return {}; } })()
              : (s.config || {});
            const isWp = (rawCfg as Record<string, unknown>)?.type === 'wordpress';
            return (
              <DropdownMenuItem
                key={s.id}
                className={activeSite?.id === s.id ? 'bg-accent' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSite(s.id);
                  setMenuOpen(false);
                }}
              >
                <span
                  className={`mr-2 h-2 w-2 rounded-full shrink-0 ${getSiteColor(s.slug)}`}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{s.name}</span>
                {isWp && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#21759b]/15 text-[#21759b] mr-1.5 shrink-0">
                    <WordPressIcon className="h-2.5 w-2.5 fill-current" />
                    WP
                  </span>
                )}
                {activeSite?.id === s.id && (
                  <Check className="h-4 w-4 text-primary shrink-0 mr-1" />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${s.name} settings`}
                  className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setEditSite(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      setEditSite(s);
                    }
                  }}
                >
                  <Settings className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuItem>
            );
          })}
          {sites.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t('siteSelector.noSitesYet')}
            </div>
          )}
          <DropdownMenuSeparator />
          {/* Create new site */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setShowCreate(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('siteSelector.createTitle')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateSiteDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />

      {editSite && (
        <EditSiteDialog
          open={!!editSite}
          onOpenChange={(open) => {
            if (!open) setEditSite(null);
          }}
          site={editSite}
        />
      )}
    </>
  );
}
