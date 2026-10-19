/**
 * Pure helpers for the audience preview (scripts/audience-preview.ts): the comment scrubber and the
 * self-contained HTML card. Nothing here reads the network or the disk.
 */

export const PREVIEW_BANNER =
  'Built from public comments on your last 10 videos. Not published. Only you have this file.';
export const QUOTE_MAX_CHARS = 140;
export const QUOTES_PER_ROOM = 3;

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
// Bare domains such as "x.co/abc" or "mysite.com".
const DOMAIN_RE =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|me|tv|gg|ly|app|dev|xyz|info)\b\S*/gi;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
// Unicode-aware, so "@José" goes whole instead of leaving "é" behind.
const HANDLE_RE = /@[\p{L}\p{N}_.-]+/gu;
// 7+ digits with optional separators: phone numbers, ids.
const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Removes what could identify a commenter: links, emails, @handles, phone numbers and, when given,
 * the commenter names (each word too) and handles from the same batch. Idempotent. The result may be empty.
 */
export function scrubComment(text: string, names: readonly string[] = []): string {
  let out = text.replace(URL_RE, ' ').replace(EMAIL_RE, ' ').replace(DOMAIN_RE, ' ');
  out = out.replace(HANDLE_RE, ' ').replace(PHONE_RE, ' ');
  for (const name of names) {
    // The whole name and each of its words ("Sarah Lee" -> "Sarah"). Short ones would also eat
    // ordinary words, so only 4+ characters are stripped.
    for (const part of [name, ...name.split(/\s+/)]) {
      if (part.length >= 4) out = out.replace(new RegExp(escapeRegExp(part), 'gi'), ' ');
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** A quote cut to QUOTE_MAX_CHARS at a word boundary, with an ellipsis when cut. */
export function clipQuote(text: string): string {
  if (text.length <= QUOTE_MAX_CHARS) return text;
  const cut = text.slice(0, QUOTE_MAX_CHARS - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 60 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface PreviewRoom {
  name: string;
  description: string;
  count: number;
  quotes: string[];
}

export interface PreviewInput {
  channelTitle: string;
  videoCount: number;
  commentCount: number;
  rooms: PreviewRoom[];
  generatedAt: Date;
  expiresAt: Date;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 26, 2026" in UTC, so the file reads the same everywhere. */
export function formatPreviewDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

const CSS = `
:root{--bg:#f6f3f1;--ink:#242424;--muted:#5c5a58;--accent:#2b59d1;--line:rgba(36,36,36,.12);--glass:rgba(255,255,255,.62)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Geist Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-text-size-adjust:100%}
main{max-width:480px;margin:0 auto;padding:28px 16px 40px}
h1,h2{font-family:Newsreader,Georgia,"Times New Roman",serif;font-weight:400;margin:0;line-height:1.15}
h1{font-size:32px;margin-top:6px;overflow-wrap:anywhere}
h2{font-size:22px}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.panel{background:var(--glass);border:1px solid var(--line);border-radius:16px;padding:16px;margin-top:16px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.banner{border-left:3px solid var(--accent);font-size:13px}
.totals{display:flex;gap:8px;margin-top:16px}
.totals div{flex:1;background:var(--glass);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.totals b{display:block;font-family:Newsreader,Georgia,serif;font-weight:400;font-size:28px;line-height:1.1;color:var(--accent)}
.totals span{font-size:12px;color:var(--muted)}
.room-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.count{color:var(--accent);font-size:13px;white-space:nowrap}
.desc{margin:6px 0 0;color:var(--muted);font-size:13px}
blockquote{margin:10px 0 0;padding:2px 0 2px 12px;border-left:2px solid var(--accent);font-size:14px;overflow-wrap:anywhere}
.foot{margin-top:20px;font-size:12px;color:var(--muted)}
`;

/** The preview as one self-contained HTML page: inline CSS, no scripts, no external requests. */
export function buildPreviewHtml(input: PreviewInput): string {
  const e = escapeHtml;
  const rooms = input.rooms
    .map((room) => {
      const quotes = room.quotes
        .map((quote) => clipQuote(scrubComment(quote)))
        .filter((quote) => quote.length > 0)
        .slice(0, QUOTES_PER_ROOM)
        .map((quote) => `<blockquote>${e(quote)}</blockquote>`)
        .join('');
      return `<section class="panel"><div class="room-head"><h2>${e(room.name)}</h2><span class="count">${room.count} ${room.count === 1 ? 'comment' : 'comments'}</span></div><p class="desc">${e(room.description)}</p>${quotes}</section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Audience preview for ${e(input.channelTitle)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<p class="eyebrow">Audience preview</p>
<h1>${e(input.channelTitle)}</h1>
<p class="panel banner">${e(PREVIEW_BANNER)}</p>
<div class="totals">
<div><b>${input.videoCount}</b><span>videos read</span></div>
<div><b>${input.commentCount}</b><span>comments read</span></div>
<div><b>${input.rooms.length}</b><span>suggested rooms</span></div>
</div>
${rooms}
<p class="foot">Rooms are suggestions for you to review. Quotes have no names, handles or links. Made ${e(formatPreviewDate(input.generatedAt))}, good until ${e(formatPreviewDate(input.expiresAt))}.</p>
</main>
</body>
</html>
`;
}
