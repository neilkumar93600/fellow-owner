import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Tint } from '@fellow-owners/shared';
import { ImageResponse } from 'next/og';

/*
 * The share card (next/og, 1200 by 630) in Parchment Frost, for the site default (app/opengraph-image),
 * the bio link and a showcase: parchment with the four Monad washes as radial gradients, one frosted
 * panel with an Ash hairline and almost no shadow, the round portrait, the title in Newsreader at 400, one
 * line and the room tags in Geist Mono (tags uppercase, a tint dot each), and the two-circle logo with
 * the serif wordmark at the bottom. Fonts come once from Google Fonts as TTF (satori cannot read woff2);
 * if that fails the default next/og font stands in.
 */

const INK = '#242424';
const GRAPHITE = '#4E4D4D';
const PARCHMENT = '#F6F3F1';
const HAIRLINE = 'rgba(206, 202, 200, 0.75)';
/** The room's tint as a small dot on its tag (pastels decorate, they never carry words). */
const DOT: Record<Tint, string> = {
  peach: '#FF9473',
  lavender: '#A0B5EB',
  aqua: '#A7FCCD',
  lime: '#A7FCCD',
  white: '#ECDA98',
};
/** Pale tints behind initials when there is no photo (as the avatar tiles do). */
const AVATAR_TILES = ['#FFD9CC', '#CFDAF5', '#D2FDE5'];

/**
 * The page washes from globals.css (coral, sky-wash, gold and mint at about half strength) as one
 * full-card layer of radial gradients: separate boxes reaching past the card edge left seams in satori.
 */
const WASHES = [
  { x: 190, y: 130, r: 390, rgb: '255, 148, 115', alpha: 0.42 },
  { x: 1080, y: 100, r: 380, rgb: '160, 181, 235', alpha: 0.5 },
  { x: 1040, y: 640, r: 380, rgb: '236, 218, 152', alpha: 0.5 },
  { x: 160, y: 640, r: 320, rgb: '167, 252, 205', alpha: 0.45 },
]
  .map(
    ({ x, y, r, rgb, alpha }) =>
      `radial-gradient(circle at ${x}px ${y}px, rgba(${rgb}, ${alpha}) 0px, rgba(${rgb}, 0) ${r}px)`,
  )
  .join(', ');

/** Mirrors initials() and tileFor() in components/shared/avatar-initials (a client module). */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
function tileFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_TILES[Math.abs(hash) % AVATAR_TILES.length];
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// ponytail: only the demo creator has a generated portrait (a JPEG: satori cannot decode the webp); everyone else is read from
// public/ when it is a local path, else initials.
const DEMO_PORTRAIT = '/creator/mira-portrait-og.jpg';

/** A photo under public/ as a data URI; null when it is missing, empty or remote. */
async function localPhoto(src: string | null): Promise<string | null> {
  // A stored avatar (the onboarding import) is a data: URL already; satori only decodes jpeg and png.
  if (src && /^data:image\/(jpeg|png);base64,/.test(src)) return src;
  if (!src?.startsWith('/')) return null;
  try {
    const file = await readFile(join(process.cwd(), 'public', src));
    if (file.length === 0) return null;
    const type = src.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${type};base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500;
  style: 'normal';
};

let fonts: Promise<OgFont[]> | undefined;
/** Newsreader 400 and Geist Mono 400/500 as TTF bytes; [] on any failure (the default font stands in). */
function ogFonts(): Promise<OgFont[]> {
  fonts ??= (async () => {
    try {
      // No browser user agent: Google then answers with truetype urls instead of woff2.
      const css = await (
        await fetch(
          'https://fonts.googleapis.com/css2?family=Newsreader&family=Geist+Mono:wght@400;500',
          { signal: AbortSignal.timeout(4000) },
        )
      ).text();
      const faces = [
        ...css.matchAll(
          /font-family: '([^']+)';[^}]*?font-weight: (\d+);[^}]*?src: url\((https:[^)]+)\) format\('truetype'\)/g,
        ),
      ];
      return await Promise.all(
        faces.map(async ([, name, weight, url]) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (!res.ok) throw new Error(`font ${res.status}`);
          return {
            name,
            data: await res.arrayBuffer(),
            weight: weight === '500' ? 500 : 400,
            style: 'normal',
          } as const;
        }),
      );
    } catch {
      return [];
    }
  })();
  // An empty result (offline, blocked) is not cached: try again on the next request.
  void fonts.then((list) => {
    if (list.length === 0) fonts = undefined;
  });
  return fonts;
}

