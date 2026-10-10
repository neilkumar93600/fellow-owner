// WCAG 2.2 contrast check. Usage: node scripts/contrast-check.mjs <fg> <bg> [<fg> <bg> ...] [--min=4.5]
// Hex colours (#rgb, #rrggbb, or #rrggbbaa where the alpha composites fg over bg). Exits 1 if any pair fails.

function parse(hex) {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) throw new Error(`Not a hex colour: ${hex}`);
  const n = (i) => Number.parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
});

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(fgHex, bgHex) {
  const bg = parse(bgHex);
  const fg = over(parse(fgHex), bg);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const args = process.argv.slice(2);
const min = Number(args.find((a) => a.startsWith('--min='))?.slice(6) ?? 4.5);
const colours = args.filter((a) => !a.startsWith('--'));
if (colours.length === 0 || colours.length % 2) {
  console.error('Usage: node scripts/contrast-check.mjs <fg> <bg> [<fg> <bg> ...] [--min=4.5]');
  process.exit(2);
}
let failed = 0;
for (let i = 0; i < colours.length; i += 2) {
  const ratio = contrast(colours[i], colours[i + 1]);
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${colours[i]} on ${colours[i + 1]}  ${ratio.toFixed(2)}:1`);
}
process.exit(failed ? 1 : 0);
