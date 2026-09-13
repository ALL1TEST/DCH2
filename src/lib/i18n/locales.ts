// ============================================================
// i18n — DICTIONARY ASSEMBLY
// ============================================================
// Assembles every locale dictionary from its parts:
//
//   CORE dictionaries (src/lib/i18n/core/<locale>.ts)
//     → the shared application chrome (navigation, profile menu,
//       common actions, titles…). Provided for ALL 40 supported
//       locales. Incomplete cores fall back key-by-key.
//
//   FRAGMENT dictionaries (src/lib/i18n/fragments/<en|fr>/<area>.ts)
//     → deep page-level strings. Only provided for the
//       fully-translated locales (en + fr).
//
// Fallback chain in t(): dict[locale][key] ?? dict.en[key] ?? key
// — no runtime "missing key" error can ever surface; an
// incomplete locale simply renders the English string.
// ============================================================

import { coreEn } from './core/en';
import { coreFr } from './core/fr';
import { coreDe } from './core/de';
import { coreEs } from './core/es';
import { coreIt } from './core/it';
import { corePtBr } from './core/pt-br';
import { corePtPt } from './core/pt-pt';
import { coreNl } from './core/nl';
import { coreRu } from './core/ru';
import { coreJa } from './core/ja';
import { coreKo } from './core/ko';
import { coreZh } from './core/zh';
import { coreAr } from './core/ar';
import { coreHi } from './core/hi';
import { coreBn } from './core/bn';
import { coreGu } from './core/gu';
import { coreFa } from './core/fa';
import { corePa } from './core/pa';
import { coreMr } from './core/mr';
import { coreTa } from './core/ta';
import { coreTe } from './core/te';
import { coreKn } from './core/kn';
import { coreMl } from './core/ml';
import { coreTh } from './core/th';
import { coreVi } from './core/vi';
import { coreTr } from './core/tr';
import { corePl } from './core/pl';
import { coreCs } from './core/cs';
import { coreDa } from './core/da';
import { coreFi } from './core/fi';
import { coreSv } from './core/sv';
import { coreNb } from './core/nb';
import { coreUk } from './core/uk';
import { coreRo } from './core/ro';
import { coreHu } from './core/hu';
import { coreBg } from './core/bg';
import { coreEl } from './core/el';
import { coreHe } from './core/he';
import { coreId } from './core/id';
import { coreMs } from './core/ms';

// Fragments (deep page-level strings)
//   • en + fr  — curated/translated fragment families (below).
//   • 38 other locales — a MERGED per-locale client dictionary is
//     generated at fragments/<locale>/client.ts (machine-assisted
//     translation of the full client key set) and merged with the
//     core dictionary in the assembly below. The t() fallback chain
//     (dict[locale][key] ?? dict.en[key] ?? key) stays the final
//     safety net, so a locale with a missing/failed translation
//     simply renders the English string — never a raw key.
import { clientContentEn } from './fragments/en/client-content';
import { clientPeopleEn } from './fragments/en/client-people';
import { clientAccountEn } from './fragments/en/client-account';
import { clientAiEn } from './fragments/en/client-ai';
import { clientBackupsEn } from './fragments/en/client-backups';
import { clientEmailTemplatesEn } from './fragments/en/client-email-templates';
import { clientAnalyticsEn } from './fragments/en/client-analytics';
import { clientAuditEn } from './fragments/en/client-audit';
import { clientJobsEn } from './fragments/en/client-jobs';
import { clientTaxonomyEn } from './fragments/en/client-taxonomy';
import { clientSeoEn } from './fragments/en/client-seo';
import { clientTasksEn } from './fragments/en/client-tasks';
import { clientEditorEn } from './fragments/en/client-editor';
import { platformAEn } from './fragments/en/platform-a';
import { platformBEn } from './fragments/en/platform-b';
import { clientContentFr } from './fragments/fr/client-content';
import { clientPeopleFr } from './fragments/fr/client-people';
import { clientAccountFr } from './fragments/fr/client-account';
import { clientAiFr } from './fragments/fr/client-ai';
import { clientBackupsFr } from './fragments/fr/client-backups';
import { clientEmailTemplatesFr } from './fragments/fr/client-email-templates';
import { clientAnalyticsFr } from './fragments/fr/client-analytics';
import { clientAuditFr } from './fragments/fr/client-audit';
import { clientJobsFr } from './fragments/fr/client-jobs';
import { clientTaxonomyFr } from './fragments/fr/client-taxonomy';
import { clientSeoFr } from './fragments/fr/client-seo';
import { clientTasksFr } from './fragments/fr/client-tasks';
import { clientEditorFr } from './fragments/fr/client-editor';
import { platformAFr } from './fragments/fr/platform-a';
import { platformBFr } from './fragments/fr/platform-b';
// ---- Generated per-locale client dictionaries (machine-assisted
//      translations of the full client key set; see
//      .zscripts/translate-locales.ts + assemble-locales.ts) ----
import { clientDe } from './fragments/de/client';
import { clientEs } from './fragments/es/client';
import { clientIt } from './fragments/it/client';
import { clientPtBr } from './fragments/pt-br/client';
import { clientPtPt } from './fragments/pt-pt/client';
import { clientNl } from './fragments/nl/client';
import { clientRu } from './fragments/ru/client';
import { clientJa } from './fragments/ja/client';
import { clientKo } from './fragments/ko/client';
import { clientZh } from './fragments/zh/client';
import { clientAr } from './fragments/ar/client';
import { clientHi } from './fragments/hi/client';
import { clientBn } from './fragments/bn/client';
import { clientGu } from './fragments/gu/client';
import { clientFa } from './fragments/fa/client';
import { clientPa } from './fragments/pa/client';
import { clientMr } from './fragments/mr/client';
import { clientTa } from './fragments/ta/client';
import { clientTe } from './fragments/te/client';
import { clientKn } from './fragments/kn/client';
import { clientMl } from './fragments/ml/client';
import { clientTh } from './fragments/th/client';
import { clientVi } from './fragments/vi/client';
import { clientTr } from './fragments/tr/client';
import { clientPl } from './fragments/pl/client';
import { clientCs } from './fragments/cs/client';
import { clientDa } from './fragments/da/client';
import { clientFi } from './fragments/fi/client';
import { clientSv } from './fragments/sv/client';
import { clientNb } from './fragments/nb/client';
import { clientUk } from './fragments/uk/client';
import { clientRo } from './fragments/ro/client';
import { clientHu } from './fragments/hu/client';
import { clientBg } from './fragments/bg/client';
import { clientEl } from './fragments/el/client';
import { clientHe } from './fragments/he/client';
import { clientId } from './fragments/id/client';
import { clientMs } from './fragments/ms/client';


