// Generates the demo creator imagery (Mira Lane, fictional) with fal.ai into web/public/creator/.
// FAL_KEY comes from the environment or .env.fal.local (gitignored); it is never logged.
// Resumable: existing files are skipped. Usage: node web/scripts/generate-creator-media.mjs [images|clip]
// Needs `sharp` (resolved from web/, or from SHARP_FROM=<dir containing node_modules/sharp>).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = join(root, 'web/public/creator');
const logFile = join(here, 'creator-media.log.json');
const envFile = join(root, '.env.fal.local');
if (!process.env.FAL_KEY && existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');
const sharp = createRequire(join(process.env.SHARP_FROM ?? here, 'x.js'))('sharp');
mkdirSync(out, { recursive: true });

const T2I = 'openai/gpt-image-2.5/flare/text-to-image';
const EDIT = 'openai/gpt-image-2.5/flare/edit';
const I2V = 'bytedance/seedance-2.5/image-to-video';

const STYLE =
  'realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks';
const MIRA =
  'a fictional American woman in her late 20s, shoulder-length wavy dark-brown hair, light olive skin, small gold hoop earrings, linen shirt';

const SIZE = {
  portrait: { width: 1024, height: 1280 },
  wide: { width: 1536, height: 960 },
  face: { width: 1024, height: 1024 },
};
// final webp sizes, from web/lib/creator-assets.ts
const FINAL = { portrait: [1200, 1500], wide: [1600, 1000], face: [256, 256] };

/** name, shape, quality, refMira, prompt */
const JOBS = [
  [
    'mira-portrait',
    'portrait',
    'high',
    false,
    `Close portrait of ${MIRA}, relaxed warm smile looking just past the camera, golden-hour sun on one side, softly blurred sunlit terracotta street behind her.`,
  ],
  [
    'mira-portrait-alt',
    'portrait',
    'high',
    true,
    'The same woman, different framing: laughing, turned three-quarters, sitting on a sunny stone step with a small canvas backpack beside her, soft warm light.',
  ],
  [
    'vlog-lisbon',
    'wide',
    'medium',
    true,
    'The same woman walking down a steep cobbled Lisbon street at golden hour, pastel tiled buildings, a yellow tram in the distance, seen from a few metres away, hands relaxed, camera at chest height.',
  ],
  [
    'vlog-night-market',
    'wide',
    'medium',
    false,
    'A lively evening street food night market, warm string lights, steaming stalls, blurred crowd, no faces in focus, vivid but natural colours.',
  ],
  [
    'vlog-van-coast',
    'wide',
    'medium',
    true,
    'The same woman sitting on the open sliding door of a small camper van parked on a cliff above the Pacific coast at sunset, holding a mug, wide landscape shot.',
  ],
  [
    'vlog-cafe',
    'wide',
    'medium',
    true,
    'The same woman working on a laptop at a sunlit corner cafe table with a flat white and a croissant, plants in the window, relaxed and focused.',
  ],
  [
    'vlog-mountain',
    'wide',
    'medium',
    false,
    'Mountain sunrise from a rocky viewpoint, soft pink and gold clouds over layered ridges, a lone hiker silhouette far away, calm and wide.',
  ],
  [
    'vlog-hostel',
    'wide',
    'medium',
    false,
    'Five young travellers of mixed backgrounds laughing around a long wooden table in a bright hostel common room, shared dinner, backpacks on the floor, candid, faces not in sharp focus.',
  ],
  [
    'cover-budget-travel',
    'wide',
    'medium',
    false,
    'Flat lay on a wooden table: passport, a worn paper map, loose coins, a boarding pass with no text, a small notebook and a coffee, warm morning light. No people.',
  ],
  [
    'cover-solo-travelers',
    'wide',
    'medium',
    false,
    'A single traveller seen from behind with a backpack on a quiet pier at golden hour, calm water, small figure in a wide frame. Face not visible.',
  ],
  [
    'cover-travel-photography',
    'wide',
    'medium',
    false,
    'A mirrorless camera resting on a stone wall overlooking a golden-hour old town skyline, lens catching soft light. No people.',
  ],
  [
    'cover-food-finds',
    'wide',
    'medium',
    false,
    'A small family-run restaurant table with colourful shared dishes, grilled fish, salad and bread, warm tungsten light, hands reaching in, no faces.',
  ],
  [
    'cover-road-trips',
    'wide',
    'medium',
    false,
    'A vintage camper van on an empty coastal highway at sunset, long shadows, wildflowers on the verge. No people.',
  ],
  [
    'cover-slow-living',
    'wide',
    'medium',
    false,
    'A sunlit window nook with a linen blanket, a ceramic cup of tea, an open paperback and a plant, soft morning haze. No people.',
  ],
  [
    'fan-1',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional Black woman in her 30s, short natural hair, warm smile, neutral warm beige backdrop.',
  ],
  [
    'fan-2',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional South Asian woman in her late 20s, long dark hair, friendly expression, neutral warm backdrop.',
  ],
  [
    'fan-3',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional white man in his 40s, short beard and glasses, easy smile, neutral warm backdrop.',
  ],
  [
    'fan-4',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional Latina woman in her early 20s, curly hair, bright laugh, neutral warm backdrop.',
  ],
  [
    'fan-5',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional East Asian man in his late 20s, casual jacket, relaxed smile, neutral warm backdrop.',
  ],
  [
    'fan-6',
    'face',
    'medium',
    false,
    'Head-and-shoulders portrait of a fictional older woman in her 60s, silver bob, kind expression, neutral warm backdrop.',
  ],
  [
    'auth-art',
    'portrait',
    'medium',
    true,
    'The same woman from behind and slightly to the side, looking out over a sunlit terrace at rooftops and the sea, a soft breeze in her hair, calm and open composition with space above.',
  ],
];

const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : { calls: [] };
const save = () => writeFileSync(logFile, JSON.stringify(log, null, 2));

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

async function toWebp(buf, shape, file) {
  const [w, h] = FINAL[shape];
  const img = sharp(buf).resize(w, h, { fit: 'cover' });
  for (const q of [82, 74, 66, 58, 50, 42]) {
    const o = await img.clone().webp({ quality: q }).toBuffer();
    if (o.length <= 250 * 1024 || q === 42) {
      writeFileSync(file, o);
      return o.length;
    }
  }
}

async function images() {
  let portraitUrl = log.portraitUrl;
  const doJob = async ([name, shape, quality, ref, prompt]) => {
    const file = join(out, `${name}.webp`);
    if (existsSync(file)) return;
    const full = `${prompt} ${STYLE}`;
    const input = {
      prompt: full,
      image_size: SIZE[shape],
      quality,
      num_images: 1,
      output_format: 'png',
    };
    let endpoint = T2I;
    if (ref) {
      if (!portraitUrl) throw new Error('portrait URL unknown, generate mira-portrait first');
      endpoint = EDIT;
      input.image_urls = [portraitUrl];
      input.prompt = `Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). ${full}`;
    }
    const { id, body } = await fal(endpoint, input);
    const url = body.images[0].url;
    if (name === 'mira-portrait') {
      portraitUrl = url;
      log.portraitUrl = url;
    }
    if (name === 'vlog-lisbon') log.lisbonUrl = url;
    const bytes = await toWebp(Buffer.from(await (await fetch(url)).arrayBuffer()), shape, file);
    log.calls.push({
      name,
      endpoint,
      quality,
      size: SIZE[shape],
      request_id: id,
      prompt: input.prompt,
      bytes,
    });
    save();
    console.log('ok', name, bytes);
  };
  // portrait first (the reference), then the rest 4 at a time
  await doJob(JOBS[0]);
  const rest = JOBS.slice(1);
  for (let i = 0; i < rest.length; i += 4) {
    const r = await Promise.allSettled(rest.slice(i, i + 4).map(doJob));
    for (const [k, x] of r.entries()) {
      if (x.status === 'rejected') {
        console.error('FAIL', rest[i + k][0], String(x.reason.message).slice(0, 300));
      }
    }
  }
}

async function clip() {
  const file = join(out, 'one-week.mp4');
  if (existsSync(file)) return;
  // Seedance rejects frames with realistic faces (content_policy_violation), so animate a person-free Lisbon street frame.
  if (!log.clipSrcUrl) {
    const r = await fal(T2I, {
      prompt: `Steep cobbled Lisbon street at golden hour, pastel tiled buildings, a yellow tram far down the street, empty of people, seen from walking height. ${STYLE}`,
      image_size: SIZE.wide,
      quality: 'medium',
      num_images: 1,
      output_format: 'png',
    });
    log.clipSrcUrl = r.body.images[0].url;
    log.calls.push({ name: 'clip-source', endpoint: T2I, request_id: r.id });
    save();
  }
  const prompt =
    'Slow handheld walk forward through a Lisbon street at golden hour, pastel buildings, gentle natural camera sway, warm light, calm ambience.';
  const input = {
    image_url: log.clipSrcUrl,
    prompt,
    duration: '8',
    resolution: '720p',
    generate_audio: false,
  };
  const { id, body } = await fal(I2V, input);
  const raw = join(out, '_clip-raw.mp4');
  writeFileSync(raw, Buffer.from(await (await fetch(body.video.url)).arrayBuffer()));
  // muted, web-friendly, <= 4 MB
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      raw,
      '-an',
      '-c:v',
      'libx264',
      '-crf',
      '30',
      '-preset',
      'slow',
      '-vf',
      'scale=1280:-2',
      '-movflags',
      '+faststart',
      '-pix_fmt',
      'yuv420p',
      file,
    ],
    { stdio: 'ignore' },
  );
  log.calls.push({
    name: 'one-week',
    endpoint: I2V,
    request_id: id,
    prompt,
    input: { ...input, image_url: '(clip-source)' },
  });
  save();
  console.log('ok clip');
}

const what = process.argv[2];
if (!what || what === 'images') await images();
if (!what || what === 'clip') await clip();
