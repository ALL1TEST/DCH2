'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  User,
  LogOut,
  CreditCard,
  Languages,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNavigationStore } from '@/lib/stores/navigation-store';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import {
  useLocaleStore,
  useT,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  getLocaleNativeName,
  getPlatformLocales,
  translateForLocale,
  type Locale,
  type SupportedLocale,
} from '@/lib/i18n';
import {
  useSubscriptionStore,
  getPlanBadgeStyle,
} from '@/lib/stores/subscription-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlanBadge } from '@/components/layout/plan-badge';
import { toast } from 'sonner';

/**
 * SINGLE-SOURCE profile menu (Profile / Language / Theme /
 * Manage Subscription / Log out).
 *
 * Used by BOTH the topbar avatar and the collapsed-sidebar avatar so there
 * is exactly one implementation of the menu itself. The caller provides the
 * trigger element as `children`.
 *
 * Positioning defaults match the original topbar usage (side bottom +
 * align end); callers may override via props without touching the menu
 * contents.
 *
 * HOVER TOOLTIP (withTooltip=true, used ONLY by the collapsed-rail
 * avatar): wraps the trigger children in a HOVER Tooltip showing the
 * "Profile" label to the right of the collapsed sidebar rail (positioned
 * identically to every other collapsed-rail tooltip — see
 * COLLAPSED_TOOLTIP_PROPS in sidebar.tsx). The Tooltip is suppressed
 * while the dropdown is open so the two never visually conflict. The
 * TooltipTrigger asChild + DropdownMenuTrigger asChild composition
 * (Radix Slot chaining) lets the same Button serve BOTH triggers:
 * hover → Tooltip, click → Dropdown. NO clicking required to see the
 * label. The Dropdown's open state is tracked internally via useState
 * (instead of leaving it uncontrolled) so the Tooltip's `hidden={open}`
 * suppression works.
 */
