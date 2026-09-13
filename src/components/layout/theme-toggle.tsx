'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useT } from '@/lib/i18n';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * SINGLE-SOURCE theme toggle (next-themes — the existing theme state).
 *
 * • Topbar usage   → <ThemeToggle />            (no tooltip, as before)
 * • Collapsed rail → <ThemeToggle withTooltip /> (tooltip to the right)
 *
 * No second theme state is introduced; clicking only flips the global
 * theme exactly like the original inline topbar button did.
 *
 * TOOLTIP POSITIONING (collapsed-rail only — the topbar usage returns
 * the bare button, so this only fires when withTooltip=true):
 *   side="right"          → opens to the RIGHT of the 48px collapsed
 *                            rail, fully inside the main viewport.
 *   align="center"        → vertically centers the bubble on the icon's
 *                            32×32 hover target.
 *   sideOffset=8          → ~8px visible gap from the trigger button's
 *                            right edge (tooltip left edge flush with
 *                            the rail's right edge — never touches the
 *                            icon glyph).
 *   collisionPadding=12  → 12px viewport-edge collision padding so the
 *                            bubble is never clipped at any viewport
 *                            edge.
 * These four values are the SAME ones defined as COLLAPSED_TOOLTIP_PROPS
 * in src/components/layout/sidebar.tsx and applied to every other
 * collapsed-rail tooltip (CollapsedLogoButton, SimpleNavItem,
 * ExpandableNavItem, CollapsedParentNavItem). The values are inlined
 * here (instead of importing the constant) because theme-toggle.tsx is
 * a leaf component with no other sidebar coupling — keeping the values
 * local keeps the file self-contained while still guaranteeing identical
 * positioning. If you change them here, change them in sidebar.tsx too.
 */
export function ThemeToggle({ withTooltip = false }: { withTooltip?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useT();

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('topbar.toggleTheme')}</span>
    </Button>
  );

  if (!withTooltip) return button;

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={8}
        collisionPadding={12}
      >
        {t('topbar.toggleTheme')}
      </TooltipContent>
    </Tooltip>
  );
}
