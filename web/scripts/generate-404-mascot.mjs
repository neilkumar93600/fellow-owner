// Generates the 404 "lost fan" mascot with fal.ai (same approach as generate-creator-media.mjs).
// FAL_KEY comes from the environment or .env.fal.local (gitignored); it is never logged.
// Usage:
//   node web/scripts/generate-404-mascot.mjs gen <outDir> [tag]   -> 4 transparent PNG candidates + <outDir>/log.json
//   node web/scripts/generate-404-mascot.mjs export <candidate.png> -> web/public/creator/lost-fan.webp (900h)
// Needs `sharp` (resolved from web/, or from SHARP_FROM=<dir containing node_modules/sharp>).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const sharp = createRequire(join(process.env.SHARP_FROM ?? here, 'x.js'))('sharp');

const T2I = 'openai/gpt-image-2.5/flare/text-to-image';
export const PROMPT =
  'An original, cute, small fluffy creature character: a round, soft-bodied little fan with short stubby arms and legs and no horns, ' +
  'covered in soft pastel fur that blends from warm peach (#FFC9AE) on its head to periwinkle (#CFDAF5) on its body and mint (#A7FCCD) on its feet and belly patch. ' +
  'Big, friendly, glossy dark eyes, a tiny mouth, one eyebrow raised in a gently puzzled expression, head tilted. ' +
  'It stands upright and holds open a folded paper map with both hands, upside down, looking at it in confusion; the map shows only soft abstract shapes and dotted lines, no words. ' +
  'Premium 3D character render, soft studio lighting from the upper left, subtle soft fur detail, full body in frame, centred, a little headroom and footroom. ' +
  'Isolated on a fully transparent background, no floor, no shadow plate, no scenery. ' +
  'Original design not resembling any existing franchise, mascot or brand character: not Pixar, not Monsters Inc, not Sesame Street, not a Muppet, not a Furby, not a Pokemon. ' +
  'No text, no letters, no numbers, no logos, no watermark.';

async function fal(endpoint, input) {
  const headers = {
    Authorization: `Key ${process.env.FAL_KEY}`,
    'Content-Type': 'application/json',
  };
  const sub = await (
    await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    })
  ).json();
  if (!sub.request_id)
    throw new Error(`${endpoint} submit failed: ${JSON.stringify(sub).slice(0, 300)}`);
  for (;;) {
    await new Promise((r) => setTimeout(r, 4000));
    const st = await (await fetch(sub.status_url, { headers })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status !== 'IN_QUEUE' && st.status !== 'IN_PROGRESS')
      throw new Error(`${endpoint} status ${JSON.stringify(st).slice(0, 300)}`);
  }
  const res = await fetch(sub.response_url, { headers });
  const body = await res.json();
  if (!res.ok)
    throw new Error(`${endpoint} result ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return { id: sub.request_id, body };
}

async function gen(outDir, tag = 'a') {
  const envFile = join(root, '.env.fal.local');
  if (!process.env.FAL_KEY && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');
  mkdirSync(outDir, { recursive: true });
  const logFile = join(outDir, 'log.json');
  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : { calls: [] };
  const prompt = process.env.MASCOT_PROMPT ?? PROMPT;
  const input = {
    prompt,
    image_size: { width: 1024, height: 1536 },
    quality: 'high',
    background: 'transparent',
    num_images: 1,
    output_format: 'png',
  };
  // one request per candidate so each has its own request id
  const r = await Promise.allSettled(
    [1, 2, 3, 4].map(async (n) => {
      const { id, body } = await fal(T2I, input);
      const file = join(outDir, `${tag}${n}.png`);
      writeFileSync(file, Buffer.from(await (await fetch(body.images[0].url)).arrayBuffer()));
      log.calls.push({ file, endpoint: T2I, request_id: id, input });
      console.log('ok', file);
    }),
  );
  for (const x of r) if (x.status === 'rejected') console.error('FAIL', String(x.reason.message));
  writeFileSync(logFile, JSON.stringify(log, null, 2));
}

async function exportWebp(src) {
  const out = join(root, 'web/public/creator');
  // trim the empty transparent margin (keep 16px so faint fur tips are not clipped), then size by height
  const bg = { r: 0, g: 0, b: 0, alpha: 0 };
  const cut = await sharp(src).trim({ threshold: 1 }).toBuffer();
  const trimmed = await sharp(cut)
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: bg })
    .toBuffer();
  // next/image makes the smaller sizes from this one file.
  for (const [name, h] of [['lost-fan.webp', 900]]) {
    const o = await sharp(trimmed).resize({ height: h }).webp({ quality: 82 }).toBuffer();
    writeFileSync(join(out, name), o);
    const m = await sharp(o).metadata();
    console.log('ok', name, `${m.width}x${m.height}`, `alpha=${m.hasAlpha}`, o.length);
  }
}

const [what, a, b] = process.argv.slice(2);
if (what === 'gen') await gen(resolve(a), b);
else if (what === 'export') await exportWebp(resolve(a));
else console.error('usage: gen <outDir> [tag] | export <candidate.png>');
