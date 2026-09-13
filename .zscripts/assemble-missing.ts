// ============================================================
// i18n MISSING-KEY ASSEMBLER — merges .zscripts/i18n-progress2
// translations into the live dictionary wiring.
// ============================================================
// For each target locale:
//   • client-family keys  → merged into fragments/<locale>/client.ts
//     (the 7 machine locales) or fragments/fr/<family>.ts (French,
//     which keeps curated per-family files; client-tasks.ts is
//     created + wired in locales.ts if missing).
//   • core-family keys    → appended into core/<locale>.ts (the
//     existing core-file convention) with duplicate removal.
// Idempotent: safe to re-run; keys are merged, never duplicated.
// Run AFTER translate-missing.ts (or partially — assembles what
// exists; untranslated keys simply remain English fallbacks).
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

const PROJECT = '/home/z/my-project';
const PROGRESS_DIR = path.join(PROJECT, '.zscripts', 'i18n-progress2');

// -------------------- English sources (family ownership) --------------------

import { coreEn } from '../src/lib/i18n/core/en';
import { clientContentEn } from '../src/lib/i18n/fragments/en/client-content';
import { clientPeopleEn } from '../src/lib/i18n/fragments/en/client-people';
import { clientAccountEn } from '../src/lib/i18n/fragments/en/client-account';
import { clientAiEn } from '../src/lib/i18n/fragments/en/client-ai';
import { clientBackupsEn } from '../src/lib/i18n/fragments/en/client-backups';
import { clientEmailTemplatesEn } from '../src/lib/i18n/fragments/en/client-email-templates';
import { clientAnalyticsEn } from '../src/lib/i18n/fragments/en/client-analytics';
import { clientAuditEn } from '../src/lib/i18n/fragments/en/client-audit';
import { clientJobsEn } from '../src/lib/i18n/fragments/en/client-jobs';
import { clientTaxonomyEn } from '../src/lib/i18n/fragments/en/client-taxonomy';
import { clientSeoEn } from '../src/lib/i18n/fragments/en/client-seo';
import { clientTasksEn } from '../src/lib/i18n/fragments/en/client-tasks';
import { clientEditorEn } from '../src/lib/i18n/fragments/en/client-editor';
import { platformAEn } from '../src/lib/i18n/fragments/en/platform-a';
import { platformBEn } from '../src/lib/i18n/fragments/en/platform-b';

// -------------------- Locale registry --------------------

const fileCode = (code: string) => code.toLowerCase();
const pascal = (code: string) =>
  code
    .split('-')
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');

// The 7 machine locales use a single merged fragments/<locale>/client.ts.
const MERGED_CLIENT_LOCALES = ['de', 'es', 'it', 'pt-BR', 'pt-PT', 'nl', 'ru'];

// French keeps curated per-family files.
const FR_FAMILIES: { file: string; exportName: string; keys: string[] }[] = [
  { file: 'client-content', exportName: 'clientContentFr', keys: Object.keys(clientContentEn) },
  { file: 'client-people', exportName: 'clientPeopleFr', keys: Object.keys(clientPeopleEn) },
  { file: 'client-account', exportName: 'clientAccountFr', keys: Object.keys(clientAccountEn) },
  { file: 'client-ai', exportName: 'clientAiFr', keys: Object.keys(clientAiEn) },
  { file: 'client-backups', exportName: 'clientBackupsFr', keys: Object.keys(clientBackupsEn) },
  { file: 'client-email-templates', exportName: 'clientEmailTemplatesFr', keys: Object.keys(clientEmailTemplatesEn) },
  { file: 'client-analytics', exportName: 'clientAnalyticsFr', keys: Object.keys(clientAnalyticsEn) },
  { file: 'client-audit', exportName: 'clientAuditFr', keys: Object.keys(clientAuditEn) },
  { file: 'client-jobs', exportName: 'clientJobsFr', keys: Object.keys(clientJobsEn) },
  { file: 'client-taxonomy', exportName: 'clientTaxonomyFr', keys: Object.keys(clientTaxonomyEn) },
  { file: 'client-seo', exportName: 'clientSeoFr', keys: Object.keys(clientSeoEn) },
  { file: 'client-tasks', exportName: 'clientTasksFr', keys: Object.keys(clientTasksEn) },
  { file: 'client-editor', exportName: 'clientEditorFr', keys: Object.keys(clientEditorEn) },
  { file: 'platform-a', exportName: 'platformAFr', keys: Object.keys(platformAEn) },
  { file: 'platform-b', exportName: 'platformBFr', keys: Object.keys(platformBEn) },
];