export interface SpaceOgCard {
  /** The serif line: the creator's name, the project title, or the site's promise. */
  title: string;
  /** The mono line under it: the one-line bio, "Featured by Mira Lane", or the site's one-liner. */
  line: string | null;
  /** Whose avatar shows (the creator); none on the site's own card. */
  person?: { name: string; avatarUrl: string | null };
  /** The space is the demo world: it has a generated portrait and the card says Demo. */
  isDemo?: boolean;
  /** Up to three tags: the rooms, or the site's three nouns. */
  chips: { name: string; tint: Tint }[];
  /** A small hairline pill above the title (the site card's "One link in your bio"). */
  eyebrow?: string;
}

export async function spaceOgImage({ title, line, person, chips, isDemo, eyebrow }: SpaceOgCard) {
  const [photo, fontList] = await Promise.all([
    person ? localPhoto(isDemo ? DEMO_PORTRAIT : person.avatarUrl) : null,
    ogFonts(),
  ]);
  const has = (name: string) => fontList.some((font) => font.name === name);
  const serif = has('Newsreader') ? 'Newsreader' : 'serif';
  const mono = has('Geist Mono') ? 'Geist Mono' : 'monospace';
  const pill = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 44,
    padding: '0 20px',
    borderRadius: 22,
    border: `2px solid ${HAIRLINE}`,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    fontFamily: mono,
    fontSize: 19,
    fontWeight: 500,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: INK,
  } as const;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 48,
        padding: 56,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: PARCHMENT,
        color: INK,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          backgroundImage: WASHES,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 44,
          padding: 44,
          borderRadius: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          border: `2px solid ${HAIRLINE}`,
          boxShadow: '0 0 20px 0 rgba(0, 0, 0, 0.06)',
        }}
      >
        {!person ? null : photo ? (
          // biome-ignore lint/performance/noImgElement: next/og renders plain img elements
          <img
            src={photo}
            alt=""
            width={176}
            height={176}
            style={{
              borderRadius: 88,
              objectFit: 'cover',
              objectPosition: 'top',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 176,
              height: 176,
              flexShrink: 0,
              borderRadius: 88,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tileFor(person.name),
              fontFamily: serif,
              fontSize: 64,
            }}
          >
            {initials(person.name)}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 18,
            flex: 1,
            minWidth: 0,
          }}
        >
          {eyebrow ? <div style={{ ...pill, height: 40, fontSize: 17 }}>{eyebrow}</div> : null}
          <div
            style={{
              fontFamily: serif,
              fontSize: person ? 68 : 76,
              lineHeight: 1.08,
              letterSpacing: -1.4,
            }}
          >
            {clip(title, 70)}
          </div>
          {line ? (
            <div
              style={{
                fontFamily: mono,
                fontSize: 26,
                lineHeight: 1.4,
                letterSpacing: -0.5,
                color: GRAPHITE,
              }}
            >
              {clip(line, 96)}
            </div>
          ) : null}
          {chips.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 6,
              }}
            >
              {chips.slice(0, 3).map((chip) => (
                <div key={chip.name} style={pill}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: DOT[chip.tint],
                    }}
                  />
                  {clip(chip.name, 22)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width="68" height="44" viewBox="0 0 34 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9.25" stroke={INK} strokeWidth="2.5" />
          <circle cx="23" cy="11" r="9.25" fill={INK} fillOpacity="0.92" />
        </svg>
        <div style={{ fontFamily: serif, fontSize: 36, letterSpacing: -0.7 }}>Fellow Owners</div>
        {isDemo ? (
          <div style={{ ...pill, height: 40, fontSize: 17, marginLeft: 'auto' }}>Demo space</div>
        ) : null}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: fontList.length > 0 ? fontList : undefined,
    },
  );
}
