'use client';

// ============================================================
// MARKETING PRIMITIVES — the shared design-system building blocks
// ============================================================
// Every marketing page composes from THESE atoms so the whole
// public site shares one visual language: buttons, section
// headers, reveal-on-scroll, browser-framed screenshots and the
// brand logo. No page defines its own copy of these patterns.
// ============================================================

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Hydration-safe "is mounted" flag WITHOUT setState-in-effect —
// the canonical useSyncExternalStore pattern (server snapshot false,
// client snapshot true, resolved after hydration).
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// -------------------- Brand logo --------------------
// A geometric mark implied by a crafted stroke — tool-like,
// quiet. Scales from 20px to 48px contexts. Pure SVG
// (theme-aware via currentColor).
// variant 'S' = the default house mark; variant 'K' = the
// Karmax presentation used by the public site.
// tone 'primary' = near-black square (default, light surfaces);
// tone 'accent'  = Karmax brand-orange square (dark surfaces such
//                  as the always-dark enterprise footer).

export function Logo({
  className = 'h-7 w-7',
  variant = 'S',
  tone = 'primary',
}: {
  className?: string;
  variant?: 'S' | 'K';
  tone?: 'primary' | 'accent';
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className={tone === 'accent' ? 'fill-mkt-accent' : 'fill-primary'}
      />
      {variant === 'S' ? (
        <path
          d="M20.5 9.5h-7a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7h-7"
          stroke="currentColor"
          className={tone === 'accent' ? 'text-mkt-accent-fg' : 'text-primary-foreground'}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M11.5 9v14M21 9.5l-9.5 6.5 9.5 6.5"
          stroke="currentColor"
          className={tone === 'accent' ? 'text-mkt-accent-fg' : 'text-primary-foreground'}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function LogoWordmark({
  className = '',
  name,
  variant,
}: {
  className?: string;
  name?: string;
  variant?: 'S' | 'K';
}) {
  const { t } = useT();
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo className="h-7 w-7" variant={variant} />
      <span className="text-[1.0625rem] font-bold tracking-tight text-text-primary">
        {name ?? t('mkt.brand.name')}
      </span>
    </span>
  );
}

// -------------------- Buttons --------------------
// Primary: the Karmax brand action — orange pill, darkening
// hover, soft shadow + arrow slides. Secondary: transparent
// w/ border, same height/radius. Ghost: quiet text link.
// Both rendered <a> (marketing navigation is link-shaped).
// `onDark` re-skins the secondary/ghost variants for the always-
// dark footer surface (footer tokens instead of light-theme ones).

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface MarketingButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  withArrow?: boolean;
  external?: boolean;
  onDark?: boolean;
}

function variantClasses(variant: ButtonVariant, onDark: boolean): string {
  if (onDark && variant === 'secondary') {
    return 'bg-transparent text-mkt-footer-heading border border-mkt-footer-border-strong hover:border-white/45 hover:bg-white/10';
  }
  if (onDark && variant === 'ghost') {
    return 'bg-transparent text-mkt-footer-text hover:text-mkt-footer-heading';
  }
  switch (variant) {
    case 'primary':
      return 'bg-mkt-accent text-mkt-accent-fg hover:bg-mkt-accent-strong shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:shadow-[0_4px_16px_-4px_rgb(0_0_0/0.25)]';
    case 'secondary':
      return 'bg-transparent text-text-primary border border-border hover:border-muted-foreground/50 hover:bg-muted/40';
    default:
      return 'bg-transparent text-text-secondary hover:text-text-primary';
  }
}

export function MarketingButton({
  variant = 'primary',
  size = 'md',
  withArrow = false,
  external = false,
  onDark = false,
  className = '',
  children,
  ...props
}: MarketingButtonProps) {
  return (
    <a
      className={`group/mkt-cta mkt-focus inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-200 ${
        size === 'lg' ? 'h-12 px-6 text-[0.9375rem]' : 'h-10 px-5 text-sm'
      } ${variantClasses(variant, onDark)} ${className}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      {children}
      {withArrow && <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />}
    </a>
  );
}

// -------------------- Section header --------------------

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mkt-eyebrow inline-flex items-center gap-2">
      <span className="h-1 w-1 rounded-full bg-mkt-accent" aria-hidden="true" />
      {children}
    </span>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}

export function SectionHeader({ eyebrow, title, subtitle, align = 'center', className = '' }: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === 'center' ? 'items-center text-center mx-auto max-w-2xl' : 'items-start'
      } ${className}`}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mkt-h2 text-text-primary text-[1.75rem] sm:text-4xl">{title}</h2>
      {subtitle && <p className="text-text-secondary text-base sm:text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// -------------------- Reveal on scroll --------------------
// IntersectionObserver-based fade-up. Falls back to visible when
// IO is unavailable. prefers-reduced-motion handled in CSS.

export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const Tag = as as React.ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support (or reduced-motion environments) — reveal
      // immediately via direct DOM class (no cascading setState).
      el.classList.add('mkt-reveal-visible');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`mkt-reveal ${visible ? 'mkt-reveal-visible' : ''} ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

// -------------------- Browser frame --------------------
// Wraps product screenshots in a premium window chrome.

export function BrowserFrame({
  src,
  alt,
  label,
  className = '',
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  return (
    <figure className={`mkt-card-hover rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_40px_-12px_rgb(0_0_0/0.12)] overflow-hidden ${className}`}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
        {label && (
          <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-mkt-accent-soft px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-mkt-accent-soft-fg">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mkt-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mkt-accent" />
            </span>
            {label}
          </span>
        )}
      </div>
      <div className="bg-card">
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className="w-full h-auto"
          width={1440}
          height={900}
        />
      </div>
    </figure>
  );
}

// -------------------- Feature point list --------------------

export function PointList({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {points.map((p, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mkt-accent-soft text-mkt-accent-soft-fg">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="leading-relaxed">{p}</span>
        </li>
      ))}
    </ul>
  );
}

// -------------------- Divider --------------------

export function HairlineDivider() {
  return (
    <div className="mkt-container" aria-hidden="true">
      <div className="h-px w-full bg-border" />
    </div>
  );
}
