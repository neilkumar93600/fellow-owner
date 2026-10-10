// Run: node scripts/check.ts. The one runnable check for the timing the music and the timeline share.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BAR, BEAT, DURATION, FPS, START, TOTAL } from '../src/timeline.ts';

assert.equal(BEAT, 15);
assert.equal(BAR, 60);
assert.equal(TOTAL, 2520, 'video must be 84 s at 30 fps');
assert.equal(TOTAL / FPS, 84);
assert.deepEqual(START, {
  Hook: 0,
  Problem: 240,
  Solution: 600,
  FanJoin: 1080,
  Triage: 1380,
  Today: 1620,
  Build: 1860,
  Outro: 2280,
});
for (const [id, d] of Object.entries(DURATION)) assert.equal(d % BAR, 0, `${id} must be whole bars`);
console.log('timeline ok');

const wav = readFileSync(new URL('../public/audio/music.wav', import.meta.url));
assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
const channels = wav.readUInt16LE(22);
const rate = wav.readUInt32LE(24);
const bits = wav.readUInt16LE(34);
const dataBytes = wav.readUInt32LE(40);
assert.deepEqual([channels, rate, bits], [2, 44100, 16]);
assert.ok(dataBytes / (rate * channels * 2) >= TOTAL / FPS, 'music must cover the whole video');
for (const n of ['whoosh', 'whip', 'switch', 'mouse-click', 'ding', 'page-turn', 'shutter-modern']) {
  assert.ok(existsSync(new URL(`../public/sfx/${n}.wav`, import.meta.url)), `missing sfx ${n}`);
}
console.log('audio ok');

// Fitted user track (scripts/fit-music.ts) and voice-over (scripts/make-voiceover.ts).
const fitted = readFileSync(new URL('../public/audio/music-fitted.wav', import.meta.url));
assert.equal(fitted.toString('ascii', 36, 40), 'data', 'music-fitted.wav needs a canonical 44-byte header');
assert.ok(fitted.readUInt32LE(40) / (44100 * 2 * 2) >= TOTAL / FPS - 0.001, 'fitted music must cover the whole video');
const { VO_LINES } = await import('../src/voiceover.ts');
const { VO_DURATIONS } = await import('../src/voiceover.generated.ts');
VO_LINES.forEach((line, i) => {
  assert.ok(existsSync(new URL(`../public/voiceover/${line.id}.mp3`, import.meta.url)), `missing voice clip ${line.id}`);
  const end = line.at + (VO_DURATIONS[line.id] ?? Infinity);
  const limit = (VO_LINES[i + 1]?.at ?? TOTAL / FPS) - 0.25;
  assert.ok(end <= limit, `${line.id} runs ${(end - limit).toFixed(2)} s into the next line`);
});
console.log('voice-over ok');