export function UserProfileMenu({
  children,
  side,
  align = 'end',
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 8,
  withTooltip = false,
  tooltipLabel = 'Profile',
}: {
  /** The dropdown trigger element (must accept refs / event props). */
  children: React.ReactNode;
  /** Optional Radix side override (e.g. right for the collapsed rail). */
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Vertical gap between the trigger and the dropdown (px). */
  sideOffset?: number;
  /** Horizontal shift from the alignment anchor (px). A positive value
      with align="start" shifts the dropdown rightward — used by the
      sidebar footer to create a visible gap from the sidebar's left
      edge so the dropdown opens slightly inside the page. */
  alignOffset?: number;
  /** Optional viewport collision padding (corner-anchored triggers). */
  collisionPadding?: number;
  /** When true, wraps the trigger children in a HOVER Tooltip showing
      the label (default "Profile"). See component JSDoc above. */
  withTooltip?: boolean;
  /** Label text for the hover Tooltip (default "Profile"). */
  tooltipLabel?: string;
}) {
  // Track the Dropdown's open state so the hover Tooltip can be
  // suppressed (hidden={open}) while the dropdown is open — without
  // this, the Tooltip bubble would visually conflict with the open
  // dropdown panel.
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const closeMobile = useSidebarStore((s) => s.closeMobile);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { t } = useT();
  // Dedicated Internal Account (role INTERNAL) — the internal SaaS
  // account. NOT platform staff (no platform locale restriction, no
  // platform treatment) but ALSO without a personal subscription, so
  // the plan ring/badge and "Manage Subscription" are hidden for it
  // exactly like platform staff — its account-type badge says
  // "Internal Account" instead.
  const isInternalAccount = user?.role === 'INTERNAL';
  // Language list offered in the submenu — CLIENT roles (Admin User)
  // and the Internal Account get the FULL supported-locales registry
  // (the single source of truth); incomplete dictionaries fall back to
  // English per key. Platform staff (OWNER / PLATFORM_ADMIN) only get
  // the locales whose Platform Admin dictionaries are COMPLETE
  // (en + fr) so the platform dashboard never pretends a
  // partially-translated language is fully supported.
  const isPlatformStaff = user?.role === 'OWNER' || user?.role === 'PLATFORM_ADMIN';
  const availableLocales: readonly SupportedLocale[] = isPlatformStaff
    ? getPlatformLocales()
    : SUPPORTED_LOCALES;
  // Active plan — drives the colored ring on the header avatar so the
  // dropdown header's avatar matches the top-right topbar avatar trigger
  // exactly (same ring color/thickness/offset). Platform admins
  // (OWNER / PLATFORM_ADMIN) have INTERNAL billing and no personal
  // subscription, so the plan-derived ring + PlanBadge are suppressed
  // for them — a neutral ring is used instead and no badge is shown.
  // The plan comes from the SERVER-SYNCED subscription store (the same
  // /api/platform/billing/me source Billing & Subscription uses); while
  // the first sync is still in flight the ring stays neutral so a
  // default/stale plan color is never displayed.
  const { currentPlan, serverSynced } = useSubscriptionStore();
  // (isPlatformStaff is derived above, next to the locale list.)
  // Theme — same next-themes state the old topbar ThemeToggle used. The
  // dropdown is now the single in-header access point for the theme
  // control (the standalone topbar toggle was removed to avoid a
  // duplicate). setTheme persists via next-themes (localStorage +
  // html.dark class), so the whole app re-renders consistently.
  // `theme` is the STORED preference (may be 'system');
  // `resolvedTheme` is what is actually rendered — used for the row icon.
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleNavigate = (targetMod: string) => {
    useNavigationStore.getState().navigate(targetMod);
    closeMobile();
  };

  // Selecting a locale from the submenu — stores it via the SAME
  // i18n store (persisted in localStorage under 'cms_locale'), so
  // it survives navigation, refresh and reopening the app.
  // The confirmation toast is resolved through the NEW locale's
  // dictionary (translateForLocale) rather than this render's t()
  // closure — t() still holds the PREVIOUS locale at click time, so
  // using it here would show the confirmation in the old language.
  const handleSetLocale = (next: Locale) => {
    setLocale(next);
    toast.success(`${translateForLocale(next, 'language.set')} ${getLocaleNativeName(next)}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {withTooltip ? (
        /* HOVER Tooltip wraps the trigger children (the avatar Button
           passed by the caller) so the label appears on plain mouse
           hover (no click required) — positioned identically to every
           other collapsed-rail tooltip (side=right, align=center,
           sideOffset=8, collisionPadding=12 — the SAME four values as
           COLLAPSED_TOOLTIP_PROPS in sidebar.tsx, inlined here because
           user-profile-menu.tsx is a leaf component). The values are
           inlined (not imported) to keep the file self-contained; if
           you change them here, change them in sidebar.tsx +
           theme-toggle.tsx + notification-bell.tsx too.

           Slot chaining: TooltipTrigger asChild → DropdownMenuTrigger
           asChild → children (the avatar Button). Both Slots clone the
           Button and merge their props, so the same Button element
           serves BOTH triggers — hover fires the Tooltip, click fires
           the Dropdown. hidden={open} forces the Tooltip content
           display:none while the dropdown is open so the label never
           visually conflicts with the open profile menu panel. */
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              {children}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            hidden={open}
          >
            {tooltipLabel}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
      )}
      {/* z-[60]: floats above sidebar (z-10) and sticky headers (z-40/50)
          so the menu is never hidden behind any layer. Compact 224px
          popover: header → Profile → Language → Manage Subscription →
          Log out, with a subtle divider between every section. */}
      <DropdownMenuContent
        className="w-56 z-[60] rounded-lg shadow-lg"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        {/* 1 — Profile header: circular avatar on the LEFT, vertically
            centered; name on the first line and email directly below in
            smaller gray text, both aligned to the right of the avatar.
            Same image source as the sidebar/topbar triggers (avatarUrl →
            initials fallback). truncate keeps long names/emails from
            breaking the two-line alignment. */}
        <DropdownMenuLabel className="font-normal px-2 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Header avatar — visually identical ring treatment to the
                top-right topbar avatar trigger: same size class family
                (rounded-full), same ring-2 + ring-offset-2 + plan-derived
                ring color, so the two avatars look like the same profile
                "chip" in both locations. Slightly larger (h-11 w-11) than
                the topbar trigger (h-8 w-8) so it reads as the prominent
                header of the open menu, matching the reference layout. */}
            <Avatar className={cn(
              'h-11 w-11 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background',
              // Platform staff: neutral ring (no personal subscription).
              // Internal Account: green ring (ring-emerald-500) — the
              // same status-green ring color the design system uses for
              // the Free plan's active avatar (getPlanBadgeStyle(free).ring
              // → ring-emerald-500). This gives the Internal Account a
              // green circular border matching the Admin User's active
              // account avatar, using the existing design-system color
              // rather than inventing a new one. Client users keep the
              // plan-colored ring resolved from their active subscription.
              isPlatformStaff ? 'ring-border'
                : isInternalAccount ? 'ring-emerald-500'
                : serverSynced ? getPlanBadgeStyle(currentPlan).ring : 'ring-border',
            )}>
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                alt={user?.name ?? 'User'}
              />
              <AvatarFallback className="text-sm font-medium">
                {user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col space-y-0.5">
              {/* Name + plan badge on the first line. The badge is the
                  SAME PlanBadge component used on the top-right avatar
                  trigger (see topbar.tsx) — single source of truth, so
                  the two always render identically. Only the positioning
                  differs: the avatar trigger anchors it with absolute
                  -bottom-1.5, while here it sits inline next to the name
                  with shrink-0 so the flex row never compresses it. */}
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-medium leading-5">
                  {user?.name ?? 'User'}
                </p>
                {/* Plan badge is hidden for platform staff (they have no
                    personal subscription — INTERNAL billing bypass). The
                    Internal Account ALSO shows no badge here — the
                    account identity is already surfaced in the sidebar
                    footer (name + INTERNAL ACCOUNT badge) and the
                    dashboard header, so duplicating it in the profile
                    dropdown header would be redundant. The name + email
                    alone identify the account cleanly. */}
                {!isPlatformStaff && !isInternalAccount && <PlanBadge className="shrink-0" />}
              </div>
              <p className="truncate text-xs leading-4 text-muted-foreground">
                {user?.email ?? ''}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 2 — Profile → existing profile page */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNavigate('profile')}
        >
          <User className="h-4 w-4" />
          {t('menu.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* 3 — Language → submenu listing the COMPLETE supported
            locale registry (source of truth: SUPPORTED_LOCALES in
            src/lib/i18n). Compact scrollable rows; a checkmark marks
            the active locale and English (the default language)
            carries a small "Default" badge. Selecting a locale goes
            through the existing i18n store (persisted + fallback to
            English for untranslated keys). Platform staff see only
            the fully-translated platform locales (en + fr). */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('menu.language')}</span>
            <span className="flex-1 truncate pl-4 text-right text-xs text-muted-foreground">
              {getLocaleNativeName(locale)}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="z-[70] w-48 p-0">
            <div
              className="max-h-72 overflow-y-auto p-1"
              role="listbox"
              aria-label={t('menu.language')}
            >
              {availableLocales.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  className="cursor-pointer gap-2 rounded-md py-1.5 text-sm"
                  onClick={() => handleSetLocale(l.code)}
                  aria-selected={locale === l.code}
                >
                  <span className="min-w-0 flex-1 truncate">{l.nativeName}</span>
                  {l.code === DEFAULT_LOCALE && (
                    <span className="shrink-0 rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                      {t('menu.default')}
                    </span>
                  )}
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {locale === l.code && <Check className="h-3.5 w-3.5" aria-hidden />}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        {/* 4 — Theme → submenu with EXACTLY Light / Dark / System.
            Reuses the SAME next-themes state the rest of the app uses
            (no second source of truth) and persists the choice through
            next-themes' own storage — Light and Dark switch the entire
            dashboard immediately, System follows the OS preference.
            The active option shows a checkmark on the right. */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">{t('menu.theme')}</span>
            <span className="flex-1 truncate pl-4 text-right text-xs text-muted-foreground">
              {theme === 'system' ? t('menu.system') : theme === 'dark' ? t('menu.dark') : t('menu.light')}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="z-[70] w-40 p-1">
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-md py-1.5 text-sm"
              onClick={() => { setTheme('light'); toast.success(t('theme.setLight')); }}
              aria-selected={theme === 'light'}
            >
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{t('menu.light')}</span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {theme === 'light' && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-md py-1.5 text-sm"
              onClick={() => { setTheme('dark'); toast.success(t('theme.setDark')); }}
              aria-selected={theme === 'dark'}
            >
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{t('menu.dark')}</span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {theme === 'dark' && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-md py-1.5 text-sm"
              onClick={() => { setTheme('system'); toast.success(t('theme.setSystem')); }}
              aria-selected={theme === 'system'}
            >
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{t('menu.system')}</span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {theme === 'system' && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        {/* 5 — Manage Subscription → existing billing module. Hidden for
            platform staff (OWNER / PLATFORM_ADMIN) and the Internal
            Account (INTERNAL role): none of them has a personal
            subscription — the Internal Account is the platform team's
            internal SaaS account (billing bypass), not a paying client,
            so a "Manage Subscription" action does not apply. */}
        {!isPlatformStaff && !isInternalAccount && (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => handleNavigate('billing')}
            >
              <CreditCard className="h-4 w-4" />
              {t('menu.manageSubscription')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* 6 — Log out (destructive, existing auth-store handler) */}
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          {t('menu.logOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