// -------------------- progress loading --------------------

function loadProgress(fc: string): Record<string, string> {
  const merged: Record<string, string> = {};
  let i = 0;
  for (;;) {
    const p = path.join(PROGRESS_DIR, `${fc}.batch${i}.json`);
    if (!fs.existsSync(p)) break;
    Object.assign(merged, JSON.parse(fs.readFileSync(p, 'utf8')));
    i++;
  }
  return merged;
}

// -------------------- TS file emission --------------------

function emitDict(exportName: string, entries: [string, string][], comment: string): string {
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  return `// ============================================================\n${comment}\n// ============================================================\n\nexport const ${exportName}: Record<string, string> = {\n${lines.join('\n')}\n};\n`;
}

function patchCoreFile(fc: string, newEntries: [string, string][]): void {
  const corePath = path.join(PROJECT, 'src/lib/i18n/core', `${fc}.ts`);
  let content = fs.readFileSync(corePath, 'utf8');
  for (const [k] of newEntries) {
    // Remove a (possibly empty) existing definition to avoid dup keys.
    const re = new RegExp(`^\\s*${JSON.stringify(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*.*$\\n?`, 'm');
    content = content.replace(re, '');
  }
  const lastBrace = content.lastIndexOf('};');
  if (lastBrace === -1) throw new Error(`core/${fc}.ts has no closing brace`);
  const insert =
    '\n  // ---- Keys filled by the missing-key assembler (were previously\n' +
    '  //      English fallbacks; see .zscripts/translate-missing.ts) ----\n' +
    newEntries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') +
    '\n';
  fs.writeFileSync(corePath, content.slice(0, lastBrace) + insert + content.slice(lastBrace));
}

// -------------------- existing dictionary loading --------------------

async function loadExistingClient(fc: string): Promise<Record<string, string>> {
  const mod = (await import(`../src/lib/i18n/fragments/${fc}/client`)) as Record<
    string,
    Record<string, string>
  >;
  const exportName = 'client' + pascal(fc);
  return mod[exportName] ?? {};
}

async function loadExistingFrFamily(file: string): Promise<Record<string, string>> {
  try {
    const mod = (await import(`../src/lib/i18n/fragments/fr/${file}`)) as Record<
      string,
      Record<string, string>
    >;
    return Object.values(mod)[0] ?? {};
  } catch {
    return {};
  }
}

// -------------------- main --------------------

