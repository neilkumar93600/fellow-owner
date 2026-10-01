import { ArrowUpRight, Check, Play } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import v from './showcase-visuals.module.css';

/*
 * One small picture of the project itself for each showcase card (demo data): the gym log's set list, the
 * thumbnail kit's frames, the club's Saturday schedule, a player, a 12-week chart, a calculator, a habit
 * grid and a cleanup map. Drawn in HTML and SVG in the reference set's language (white mini cards, monotone
 * bars, lime tooltips, icon-free tints). They are decoration (aria-hidden): the card title names the project.
 *
 * Each project also gets a card width, so the strip reads as a run of different things, not a grid.
 */

export type CardSize = 'sm' | 'md' | 'lg';

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const;

/* ---------- Gym-log app: today's sets ---------- */

const SETS = [
  { name: 'Bench press', load: '3 × 5 · 80 kg', done: true },
  { name: 'Overhead press', load: '3 × 8 · 45 kg', done: true },
  { name: 'Weighted dips', load: '3 × 10 · 10 kg', done: false },
] as const;

function GymLog() {
  return (
    <div className={v.card}>
      <span className={v.head}>
        <b>Push day</b>
        <span className={v.limeChip}>12-day streak</span>
      </span>
      <span className={v.sets}>
        {SETS.map((set) => (
          <span key={set.name} className={v.set} data-current={set.done ? undefined : ''}>
            <span className={v.tick} data-done={set.done ? '' : undefined}>
              {set.done ? <Check size={11} {...ICON} strokeWidth={2.5} /> : null}
            </span>
            <span className={v.setName}>{set.name}</span>
            <span className={cn(v.setLoad, 'tabular')}>{set.load}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/* ---------- Thumbnail kit: four frames ---------- */

const THUMBS = [
  { word: 'Day 1', tone: v.thumbPeach },
  { word: 'Why?', tone: v.thumbInk },
  { word: '10K', tone: v.thumbAqua },
  { word: 'Try it', tone: v.thumbLime },
] as const;

function Thumbnails() {
  return (
    <div className={v.thumbs}>
      {THUMBS.map((t) => (
        <span key={t.word} className={cn(v.thumb, t.tone)}>
          <span className={v.thumbWord}>{t.word}</span>
          <span className={v.thumbFace} />
        </span>
      ))}
    </div>
  );
}

/* ---------- Saturday code club: the week and two sessions ---------- */

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function CodeClub() {
  return (
    <div className={v.card}>
      <span className={v.days}>
        {DAYS.map((day, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed week; letters repeat.
          <span key={i} className={v.day} data-on={i === 5 ? '' : undefined}>
            {day}
          </span>
        ))}
      </span>
      <span className={v.session}>
        <span className={cn(v.time, v.timeLime, 'tabular')}>10:00</span>
        <span className={v.sessionName}>Build a game in Scratch</span>
      </span>
      <span className={v.session}>
        <span className={cn(v.time, 'tabular')}>11:30</span>
        <span className={v.sessionName}>Pair up and show it</span>
        <span className={cn(v.muted, 'tabular')}>14 kids</span>
      </span>
    </div>
  );
}

/* ---------- Lo-fi pack: a player ---------- */

/** Bar heights (0 to 1) for the waveform; the first eleven are played. */
const WAVE = [
  0.35, 0.55, 0.42, 0.7, 0.5, 0.82, 0.6, 0.46, 0.74, 0.92, 0.58, 0.4, 0.66, 0.84, 0.5, 0.36, 0.62,
  0.78, 0.52, 0.44, 0.7, 0.56, 0.38, 0.6, 0.48, 0.3,
] as const;
const PLAYED = 11;

function Player() {
  return (
    <div className={v.card}>
      <span className={v.track}>
        <span className={v.play}>
          <Play size={12} {...ICON} fill="currentColor" />
        </span>
        <span className={v.trackText}>
          <b>Rainy desk</b>
          <span className={v.muted}>Track 3 of 8</span>
        </span>
      </span>
      <span className={v.wave}>
        {WAVE.map((h, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed bars.
            key={i}
            data-played={i < PLAYED ? '' : undefined}
            style={{ '--h': h } as React.CSSProperties}
          />
        ))}
      </span>
      <span className={cn(v.times, 'tabular')}>
        <span>1:12</span>
        <span>2:41</span>
      </span>
    </div>
  );
}

/* ---------- 12-week strength plan: weekly top sets ---------- */

/** Planned top set per week (0 to 1 of the chart); weeks 1 to 8 are done, week 8 is this week. */
const WEEKS = [0.3, 0.34, 0.4, 0.34, 0.44, 0.5, 0.46, 0.56, 0.66, 0.76, 0.68, 0.9] as const;
const THIS_WEEK = 7;

function StrengthPlan() {
  return (
    <div className={v.card}>
      <span className={v.head}>
        <b>Back squat</b>
        <span className={v.trend}>
          <ArrowUpRight size={13} {...ICON} />
          <span className="tabular">+30 kg</span>
        </span>
      </span>
      <span className={v.bars}>
        {WEEKS.map((h, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed weeks.
            key={i}
            className={v.bar}
            data-state={i < THIS_WEEK ? 'done' : i === THIS_WEEK ? 'now' : 'next'}
            style={{ '--h': h } as React.CSSProperties}
          >
            {i === THIS_WEEK ? <span className={cn(v.tip, 'tabular')}>Week 8 · 130 kg</span> : null}
          </span>
        ))}
      </span>
      <span className={cn(v.axis, 'tabular')}>
        <span>W1</span>
        <span>W12</span>
      </span>
    </div>
  );
}

/* ---------- Creator revenue calculator ---------- */

function Calculator() {
  return (
    <div className={v.card}>
      <span className={v.muted}>Sponsor revenue a month</span>
      <span className={v.money}>
        <b className="tabular">$4,280</b>
        <span className={v.muted}>est.</span>
      </span>
      <span className={v.slider}>
        <span className={v.sliderFill} />
        <span className={v.knob} />
      </span>
      <span className={v.inputs}>
        <span className={v.input}>
          <span className="tabular">2</span> deals
        </span>
        <span className={v.input}>
          <span className="tabular">140K</span> views
        </span>
      </span>
    </div>
  );
}

/* ---------- Habit tracker widget ---------- */

/** Three weeks of check-ins: 2 done, 1 partly done, 0 missed. The last day is today. */
const HABITS = [2, 2, 1, 2, 2, 0, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2] as const;

function Habits() {
  return (
    <div className={cn(v.card, v.widget)}>
      <span className={v.head}>
        <b>Habits</b>
        <span className={v.limeChip}>
          <span className="tabular">18</span> days
        </span>
      </span>
      <span className={v.grid}>
        {HABITS.map((state, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed days.
            key={i}
            data-state={state}
            data-today={i === HABITS.length - 1 ? '' : undefined}
          />
        ))}
      </span>
    </div>
  );
}

/* ---------- Park cleanup map ---------- */

const PINS = [
  { x: 22, y: 34, done: true },
  { x: 48, y: 62, done: true },
  { x: 70, y: 28, done: true },
  { x: 84, y: 66, done: false },
] as const;

function CleanupMap() {
  return (
    <div className={v.map}>
      <svg
        className={v.mapSvg}
        viewBox="0 0 320 128"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          className={v.park}
          d="M18 20 C 60 4, 120 12, 168 26 S 250 22, 300 46 C 318 70, 296 112, 248 118 S 150 124, 96 116 S 6 96, 10 62 S 2 30, 18 20 Z"
        />
        <ellipse className={v.pond} cx="128" cy="70" rx="34" ry="18" />
        <path className={v.roadEdge} d="M-10 96 C 70 84, 120 104, 190 82 S 290 52, 330 60" />
        <path className={v.road} d="M-10 96 C 70 84, 120 104, 190 82 S 290 52, 330 60" />
        <path className={v.roadEdge} d="M206 -10 C 196 40, 214 80, 200 140" />
        <path className={v.road} d="M206 -10 C 196 40, 214 80, 200 140" />
      </svg>
      {PINS.map((pin) => (
        <span
          key={`${pin.x}-${pin.y}`}
          className={v.pin}
          data-done={pin.done ? '' : undefined}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          {pin.done ? <Check size={11} {...ICON} strokeWidth={2.5} /> : null}
        </span>
      ))}
      <span className={v.mapChip}>
        <span className="tabular">23</span> spots cleared
      </span>
    </div>
  );
}

/* ---------- Lookup ---------- */

const VISUALS: Record<string, { size: CardSize; Visual: () => React.JSX.Element }> = {
  'Gym-log app for creators': { size: 'lg', Visual: GymLog },
  'Thumbnail kit for small channels': { size: 'sm', Visual: Thumbnails },
  'Saturday code club for kids': { size: 'md', Visual: CodeClub },
  'Lo-fi pack for study streams': { size: 'sm', Visual: Player },
  '12-week strength plan, open source': { size: 'lg', Visual: StrengthPlan },
  'Creator revenue calculator': { size: 'md', Visual: Calculator },
  'Habit tracker widget': { size: 'sm', Visual: Habits },
  'Community-run park cleanup map': { size: 'md', Visual: CleanupMap },
};

export function projectSize(title: string): CardSize {
  return VISUALS[title]?.size ?? 'md';
}

/** The project's picture, or nothing for a project without one. Always aria-hidden. */
export function ProjectVisual({ title, className }: { title: string; className?: string }) {
  const entry = VISUALS[title];
  if (!entry) return null;
  const { Visual } = entry;
  return (
    <div className={cn(v.visual, className)} aria-hidden="true">
      <Visual />
    </div>
  );
}
