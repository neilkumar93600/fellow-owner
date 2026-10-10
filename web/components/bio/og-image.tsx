import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Tint } from '@fellow-owners/shared';
import { ImageResponse } from 'next/og';

/*
 * DESIGN.md Open Graph image (Golden Hour Frost), shared by the bio link and showcase routes (next/og,
 * 1200 by 630): the cream page with the aurora as four radial gradients, a frosted white panel with the
 * round portrait, the title in Instrument Serif at 68px and one line at 30px in ink, up to three room chips in
 * their aurora tints, and the two-circle logo with the wordmark at the bottom. No lime, no purple, no
 * match labels. Instrument Serif is fetched once from Google Fonts as a TTF (satori cannot read woff2);
 * if that fails the default next/og font stands in.
 */

const INK = '#1E1B26';
const INK_SOFT = '#55506A';
const CREAM = '#FBF7F2';
/** Room chips and avatar tiles: the aurora tints; white rooms take plain white, and lime reads as white. */
const TILE: Record<Tint, string> = {
  peach: '#FFD9C2',
  lavender: '#DCCFF7',
  aqua: '#CFEFE3',
  white: '#FFFFFF',
  lime: '#FFFFFF',
};
const AVATAR_TILES = [TILE.peach, TILE.lavender, TILE.aqua];

/** The aurora from globals.css: soft circles, each a radial gradient from its colour to transparent. */
const AURORA = [
  { left: -180, top: -220, size: 760, rgb: '255, 217, 194', alpha: 0.95 },
  { left: 720, top: -260, size: 700, rgb: '191, 221, 247', alpha: 0.9 },
  { left: 640, top: 280, size: 760, rgb: '220, 207, 247', alpha: 0.85 },
  { left: -140, top: 330, size: 620, rgb: '207, 239, 227', alpha: 0.9 },
];

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

let serif: Promise<ArrayBuffer | null> | undefined;
/** Instrument Serif regular as TTF bytes from Google Fonts; null on any failure (the default font stands in). */
function instrumentSerif(): Promise<ArrayBuffer | null> {
  serif ??= (async () => {
    try {
      // No browser user agent: Google then answers with a TTF url instead of woff2.
      const css = await (
        await fetch('https://fonts.googleapis.com/css2?family=Instrument+Serif', {
          signal: AbortSignal.timeout(4000),
        })
      ).text();
      const url = css.match(/src: url\((https:[^)]+)\) format\('truetype'\)/)?.[1];
      if (!url) return null;
      const font = await fetch(url, { signal: AbortSignal.timeout(4000) });
      return font.ok ? await font.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  // A null result (fetch failed, no url) is not cached: try again on the next request.
  void serif.then((bytes) => {
    if (!bytes) serif = undefined;
  });
  return serif;
}

export interface SpaceOgCard {
  /** The 68px line: the creator's name, or the project title on a showcase. */
  title: string;
  /** The 30px line: the one-line bio, or "Featured by Mira Lane". */
  line: string | null;
  /** Whose avatar shows (the creator). */
  person: { name: string; avatarUrl: string | null };
  /** The space is the demo world: it has a generated portrait. Not inferred from the name. */
  isDemo?: boolean;
  chips: { name: string; tint: Tint }[];
}

export async function spaceOgImage({ title, line, person, chips, isDemo }: SpaceOgCard) {
  const [photo, font] = await Promise.all([
    localPhoto(isDemo ? DEMO_PORTRAIT : person.avatarUrl),
    instrumentSerif(),
  ]);
  const display = font ? 'Instrument Serif' : 'sans-serif';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 56,
        padding: 56,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: CREAM,
        color: INK,
      }}
    >
      {AURORA.map(({ rgb, alpha, size, ...box }) => (
        <div
          key={rgb}
          style={{
            position: 'absolute',
            ...box,
            width: size,
            height: size,
            backgroundImage: `radial-gradient(circle closest-side, rgba(${rgb}, ${alpha}), rgba(${rgb}, 0))`,
          }}
        />
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 44,
          padding: 44,
          borderRadius: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          border: '2px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 30px 70px -30px rgba(40, 30, 60, 0.35)',
        }}
      >
        {photo ? (
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
              fontSize: 60,
              fontWeight: 500,
            }}
          >
            {initials(person.name)}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: 68,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {clip(title, 70)}
          </div>
          {line ? (
            <div style={{ fontSize: 30, lineHeight: 1.35, color: INK_SOFT }}>{clip(line, 110)}</div>
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
                <div
                  key={chip.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 48,
                    padding: '0 22px',
                    borderRadius: 24,
                    backgroundColor: TILE[chip.tint],
                    fontSize: 24,
                    fontWeight: 500,
                  }}
                >
                  {chip.name}
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
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.6 }}>Fellow Owners</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: font
        ? [
            {
              name: 'Instrument Serif',
              data: font,
              weight: 400,
              style: 'normal',
            },
          ]
        : undefined,
    },
  );
}