async function main() {
  const coreKeySet = new Set(Object.keys(coreEn));

  // ---------- 1. The 7 machine locales ----------
  for (const code of MERGED_CLIENT_LOCALES) {
    const fc = fileCode(code);
    const translated = loadProgress(fc);
    if (Object.keys(translated).length === 0) {
      console.log(`${code}: no progress yet — skipped`);
      continue;
    }

    // Split new keys: client-family vs core-family.
    const newClient: [string, string][] = [];
    const newCore: [string, string][] = [];
    for (const [k, v] of Object.entries(translated)) {
      if (coreKeySet.has(k)) newCore.push([k, v]);
      else newClient.push([k, v]);
    }

    // Regenerate fragments/<fc>/client.ts = existing + new, in en order.
    const existing = await loadExistingClient(fc);
    const merged: Record<string, string> = { ...existing };
    for (const [k, v] of newClient) merged[k] = v;
    // Stable order: English dictionary order, then any stragglers.
    const enOrder = [
      ...Object.keys(clientContentEn), ...Object.keys(clientPeopleEn), ...Object.keys(clientAccountEn),
      ...Object.keys(clientAiEn), ...Object.keys(clientBackupsEn), ...Object.keys(clientEmailTemplatesEn),
      ...Object.keys(clientAnalyticsEn), ...Object.keys(clientAuditEn), ...Object.keys(clientJobsEn),
      ...Object.keys(clientTaxonomyEn), ...Object.keys(clientSeoEn), ...Object.keys(clientTasksEn),
      ...Object.keys(clientEditorEn),
      ...Object.keys(platformAEn), ...Object.keys(platformBEn),
    ];
    const entries: [string, string][] = [];
    const seen = new Set<string>();
    for (const k of enOrder) {
      if (k in merged) {
        entries.push([k, merged[k]]);
        seen.add(k);
      }
    }
    for (const k of Object.keys(merged)) {
      if (!seen.has(k)) entries.push([k, merged[k]]);
    }

    const fragDir = path.join(PROJECT, 'src/lib/i18n/fragments', fc);
    fs.mkdirSync(fragDir, { recursive: true });
    const exportName = 'client' + pascal(fc);
    fs.writeFileSync(
      path.join(fragDir, 'client.ts'),
      emitDict(
        exportName,
        entries,
        `// i18n — CLIENT dictionary: ${code}\n// Machine-assisted translation of the full client fragment key set\n// (14 families merged) generated from fragments/en/* via\n// .zscripts/translate-missing.ts. Keys that failed translation are\n// omitted on purpose — t() falls back to the English value per key.\n// FOR MANUAL EDITS: edit fragments/en/* (source of truth) or this\n// file directly — both are plain dictionaries.`,
      ),
    );

    // Core-family keys → core file.
    if (newCore.length > 0) patchCoreFile(fc, newCore);
    console.log(`${code}: client ${entries.length} keys (was ${Object.keys(existing).length}), core +${newCore.length}`);
  }

  // ---------- 2. French (curated per-family files) ----------
  {
    const frT = loadProgress('fr');
    if (Object.keys(frT).length === 0) {
      console.log('fr: no progress yet — skipped');
    } else {
      const newCore: [string, string][] = [];
      for (const [k, v] of Object.entries(frT)) {
        if (coreKeySet.has(k)) newCore.push([k, v]);
      }
      let createdTasksFile = false;
      for (const fam of FR_FAMILIES) {
        const famNew: Record<string, string> = {};
        for (const k of fam.keys) {
          if (k in frT) famNew[k] = frT[k];
        }
        if (Object.keys(famNew).length === 0) continue;
        const existing = await loadExistingFrFamily(fam.file);
        const merged = { ...existing, ...famNew };
        const entries = fam.keys
          .filter((k) => k in merged)
          .map((k) => [k, merged[k]] as [string, string]);
        fs.writeFileSync(
          path.join(PROJECT, 'src/lib/i18n/fragments/fr', `${fam.file}.ts`),
          emitDict(
            fam.exportName,
            entries,
            `// i18n — FRAGMENT: ${fam.file} (French — Français)\n// Machine-assisted translation of fragments/en/${fam.file}.ts\n// (.zscripts/translate-missing.ts). Keys that failed translation\n// are omitted — t() falls back to the English value per key.`,
          ),
        );
        if (fam.file === 'client-tasks') createdTasksFile = true;
        console.log(`fr/${fam.file}: ${entries.length} keys (was ${Object.keys(existing).length})`);
      }

      // Wire newly created fr fragment files (client-tasks, client-editor)
      // into locales.ts.
      {
        const localesPath = path.join(PROJECT, 'src/lib/i18n/locales.ts');
        let content = fs.readFileSync(localesPath, 'utf8');
        let changed = false;
        const importAnchor = "import { clientSeoFr } from './fragments/fr/client-seo';";
        const tasksImport = "import { clientTasksFr } from './fragments/fr/client-tasks';";
        if (content.includes(importAnchor) && !content.includes(tasksImport)) {
          content = content.replace(importAnchor, importAnchor + '\n' + tasksImport);
          changed = true;
        }
        const editorImport = "import { clientEditorFr } from './fragments/fr/client-editor';";
        if (content.includes(tasksImport) && !content.includes(editorImport)) {
          content = content.replace(tasksImport, tasksImport + '\n' + editorImport);
          changed = true;
        }
        const mergeAnchor = '  ...clientSeoFr,';
        if (content.includes(mergeAnchor) && !content.includes('  ...clientTasksFr,')) {
          content = content.replace(mergeAnchor, mergeAnchor + '\n  ...clientTasksFr,');
          changed = true;
        }
        if (content.includes('  ...clientTasksFr,') && !content.includes('  ...clientEditorFr,')) {
          content = content.replace('  ...clientTasksFr,', '  ...clientTasksFr,\n  ...clientEditorFr,');
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(localesPath, content);
          console.log('fr new fragment imports wired into locales.ts');
        }
      }

      if (newCore.length > 0) patchCoreFile('fr', newCore);
      console.log(`fr: core +${newCore.length}`);
    }
  }

  console.log('\nASSEMBLY DONE — run validate-i18n.ts to verify parity.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
