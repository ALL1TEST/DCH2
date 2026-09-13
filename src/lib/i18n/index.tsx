'use client';

// ============================================================
// i18n — PUBLIC API (single source of truth for localization)
// ============================================================
// This folder-based module REPLACES the old single-file
// src/lib/i18n.tsx. The public API surface is IDENTICAL (plus a
// few additive exports), so every existing
// `import { ... } from '@/lib/i18n'` keeps working:
//
//   • Locale (type)               — now the union of ALL 40
//                                   supported locale codes
//   • useLocaleStore / setLocale  — same zustand store, same
//                                   'cms_locale' localStorage key
//   • I18nProvider / useT         — same provider + hook, same
//                                   fallback semantics
//
// ADDITIVE exports (nothing existing was renamed/removed):
//   • SUPPORTED_LOCALES            — the complete registry
//                                     (code + nativeName) — THE
//                                     single source of truth the
//                                     language selector reads.
//   • DEFAULT_LOCALE               — 'en' (English stays default)
//   • PLATFORM_COMPLETE_LOCALES    — locales whose Platform Admin
//                                     dictionaries are COMPLETE
//                                     (['en','fr']). The Platform
//                                     Admin language submenu offers
//                                     exactly these, so the
//                                     platform UI never pretends a
//                                     partially-translated locale
//                                     is fully supported.
//   • isSupportedLocale / getLocaleNativeName / getPlatformLocales
//
// FALLBACK — t(key) resolves as:
//     dictionaries[locale][key] ?? dictionaries.en[key] ?? key
// so an incomplete locale dictionary NEVER breaks the UI and
// never fakes a translation: untranslated keys render English.
// ============================================================

import { create } from 'zustand';
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { dictionaries } from './locales';

// -------------------- Locale registry --------------------

/**
 * The complete list of locale codes supported by the application.
 * Order = display order in the Language submenu (English first —
 * the default language — then the remaining languages).
 */
export const LOCALE_CODES = [
  'en', 'fr', 'de', 'es', 'it', 'pt-BR', 'pt-PT', 'nl', 'ru',
  'ja', 'ko', 'zh', 'ar', 'hi', 'bn', 'gu', 'fa', 'pa', 'mr',
  'ta', 'te', 'kn', 'ml', 'th', 'vi', 'tr', 'pl', 'cs', 'da',
  'fi', 'sv', 'nb', 'uk', 'ro', 'hu', 'bg', 'el', 'he', 'id', 'ms',
] as const;

export type Locale = (typeof LOCALE_CODES)[number];

export interface SupportedLocale {
  /** Locale code (BCP-47 style, e.g. 'en', 'pt-BR'). */
  code: Locale;
  /** Language name in its own script — what the selector shows. */
  nativeName: string;
}

/**
 * THE supported-languages registry — the ONLY source of truth for
 * the Admin User language selector. Every entry below resolves in
//  * the dictionaries map (core chrome translated; deeper strings
 * fall back to English when a locale has no fragment dictionary).
 */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
  { code: 'pt-PT', nativeName: 'Português (Portugal)' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'bn', nativeName: 'বাংলা' },
  { code: 'gu', nativeName: 'ગુજરાતી' },
  { code: 'fa', nativeName: 'فارسی' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'mr', nativeName: 'मराठी' },
  { code: 'ta', nativeName: 'தமிழ்' },
  { code: 'te', nativeName: 'తెలుగు' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', nativeName: 'മലയാളം' },
  { code: 'th', nativeName: 'ไทย' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'cs', nativeName: 'Čeština' },
  { code: 'da', nativeName: 'Dansk' },
  { code: 'fi', nativeName: 'Suomi' },
  { code: 'sv', nativeName: 'Svenska' },
  { code: 'nb', nativeName: 'Norsk bokmål' },
  { code: 'uk', nativeName: 'Українська' },
  { code: 'ro', nativeName: 'Română' },
  { code: 'hu', nativeName: 'Magyar' },
  { code: 'bg', nativeName: 'Български' },
  { code: 'el', nativeName: 'Ελληνικά' },
  { code: 'he', nativeName: 'עברית' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', nativeName: 'Bahasa Melayu' },
];

/** English is — and remains — the default language. */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Locales whose Platform Admin page dictionaries are COMPLETE
 * (core + platform fragments). The Platform Admin language
 * submenu offers exactly this list, so the Platform Admin UI
 * never claims a language it is not fully translated for.
 * Client roles (Admin User) always get the FULL SUPPORTED_LOCALES
 * list with honest English fallback for incomplete locales.
 * All 9 fully-supported locales (en, fr, de, es, it, pt-BR, pt-PT,
 * nl, ru) now pass .zscripts/validate-i18n.ts with zero missing
 * keys — including the platform-* fragment families.
 */
export const PLATFORM_COMPLETE_LOCALES: readonly Locale[] = [
  'en', 'fr', 'de', 'es', 'it', 'pt-BR', 'pt-PT', 'nl', 'ru',
];

/** Type-guard: is the given value a supported locale code? */
export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value);
}

