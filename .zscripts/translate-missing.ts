// ============================================================
// i18n MISSING-KEY TRANSLATOR — fills the gap between each
// target locale dictionary and the CURRENT English dictionary.
// ============================================================
// The original translate-locales.ts run predates several fragment
// families (client-tasks, platform-a/b additions, later core keys),
// and its progress files mark those batches "done", so re-running
// it never fills the new keys. This script instead computes the
// missing keys LIVE from src/lib/i18n/locales (the same assembly
// the app uses) and translates ONLY those, into a fresh progress
// directory (.zscripts/i18n-progress2) — fully resumable.
//
// Quality: same professional software-localizer prompt as the
// original pipeline (natural UI terminology per language, brand
// and technical tokens kept as-is).
// ============================================================

import ZAI from 'z-ai-web-dev-sdk';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT = '/home/z/my-project';
const PROGRESS_DIR = path.join(PROJECT, '.zscripts', 'i18n-progress2');
fs.mkdirSync(PROGRESS_DIR, { recursive: true });

// -------------------- Target locales --------------------

const LOCALES: { code: string; name: string }[] = [
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt-BR', name: 'Brazilian Portuguese' },
  { code: 'pt-PT', name: 'European Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
];

// -------------------- Live dictionaries --------------------

import { dictionaries } from '../src/lib/i18n/locales';

const enDict: Record<string, string> = dictionaries.en;

// -------------------- Config --------------------

const BATCH_SIZE = 120;
const CONCURRENCY = 2;
const REQUEST_TIMEOUT_MS = 180_000;
const MIN_REQUEST_GAP_MS = 1_500;
const RATE_COOLDOWN_MS = 60_000;

// -------------------- Pacing / cooldown --------------------

let nextAllowedRequestAt = 0;
let lastRequestStart = 0;

async function requestGate(): Promise<void> {
  for (;;) {
    const now = Date.now();
    const waitUntil = Math.max(nextAllowedRequestAt, lastRequestStart + MIN_REQUEST_GAP_MS);
    if (now >= waitUntil) {
      lastRequestStart = now;
      return;
    }
    await new Promise((r) => setTimeout(r, Math.min(waitUntil - now, 5_000)));
  }
}

function triggerCooldown(): void {
  nextAllowedRequestAt = Date.now() + RATE_COOLDOWN_MS;
}

// -------------------- Helpers --------------------

const fileCode = (code: string) => code.toLowerCase();

interface Task {
  locale: string;
  name: string;
  batchIndex: number;
  keys: string[];
}

function progressPath(t: Task) {
  return path.join(PROGRESS_DIR, `${fileCode(t.locale)}.batch${t.batchIndex}.json`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// -------------------- LLM call --------------------

let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

/** Lenient `"key": "value"` salvage for truncated JSON outputs. */
function lenientParse(text: string, validKeys: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /"((?:[^"\\\n]|\\.)+)"\s*:\s*"((?:[^"\\\n]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const k = m[1];
    if (validKeys.has(k)) {
      try {
        out[k] = JSON.parse('"' + m[2] + '"');
      } catch {
        // Skip malformed escape sequence.
      }
    }
  }
  return out;
}

async function translateBatch(
  languageName: string,
  pairs: Record<string, string>,
): Promise<Record<string, string> | null> {
  if (!zai) zai = await ZAI.create();

  const system = `You are a professional software localizer for a CMS admin dashboard UI. You will receive a JSON object mapping translation keys to English UI strings (labels, buttons, page titles, table headers, form descriptions, toast messages, empty states). Translate EVERY value into ${languageName}.

STRICT RULES:
- Return ONLY a valid JSON object with the EXACT SAME KEYS — no markdown, no code fences, no commentary.
- Use natural, idiomatic UI terminology for ${languageName} — the way professional localized software reads, not word-for-word translation.
- Keep translations concise and natural for UI (buttons short, descriptions clear).
- Preserve the casing style (Title Case stays Title Case where the language uses it), trailing ellipsis (… or ...), punctuation and placeholder tokens.
- Keep brand/technical names as-is: SEO, AI, API, SMTP, SFTP, URL, CSV, JSON, HTML, DNS, XML, RSS, Stripe, OpenAI, Anthropic, Gemini, OpenRouter, Ollama, WordPress, cron.
- Do NOT merge, split, add or drop keys.`;

  const user = `Translate every value to ${languageName} and return ONLY the JSON object:\n${JSON.stringify(
    pairs,
    null,
    0,
  )}`;

  await requestGate();

  const callPromise = zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: 'disabled' },
  });

  let timedOut = false;
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, REQUEST_TIMEOUT_MS);
  });
  let completion: Awaited<typeof callPromise> | null = null;
  try {
    completion = (await Promise.race([callPromise, timeout])) as typeof completion;
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('429')) triggerCooldown();
    console.error('LLM call failed:', msg.slice(0, 100));
    return null;
  }
  if (completion === null) {
    if (timedOut) console.error('LLM call timed out after', REQUEST_TIMEOUT_MS / 1000, 's');
    return null;
  }

  try {
    let text = completion.choices[0]?.message?.content ?? '';
    if (!text.trim()) return null;
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    // 1) Strict parse.
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && v.trim().length > 0 && k in pairs) out[k] = v;
        }
        if (Object.keys(out).length > 0) return out;
      }
    } catch {
      // Fall through to lenient parse.
    }
    // 2) Lenient parse — salvage complete pairs from truncated output.
    const salvaged = lenientParse(text, new Set(Object.keys(pairs)));
    return Object.keys(salvaged).length > 0 ? salvaged : null;
  } catch (err) {
    console.error('response handling failed:', (err as Error).message?.slice(0, 100));
    return null;
  }
}

