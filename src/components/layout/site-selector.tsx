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

function CreateSiteDialog({ open, onOpenChange, onCreated }: CreateSiteDialogProps) {
  const { t } = useT();
  const [siteType, setSiteType] = useState<'standard' | 'wordpress'>('standard');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const createSite = useSiteStore((s) => s.createSite);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSiteType('standard');
      setName('');
      setSlug('');
      setDomain('');
      setDescription('');
      setWpUrl('');
      setWpUsername('');
      setWpPassword('');
      setError('');
      setSubmitAttempted(false);
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

  const handleSubmit = async () => {
    const errors = validateSiteFields(name, slug, t);
    if (errors.name || errors.slug) {
      setSubmitAttempted(true);
      return;
    }
    if (siteType === 'wordpress' && !wpUrl.trim()) {
      setError('Please provide your WordPress Site URL');
      setSubmitAttempted(true);
      return;
    }
    setSubmitAttempted(false);
    setError('');
    setIsCreating(true);
    try {
      const site = await createSite({
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || (siteType === 'wordpress' && wpUrl.trim() ? wpUrl.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : undefined),
        description: description.trim() || undefined,
        siteType,
        config: siteType === 'wordpress' ? {
          type: 'wordpress',
          wordpressUrl: wpUrl.trim(),
          wordpressUsername: wpUsername.trim() || undefined,
          wordpressAppPassword: wpPassword.trim() || undefined,
        } : {
          type: 'standard',
        },
      });
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('siteSelector.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('siteSelector.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Site Platform Option */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSiteType('standard')}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  siteType === 'standard'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/40 hover:bg-accent/30'
                }`}
              >
                <div className={`p-2 rounded-md shrink-0 ${siteType === 'standard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">Standard CMS</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Built-in headless publication</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSiteType('wordpress')}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  siteType === 'wordpress'
                    ? 'border-[#21759b] bg-[#21759b]/5 ring-1 ring-[#21759b] shadow-xs'
                    : 'border-border/70 hover:border-muted-foreground/40 hover:bg-accent/30'
                }`}
              >
                <div className={`p-2 rounded-md shrink-0 ${siteType === 'wordpress' ? 'bg-[#21759b] text-white' : 'bg-muted text-muted-foreground'}`}>
                  <WordPressIcon className="h-4 w-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">WordPress</div>
                  <div className="text-xs text-muted-foreground mt-0.5">External WordPress site</div>
                </div>
              </button>
            </div>
          </div>

          {/* Row 1: Site Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="site-name">{t('siteSelector.siteNameLabel')}</Label>
              <Input
                id="site-name"
                placeholder={t('siteSelector.siteNamePlaceholder')}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="site-slug">{t('siteSelector.slugLabel')}</Label>
              <Input
                id="site-slug"
                placeholder={t('siteSelector.slugPlaceholder')}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-invalid={!!slugError}
              />
              {slugError && (
                <p className="text-xs text-destructive">{slugError}</p>
              )}
            </div>
          </div>

          {siteType === 'wordpress' && (
            <div className="space-y-3 p-3.5 rounded-lg border border-[#21759b]/30 bg-[#21759b]/5 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <WordPressIcon className="h-4 w-4 text-[#21759b] fill-current" />
                <span className="text-xs font-semibold text-foreground">WordPress Connection</span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wp-url" className="text-xs font-medium">WordPress Site URL <span className="text-destructive">*</span></Label>
                <Input
                  id="wp-url"
                  placeholder="https://myblog.com"
                  value={wpUrl}
                  onChange={(e) => {
                    setWpUrl(e.target.value);
                    if (!domain) {
                      const cleaned = e.target.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                      setDomain(cleaned);
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">The full URL of your existing WordPress instance.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="wp-user" className="text-xs font-medium">Username (Optional)</Label>
                  <Input
                    id="wp-user"
                    placeholder="admin"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="wp-pwd" className="text-xs font-medium">App Password (Optional)</Label>
                  <Input
                    id="wp-pwd"
                    type="password"
                    placeholder="•••• •••• ••••"
                    value={wpPassword}
                    onChange={(e) => setWpPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Custom Domain & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="site-domain">{t('siteSelector.domainOptionalLabel')}</Label>
              <Input
                id="site-domain"
                placeholder={t('siteSelector.domainPlaceholder')}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="site-desc">{t('siteSelector.descriptionOptionalLabel')}</Label>
              <Input
                id="site-desc"
                placeholder={t('siteSelector.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? t('siteSelector.creating') : t('siteSelector.createButton')}
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
  const [domain, setDomain] = useState(site.domain || '');
  const [description, setDescription] = useState(site.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const updateSite = useSiteStore((s) => s.updateSite);
  const deleteSite = useSiteStore((s) => s.deleteSite);

  const getParsedConfig = (raw: unknown): Record<string, unknown> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return (raw as Record<string, unknown>) || {};
  };

  const initialConfig = getParsedConfig(site.config);
  const isWordPress = initialConfig?.type === 'wordpress';
  const [wpUrl, setWpUrl] = useState(String(initialConfig?.wordpressUrl || ''));
  const [wpUsername, setWpUsername] = useState(String(initialConfig?.wordpressUsername || ''));
  const [wpPassword, setWpPassword] = useState(String(initialConfig?.wordpressAppPassword || ''));

  useEffect(() => {
    setName(site.name);
    setSlug(site.slug);
    setDomain(site.domain || '');
    setDescription(site.description || '');
    const cfg = getParsedConfig(site.config);
    setWpUrl(String(cfg?.wordpressUrl || ''));
    setWpUsername(String(cfg?.wordpressUsername || ''));
    setWpPassword(String(cfg?.wordpressAppPassword || ''));
    setError('');
    setSubmitAttempted(false);
  }, [site]);

  const fieldErrors = validateSiteFields(name, slug, t);
  const nameError = submitAttempted ? fieldErrors.name : undefined;
  const slugError = submitAttempted ? fieldErrors.slug : undefined;

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
      const newConfig = {
        ...currentConfig,
        ...(isWordPress ? {
          type: 'wordpress',
          wordpressUrl: wpUrl.trim(),
          wordpressUsername: wpUsername.trim() || undefined,
          wordpressAppPassword: wpPassword.trim() || undefined,
        } : {}),
      };
      await updateSite(site.id, {
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{t('siteSelector.editSiteTitle')}</DialogTitle>
            {isWordPress && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#21759b]/15 text-[#21759b] text-[11px] font-semibold">
                <WordPressIcon className="h-3.5 w-3.5 fill-current" />
                WordPress
              </span>
            )}
          </div>
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
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-slug">{t('siteSelector.editSiteSlugLabel')}</Label>
              <Input
                id="edit-site-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-invalid={!!slugError}
              />
              {slugError && (
                <p className="text-xs text-destructive">{slugError}</p>
              )}
            </div>
          </div>

          {isWordPress && (
            <div className="space-y-3 p-3.5 rounded-lg border border-[#21759b]/30 bg-[#21759b]/5">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <WordPressIcon className="h-3.5 w-3.5 text-[#21759b] fill-current" />
                <span className="text-xs font-semibold text-foreground">WordPress Connection Settings</span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-wp-url" className="text-xs font-medium">WordPress Site URL</Label>
                <Input
                  id="edit-wp-url"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-wp-user" className="text-xs font-medium">Username</Label>
                  <Input
                    id="edit-wp-user"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    placeholder="admin"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-wp-pwd" className="text-xs font-medium">App Password</Label>
                  <Input
                    id="edit-wp-pwd"
                    type="password"
                    value={wpPassword}
                    onChange={(e) => setWpPassword(e.target.value)}
                    placeholder="•••• •••• ••••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Custom Domain & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-site-domain">{t('siteSelector.domainLabel')}</Label>
              <Input
                id="edit-site-domain"
                placeholder={t('siteSelector.domainPlaceholder')}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
