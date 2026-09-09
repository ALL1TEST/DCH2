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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const createSite = useSiteStore((s) => s.createSite);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('');
      setSlug('');
      setDomain('');
      setDescription('');
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
    setSubmitAttempted(false);
    setError('');
    setIsCreating(true);
    try {
      const site = await createSite({
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
        description: description.trim() || undefined,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('siteSelector.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('siteSelector.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
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
          <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label htmlFor="site-domain">{t('siteSelector.domainOptionalLabel')}</Label>
            <Input
              id="site-domain"
              placeholder={t('siteSelector.domainPlaceholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="site-desc">{t('siteSelector.descriptionOptionalLabel')}</Label>
            <Input
              id="site-desc"
              placeholder={t('siteSelector.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
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

  useEffect(() => {
    setName(site.name);
    setSlug(site.slug);
    setDomain(site.domain || '');
    setDescription(site.description || '');
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
      await updateSite(site.id, {
        name: name.trim(),
        slug: slug.trim(),
        domain: domain.trim() || undefined,
        description: description.trim() || undefined,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('siteSelector.editSiteTitle')}</DialogTitle>
          <DialogDescription>
            {t('siteSelector.editSiteDescriptionPrefix')} {site.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
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
          <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label htmlFor="edit-site-domain">{t('siteSelector.domainLabel')}</Label>
            <Input
              id="edit-site-domain"
              placeholder={t('siteSelector.domainPlaceholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-site-desc">{t('siteSelector.descriptionLabel')}</Label>
            <Input
              id="edit-site-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