// -------------------- Task runner --------------------

async function runTask(t: Task): Promise<void> {
  const pp = progressPath(t);
  if (fs.existsSync(pp)) return; // already done (resume support)

  const allPairs: Record<string, string> = {};
  for (const k of t.keys) {
    const value = enDict[k];
    if (value !== undefined) allPairs[k] = value;
  }
  if (Object.keys(allPairs).length === 0) {
    fs.writeFileSync(pp, JSON.stringify({}));
    return;
  }

  const translated: Record<string, string> = {};
  let remaining: Record<string, string> = { ...allPairs };
  let noProgressStreak = 0;
  let backoffMs = 12_000;

  while (Object.keys(remaining).length > 0 && noProgressStreak < 6) {
    const remainingCount = Object.keys(remaining).length;
    const attempt = await translateBatch(t.name, remaining);

    if (attempt === null || Object.keys(attempt).length === 0) {
      noProgressStreak++;
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = Math.min(backoffMs * 1.5, 90_000);
      continue;
    }

    const recovered = Object.keys(attempt).length;
    for (const [k, v] of Object.entries(attempt)) {
      translated[k] = v;
      delete remaining[k];
    }
    if (recovered >= remainingCount * 0.25) {
      noProgressStreak = 0;
      backoffMs = 12_000;
    } else {
      noProgressStreak++;
      await new Promise((r) => setTimeout(r, 3_000));
    }
    console.log(
      `[${t.locale}] batch ${t.batchIndex}: +${recovered} (${Object.keys(translated).length}/${Object.keys(allPairs).length})`,
    );
  }

  const missing = Object.keys(remaining);
  fs.writeFileSync(pp, JSON.stringify(translated));
  console.log(
    `[${t.locale}] batch ${t.batchIndex} DONE: ${Object.keys(translated).length}/${t.keys.length}${
      missing.length ? ` (missing ${missing.length})` : ''
    }`,
  );
}

// -------------------- Main --------------------

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

async function main() {
  const tasks: Task[] = [];

  for (const { code, name } of LOCALES) {
    const dict = dictionaries[code] || {};
    const missing = Object.keys(enDict).filter((k) => !(k in dict));
    // Stable order: same family grouping as the English dictionary.
    const ordered = Object.keys(enDict).filter((k) => missing.includes(k));
    const batches = chunk(ordered, BATCH_SIZE);
    batches.forEach((keys, i) => tasks.push({ locale: code, name, batchIndex: i, keys }));
    console.log(`${code}: ${ordered.length} missing keys (${batches.length} batches)`);
  }

  const pending = tasks.filter((t) => !fs.existsSync(progressPath(t)));
  console.log(`TOTAL tasks: ${tasks.length}, pending: ${pending.length}, concurrency: ${CONCURRENCY}`);

  let idx = 0;
  const started = Date.now();
  async function worker(id: number) {
    for (;;) {
      const my = idx++;
      if (my >= pending.length) break;
      const t = pending[my];
      try {
        await runTask(t);
      } catch (err) {
        console.error(`worker ${id} task failed:`, (err as Error).message);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const allDone = tasks.every((t) => fs.existsSync(progressPath(t)));
  if (allDone) {
    console.log('ALL BATCHES DONE in', ((Date.now() - started) / 60000).toFixed(1), 'min');
    fs.writeFileSync(path.join(PROGRESS_DIR, 'ALL_DONE'), String(Date.now()));
  } else {
    console.log('RUN ENDED (restart needed)');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
