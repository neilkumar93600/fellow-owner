import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import {
  Backpack,
  BookOpen,
  Camera,
  Car,
  Code2,
  Dumbbell,
  Gamepad2,
  Globe,
  Heart,
  Leaf,
  LineChart,
  type LucideIcon,
  Mic,
  Music,
  Palette,
  PenTool,
  Rocket,
  Sunrise,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';

/** The surfaces a pastel room can take (DESIGN.md community and stat cards). */
export type CardTint = 'peach' | 'lavender' | 'aqua' | 'white';

/** The shared enum still lists lime, but lime marks "you are here" and is never a surface: it reads as white. */
export function cardTint(tint: Tint): CardTint {
  return tint === 'lime' ? 'white' : tint;
}

/** Community cards rotate peach, lavender, aqua, white in creation order. */
export const TINT_ROTATION: readonly CardTint[] = ['peach', 'lavender', 'aqua', 'white'];

/**
 * Class strings per tint (Golden Hour Frost): the card is a frosted wash of its aurora colour, the 56px
 * icon tile and the community chip are the solid aurora tint, the icon is a deep stroke that clears 3:1
 * on its tile. Words on every one of them stay ink or ink-soft (ink-soft is 5.2:1 or more on the deepest tile).
 */
const FROST = 'border border-white/60 backdrop-blur-xl backdrop-saturate-150';
export const TINT_STYLES: Record<
  CardTint,
  { card: string; tile: string; icon: string; chip: string }
> = {
  peach: {
    card: `${FROST} bg-[#fff1e8]/80`,
    tile: 'bg-aurora-peach',
    icon: 'text-coral',
    chip: 'bg-aurora-peach',
  },
  lavender: {
    card: `${FROST} bg-[#f5f0ff]/80`,
    tile: 'bg-aurora-lilac',
    icon: 'text-[#5b47a8]',
    chip: 'bg-aurora-lilac',
  },
  aqua: {
    card: `${FROST} bg-[#effaf5]/80`,
    tile: 'bg-aurora-mint',
    icon: 'text-[#22694f]',
    chip: 'bg-aurora-mint',
  },
  white: { card: `${FROST} bg-white/72`, tile: 'bg-white', icon: 'text-ink', chip: 'bg-white/85' },
};

/** The Lucide icon behind each community icon name (shared COMMUNITY_ICONS). */
export const COMMUNITY_ICON: Record<CommunityIcon, LucideIcon> = {
  users: Users,
  'code-2': Code2,
  'pen-tool': PenTool,
  'line-chart': LineChart,
  music: Music,
  dumbbell: Dumbbell,
  leaf: Leaf,
  camera: Camera,
  'gamepad-2': Gamepad2,
  'book-open': BookOpen,
  rocket: Rocket,
  heart: Heart,
  globe: Globe,
  mic: Mic,
  palette: Palette,
  utensils: Utensils,
  wallet: Wallet,
  backpack: Backpack,
  car: Car,
  sunrise: Sunrise,
};
