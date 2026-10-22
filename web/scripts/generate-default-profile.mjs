// Generates the default avatar and banner every new account starts with, with fal.ai (same approach
// as generate-404-mascot.mjs). FAL_KEY comes from the environment or .env.fal.local (gitignored); it is
// never logged.
// Usage:
//   node web/scripts/generate-default-profile.mjs gen <outDir>                -> 2 candidates each + <outDir>/log.json
//   node web/scripts/generate-default-profile.mjs export <avatar.png> <banner.png>
//     -> web/public/default/avatar.jpg (512x512, JPEG so the share card's satori can read it)
//        web/public/default/banner.webp (2048x768)
// Needs `sharp` (resolved from web/, or from SHARP_FROM=<dir containing node_modules/sharp>).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const T2I = 'openai/gpt-image-2.5/flare/text-to-image';
const NO_TEXT = 'No text, no letters, no numbers, no logos, no watermark.';

export const IMAGES = {
  avatar: {
    image_size: { width: 1024, height: 1024 },
    prompt:
      'A friendly profile picture: the head and shoulders of an original, cute, round, fluffy little creature, ' +
      'soft pastel fur blending from warm peach (#FFC9AE) on top to periwinkle (#CFDAF5), big friendly glossy dark eyes, a small happy smile, looking straight at the camera. ' +
      'Premium 3D character render, soft studio light from the upper left, centred in the frame with even space around the head so a round crop keeps it whole. ' +
      'Plain soft background in a smooth gradient from pale sky blue (#BFDDF7) to lilac (#DCCFF7), no scenery. ' +
      'Original design not resembling any existing franchise, mascot or brand character: not Pixar, not Sesame Street, not a Muppet, not a Furby, not a Pokemon. ' +
      NO_TEXT,
  },
  banner: {
    image_size: { width: 2048, height: 768 },
    prompt:
      'A wide, soft, abstract panorama of layered rolling hills at golden hour. ' +
      'Palette: pale peach sky (#FFD9C2) with a low warm sun glow in the centre, lilac (#DCCFF7) and sky blue (#BFDDF7) hills receding into dreamy haze, sunset coral (#F0603A) and mint green (#CFEFE3) hills in the foreground. ' +
      'Smooth overlapping hill silhouettes with gentle gradients, atmospheric haze between layers. Fine film grain and risograph print texture, matte paper feel, premium and calm. ' +
      'The interest sits in the centre band so any crop from 2:1 to 3:1 works. No people, no buildings, no roads, no trees in detail. ' +
      NO_TEXT,
  },
};

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

async function gen(outDir) {
  const envFile = join(root, '.env.fal.local');
  if (!process.env.FAL_KEY && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');
  mkdirSync(outDir, { recursive: true });
  const logFile = join(outDir, 'log.json');
  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : { calls: [] };
  const jobs = Object.entries(IMAGES).flatMap(([name, spec]) =>
    [1, 2].map((n) => ({ file: join(outDir, `${name}${n}.png`), spec })),
  );
  // one request per candidate so each has its own request id
  const r = await Promise.allSettled(
    jobs.map(async ({ file, spec }) => {
      const input = { ...spec, quality: 'high', num_images: 1, output_format: 'png' };
      const { id, body } = await fal(T2I, input);
      writeFileSync(file, Buffer.from(await (await fetch(body.images[0].url)).arrayBuffer()));
      log.calls.push({ file, endpoint: T2I, request_id: id, input });
      console.log('ok', file);
    }),
  );
  for (const x of r) if (x.status === 'rejected') console.error('FAIL', String(x.reason.message));
  writeFileSync(logFile, JSON.stringify(log, null, 2));
}

async function exportImages(avatar, banner) {
  const sharp = createRequire(join(process.env.SHARP_FROM ?? here, 'x.js'))('sharp');
  const out = join(root, 'web/public/default');
  mkdirSync(out, { recursive: true });
  const files = [
    [
      'avatar.jpg',
      await sharp(avatar).resize(512, 512).jpeg({ quality: 84, mozjpeg: true }).toBuffer(),
    ],
    ['banner.webp', await sharp(banner).resize(2048, 768).webp({ quality: 80 }).toBuffer()],
  ];
  for (const [name, buffer] of files) {
    writeFileSync(join(out, name), buffer);
    const m = await sharp(buffer).metadata();
    console.log('ok', name, `${m.width}x${m.height}`, buffer.length);
  }
}

const [what, a, b] = process.argv.slice(2);
if (what === 'gen') await gen(resolve(a));
else if (what === 'export') await exportImages(resolve(a), resolve(b));
else console.error('usage: gen <outDir> | export <avatar.png> <banner.png>');
