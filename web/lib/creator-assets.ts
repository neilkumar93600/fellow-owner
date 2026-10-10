/**
 * The demo creator's imagery (Mira Lane, fictional), generated with fal.ai into public/creator/ (prompts
 * in prompt.md). Flip `ready` to true only once the file exists: until then CreatorImage draws a same-ratio
 * gradient in `tone`, so a missing image never breaks the layout or shows a broken-image icon.
 */
export type CreatorAsset =
  | 'mira-portrait'
  | 'mira-portrait-alt'
  | 'vlog-lisbon'
  | 'vlog-night-market'
  | 'vlog-van-coast'
  | 'vlog-cafe'
  | 'vlog-mountain'
  | 'vlog-hostel'
  | 'cover-budget-travel'
  | 'cover-solo-travelers'
  | 'cover-travel-photography'
  | 'cover-food-finds'
  | 'cover-road-trips'
  | 'cover-slow-living'
  | 'fan-1'
  | 'fan-2'
  | 'fan-3'
  | 'fan-4'
  | 'fan-5'
  | 'fan-6'
  | 'auth-art';

export type CreatorTone = 'peach' | 'sky' | 'lilac' | 'mint';

export interface CreatorAssetInfo {
  src: string;
  width: number;
  height: number;
  ready: boolean;
  tone: CreatorTone;
}

const SIZES = {
  portrait: { width: 1200, height: 1500 },
  wide: { width: 1600, height: 1000 },
  face: { width: 256, height: 256 },
} as const;

function asset(name: CreatorAsset, shape: keyof typeof SIZES, tone: CreatorTone): CreatorAssetInfo {
  return { src: `/creator/${name}.webp`, ...SIZES[shape], ready: true, tone };
}

export const CREATOR_ASSETS: Record<CreatorAsset, CreatorAssetInfo> = {
  'mira-portrait': asset('mira-portrait', 'portrait', 'peach'),
  'mira-portrait-alt': asset('mira-portrait-alt', 'portrait', 'lilac'),
  'vlog-lisbon': asset('vlog-lisbon', 'wide', 'peach'),
  'vlog-night-market': asset('vlog-night-market', 'wide', 'lilac'),
  'vlog-van-coast': asset('vlog-van-coast', 'wide', 'sky'),
  'vlog-cafe': asset('vlog-cafe', 'wide', 'peach'),
  'vlog-mountain': asset('vlog-mountain', 'wide', 'mint'),
  'vlog-hostel': asset('vlog-hostel', 'wide', 'lilac'),
  'cover-budget-travel': asset('cover-budget-travel', 'wide', 'peach'),
  'cover-solo-travelers': asset('cover-solo-travelers', 'wide', 'lilac'),
  'cover-travel-photography': asset('cover-travel-photography', 'wide', 'sky'),
  'cover-food-finds': asset('cover-food-finds', 'wide', 'peach'),
  'cover-road-trips': asset('cover-road-trips', 'wide', 'sky'),
  'cover-slow-living': asset('cover-slow-living', 'wide', 'mint'),
  'fan-1': asset('fan-1', 'face', 'peach'),
  'fan-2': asset('fan-2', 'face', 'sky'),
  'fan-3': asset('fan-3', 'face', 'lilac'),
  'fan-4': asset('fan-4', 'face', 'mint'),
  'fan-5': asset('fan-5', 'face', 'peach'),
  'fan-6': asset('fan-6', 'face', 'lilac'),
  'auth-art': asset('auth-art', 'portrait', 'peach'),
};

/** The "One week with Mira" backdrop clip (Seedance, muted loop); its poster is a vlog still. */
export const CREATOR_CLIP: { src: string; poster: CreatorAsset; ready: boolean } = {
  src: '/creator/one-week.mp4',
  poster: 'vlog-lisbon',
  ready: true,
};