// ---- Fully-translated locales: core + every fragment ----

const en: Record<string, string> = {
  ...coreEn,
  ...clientContentEn,
  ...clientPeopleEn,
  ...clientAccountEn,
  ...clientAiEn,
  ...clientBackupsEn,
  ...clientEmailTemplatesEn,
  ...clientAnalyticsEn,
  ...clientAuditEn,
  ...clientJobsEn,
  ...clientTaxonomyEn,
  ...clientSeoEn,
  ...clientTasksEn,
  ...clientEditorEn,
  ...platformAEn,
  ...platformBEn,
};

const fr: Record<string, string> = {
  ...coreFr,
  ...clientContentFr,
  ...clientPeopleFr,
  ...clientAccountFr,
  ...clientAiFr,
  ...clientBackupsFr,
  ...clientEmailTemplatesFr,
  ...clientAnalyticsFr,
  ...clientAuditFr,
  ...clientJobsFr,
  ...clientTaxonomyFr,
  ...clientSeoFr,
  ...clientTasksFr,
  ...clientEditorFr,
  ...platformAFr,
  ...platformBFr,
};

// ---- Partially-translated locales: core chrome only; missing
//      keys (and any incomplete core key) fall back to `en`. ----

export const dictionaries: Record<string, Record<string, string>> = {
  en,
  fr,
  de: { ...coreDe, ...clientDe },
  es: { ...coreEs, ...clientEs },
  it: { ...coreIt, ...clientIt },
  'pt-BR': { ...corePtBr, ...clientPtBr },
  'pt-PT': { ...corePtPt, ...clientPtPt },
  nl: { ...coreNl, ...clientNl },
  ru: { ...coreRu, ...clientRu },
  ja: { ...coreJa, ...clientJa },
  ko: { ...coreKo, ...clientKo },
  zh: { ...coreZh, ...clientZh },
  ar: { ...coreAr, ...clientAr },
  hi: { ...coreHi, ...clientHi },
  bn: { ...coreBn, ...clientBn },
  gu: { ...coreGu, ...clientGu },
  fa: { ...coreFa, ...clientFa },
  pa: { ...corePa, ...clientPa },
  mr: { ...coreMr, ...clientMr },
  ta: { ...coreTa, ...clientTa },
  te: { ...coreTe, ...clientTe },
  kn: { ...coreKn, ...clientKn },
  ml: { ...coreMl, ...clientMl },
  th: { ...coreTh, ...clientTh },
  vi: { ...coreVi, ...clientVi },
  tr: { ...coreTr, ...clientTr },
  pl: { ...corePl, ...clientPl },
  cs: { ...coreCs, ...clientCs },
  da: { ...coreDa, ...clientDa },
  fi: { ...coreFi, ...clientFi },
  sv: { ...coreSv, ...clientSv },
  nb: { ...coreNb, ...clientNb },
  uk: { ...coreUk, ...clientUk },
  ro: { ...coreRo, ...clientRo },
  hu: { ...coreHu, ...clientHu },
  bg: { ...coreBg, ...clientBg },
  el: { ...coreEl, ...clientEl },
  he: { ...coreHe, ...clientHe },
  id: { ...coreId, ...clientId },
  ms: { ...coreMs, ...clientMs },
};
