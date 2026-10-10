// Run: node scripts/fit-music.ts
// Fits the user's track (repo-root music.mp3, Suno "Product Launch Bed", 121.43 BPM, drop at 16.02 s) to the
// video's locked 120 BPM bar grid and writes public/audio/music-fitted.wav (84.000 s, 44.1 kHz, 16-bit, canonical
// 44-byte header). Measured: beat 0.49410 s, first downbeat 0.2042 s.
// Edit (bars are 2 s after the stretch, bar 0 at 0 s):
//   song bars 0-6, then bars 4-8 again (+2 bars) so the drop (song bar 8) lands on the Solution reveal at 20 s;
//   song bars 8-36, then 38-42 (cut 36-38) so the song ends at 84 s; the last segment starts 50 ms late to sit on
//   the grid. Splices are 30 ms triangular crossfades on bar lines; 0.35 s fade-out at the end.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../../music.mp3', import.meta.url));
const out = fileURLToPath(new URL('../public/audio/music-fitted.wav', import.meta.url));
const TEMPO = 120 / 121.433; // atempo factor
const LEAD = 0.2042; // first downbeat in the original

const graph = [
  `[0:a]atrim=start=${LEAD},asetpts=PTS-STARTPTS,aresample=44100,atempo=${TEMPO.toFixed(6)},asplit=4[s1][s2][s3][s4]`,
  '[s1]atrim=0:12.03,asetpts=PTS-STARTPTS[a]',
  '[s2]atrim=8:16.03,asetpts=PTS-STARTPTS[b]',
  '[s3]atrim=16:72.03,asetpts=PTS-STARTPTS[c]',
  '[s4]atrim=75.95:86,asetpts=PTS-STARTPTS[d]',
  '[a][b]acrossfade=d=0.03:c1=tri:c2=tri[ab]',
  '[ab][c]acrossfade=d=0.03:c1=tri:c2=tri[abc]',
  '[abc][d]acrossfade=d=0.03:c1=tri:c2=tri[all]',
  '[all]atrim=0:84,afade=t=out:st=83.65:d=0.35,aformat=sample_fmts=s16:channel_layouts=stereo[out]',
].join(';');

execFileSync(
  'ffmpeg',
  ['-hide_banner', '-v', 'error', '-y', '-i', src, '-filter_complex', graph, '-map', '[out]', '-map_metadata', '-1',
    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'pcm_s16le', out],
  { stdio: 'inherit' },
);
console.log(`wrote ${out}`);
