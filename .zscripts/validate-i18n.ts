// ============================================================
// i18n VALIDATOR — locale parity check against the English
// canonical schema.
// ============================================================
// Compares EVERY supported locale dictionary against the English
// dictionary (the canonical translation schema) and reports:
//   • missing keys  (present in en, absent in the locale)
//   • extra keys    (present in the locale, absent in en)
//   • empty values  (translated to an empty/whitespace string)
//   • identical-to-EN counts (informational — many are legitimate:
//     brand names, "Dashboard", "SEO", …)
//
// The 9 fully-supported locales (en, fr, de, es, it, pt-BR, pt-PT,
// nl, ru) must have ZERO missing keys — the script exits non-zero
// if any of them is incomplete, so it can gate development.
// The remaining locales are reported as informational only (they
// intentionally rely on the English per-key fallback).
//
// Usage: bun run .zscripts/validate-i18n.ts   (or `bun run i18n:validate`)
// ============================================================

import { dictionaries } from '../src/lib/i18n/locales';
import { LOCALE_CODES, PLATFORM_COMPLETE_LOCALES } from '../src/lib/i18n';

// Locales that must be COMPLETE (no missing keys).
const REQUIRED_LOCALES = ['en', 'fr', 'de', 'es', 'it', 'pt-BR', 'pt-PT', 'nl', 'ru'] as const;

interface Report {
  locale: string;
  total: number;
  missing: string[];
  extra: string[];
  empty: string[];
  identicalToEn: number;
}

function validateLocale(locale: string): Report {
  const enDict = dictionaries.en ?? {};
  const dict = dictionaries[locale] ?? {};
  const enKeys = Object.keys(enDict);

  const missing = enKeys.filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in enDict));
  const empty = Object.keys(dict).filter(
    (k) => typeof dict[k] === 'string' && dict[k].trim().length === 0,
  );
  const identicalToEn = Object.keys(dict).filter(
    (k) => k in enDict && dict[k] === enDict[k],
  ).length;

  return {
    locale,
    total: Object.keys(dict).length,
    missing,
    extra,
    empty,
    identicalToEn,
  };
}

function main() {
  const enTotal = Object.keys(dictionaries.en ?? {}).length;
  console.log(`English (canonical): ${enTotal} keys\n`);
  console.log('Locale   | keys  | missing | extra | empty | =EN (info)');
  console.log('---------|-------|---------|-------|-------|-----------');

  const reports: Report[] = [];
  for (const locale of LOCALE_CODES) {
    reports.push(validateLocale(locale));
  }

  let failures = 0;
  for (const r of reports) {
    const required = (REQUIRED_LOCALES as readonly string[]).includes(r.locale);
    const status =
      r.missing.length === 0 && r.extra.length === 0 && r.empty.length === 0
        ? 'OK'
        : required
          ? 'FAIL'
          : 'PARTIAL';
    if (status === 'FAIL') failures++;
    console.log(
      `${r.locale.padEnd(8)} | ${String(r.total).padStart(5)} | ${String(r.missing.length).padStart(7)} | ${String(r.extra.length).padStart(5)} | ${String(r.empty.length).padStart(5)} | ${String(r.identicalToEn).padStart(4)}  ${status === 'OK' ? '' : status}`,
    );
  }

  // Detail for required locales with problems (max 10 samples each).
  for (const r of reports) {
    const required = (REQUIRED_LOCALES as readonly string[]).includes(r.locale);
    if (!required) continue;
    if (r.missing.length > 0) {
      console.log(`\n[${r.locale}] MISSING (${r.missing.length}):`);
      console.log('  ' + r.missing.slice(0, 10).join(', ') + (r.missing.length > 10 ? ', …' : ''));
    }
    if (r.extra.length > 0) {
      console.log(`\n[${r.locale}] EXTRA (${r.extra.length}):`);
      console.log('  ' + r.extra.slice(0, 10).join(', ') + (r.extra.length > 10 ? ', …' : ''));
    }
    if (r.empty.length > 0) {
      console.log(`\n[${r.locale}] EMPTY VALUES (${r.empty.length}):`);
      console.log('  ' + r.empty.slice(0, 10).join(', ') + (r.empty.length > 10 ? ', …' : ''));
    }
  }

  // Cross-check: the registry the selector reads must expose all 9.
  const registryOk = (REQUIRED_LOCALES as readonly string[]).every((l) =>
    (LOCALE_CODES as readonly string[]).includes(l),
  );
  if (!registryOk) {
    console.log('\nFAIL: a required locale is missing from LOCALE_CODES');
    failures++;
  }

  // Platform-complete registry sanity (informational).
  console.log(`\nPlatform-complete locales: ${PLATFORM_COMPLETE_LOCALES.join(', ')}`);

  if (failures > 0) {
    console.log(`\n✗ VALIDATION FAILED for ${failures} required locale(s)`);
    process.exit(1);
  } else {
    console.log('\n✓ All 9 required locales are complete (no missing/extra/empty keys).');
  }
}

main();