/** Native display name for a locale code (falls back to the code). */
export function getLocaleNativeName(code: string): string {
  const entry = SUPPORTED_LOCALES.find((l) => l.code === code);
  return entry?.nativeName ?? code;
}

/**
 * The language list offered to Platform Admin / Owner users:
 * only the locales with complete Platform Admin translations.
 * Client roles get the full SUPPORTED_LOCALES registry.
 */
export function getPlatformLocales(): SupportedLocale[] {
  return SUPPORTED_LOCALES.filter((l) =>
    (PLATFORM_COMPLETE_LOCALES as readonly string[]).includes(l.code),
  );
}

// -------------------- RTL support --------------------

/**
 * Locales written right-to-left. Selecting one of these flips the
 * entire document direction (dir="rtl") so the layout mirrors for
 * Arabic / Persian / Hebrew. All other locales are LTR. This is the
 * SINGLE source of truth for document direction — applied whenever
 * the active locale changes (see setLocale + the init block below).
 */
const RTL_LOCALES: ReadonlySet<string> = new Set(['ar', 'fa', 'he']);

/** Is the given locale code a right-to-left language? */
export function isRTLLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

/** Apply both `lang` and `dir` to <html> for the active locale. */
function applyLocaleToDocument(locale: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTLLocale(locale) ? 'rtl' : 'ltr';
}

// -------------------- Store --------------------

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const STORAGE_KEY = 'cms_locale';

const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  }
  return DEFAULT_LOCALE;
};

export const useLocaleStore = create<I18nState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    // Ignore unsupported values — the registry is the source of truth.
    if (!isSupportedLocale(locale)) return;
    localStorage.setItem(STORAGE_KEY, locale);
    // Apply BOTH lang + dir so RTL languages (ar/fa/he) flip the layout
    // and LTR languages reset it — the whole dashboard mirrors with
    // the language, not just the text.
    applyLocaleToDocument(locale);
    set({ locale });
  },
}));

// Initialize from storage on client
if (typeof window !== 'undefined') {
  const initial = getInitialLocale();
  useLocaleStore.setState({ locale: initial });
  // Apply lang + dir on load so a stored RTL locale (ar/fa/he) mirrors
  // the layout immediately on first paint, not only after a switch.
  applyLocaleToDocument(initial);
}

// -------------------- Translation helpers --------------------

/** Resolve a key for a locale with the English fallback chain. */
function translate(locale: string, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en?.[key] ?? key;
}

/** 
 * Resolve a translation for an EXPLICIT locale (not the active one).
 * Exported for the rare call site that must render a string for a
 * just-switched locale before the next render — e.g. the language
 * confirmation toast, whose t() closure still holds the previous
 * locale at click time. Same English fallback chain as t().
 */
export function translateForLocale(locale: string, key: string): string {
  return translate(locale, key);
}

// -------------------- Hook --------------------

const I18nContext = createContext<{ locale: Locale; t: (key: string) => string } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  const t = useCallback(
    (key: string): string => translate(locale, key),
    [locale]
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): { locale: Locale; t: (key: string) => string } {
  const ctx = useContext(I18nContext);
  const storeLocale = useLocaleStore((s) => s.locale);

  const locale = ctx?.locale ?? storeLocale;

  const t = useCallback(
    (key: string): string => translate(locale, key),
    [locale]
  );

  if (ctx) return ctx;
  return { locale, t };
}
