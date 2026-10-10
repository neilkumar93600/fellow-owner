import { cn } from '@/components/ui/cn';
import { formatNumber } from '@/lib/format';

export interface DonutSegment {
  label: string;
  value: number;
}

export interface DonutChartProps {
  /**
   * In series order (Marigold, Chart Violet, Lagoon Teal). Past three, the two largest keep their names
   * and the rest fold into `otherLabel`; empty segments are dropped.
   */
  segments: DonutSegment[];
  /** The chart's name, such as "Inbox mix"; the total and every share are added to its image name. */
  label: string;
  /** The Caption under the total, such as "pitches". */
  totalLabel: string;
  otherLabel?: string;
  className?: string;
}

// Geometry in px. The ring is drawn in an SVG of fixed size, the labels in HTML pinned to the container's
// edges, so text never scales and nothing clips from a 300px card (252px of content) up.
const R = 84; // outer radius of the ring
const STROKE = 20;
const MID = R - STROKE / 2; // the stroke's centre line
const DISC = R - STROKE - 10; // the Pure White inner disc
const GAP = ((11 + STROKE) / MID) * (180 / Math.PI); // 11px between the round caps, in degrees
const LABEL = 39; // a label block: figure 18 + descriptor 16 + 4 + the 1px rule
const ROW_GAP = 10;
const HEIGHT = 2 * (LABEL + ROW_GAP + R);
/** The donut's height, for ChartCardSkeleton. */
export const DONUT_HEIGHT = HEIGHT;
const CY = HEIGHT / 2;
const SVG_W = 2 * (R + 24);
const CX = SVG_W / 2;
const RULE_TOP = LABEL - 0.5 - CY; // rule centre lines, relative to the ring's centre
const RULE_BOTTOM = HEIGHT - LABEL + 0.5 - CY;
const ANCHOR = R + 4; // leaders start just off the ring

interface Placed {
  start: number;
  sweep: number;
  mid: number;
  right: boolean;
  top: boolean;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function fold(segments: DonutSegment[], otherLabel: string): DonutSegment[] {
  const shown = segments.filter((s) => s.value > 0);
  if (shown.length <= 3) return shown;
  const [first, second, ...rest] = [...shown].sort((a, b) => b.value - a.value);
  return [first, second, { label: otherLabel, value: rest.reduce((sum, s) => sum + s.value, 0) }];
}

/**
 * Angles run clockwise from 12 o'clock. Each label sits in the row above or below the ring, on the side
 * of its segment, so the ring is turned until no two labels share a corner, preferring segment centres
 * near the diagonals where the leaders read best.
 * ponytail: brute force over 360 starts; fine for three segments.
 */
function place(values: number[], total: number): Placed[] {
  const sweeps = values.map((v) => (v / total) * 360);
  const turn = (start: number): Placed[] => {
    let at = start;
    return sweeps.map((sweep) => {
      const mid = (at + sweep / 2) % 360;
      const p = {
        start: at,
        sweep,
        mid,
        right: Math.sin(rad(mid)) >= -1e-9,
        top: Math.cos(rad(mid)) >= 0,
      };
      at += sweep;
      return p;
    });
  };
  let best = turn(0);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = 0; start < 360; start += 1) {
    const placed = turn(start);
    if (new Set(placed.map((p) => `${p.right}${p.top}`)).size < placed.length) continue;
    const score = Math.max(...placed.map((p) => Math.abs((p.mid % 90) - 45)));
    if (score < bestScore) {
      best = placed;
      bestScore = score;
    }
  }
  return best;
}

/** The leader: from just off the ring at the segment's centre, out to its label's rule. */
function leader(p: Placed) {
  const ax = Math.sin(rad(p.mid)) * ANCHOR;
  const ay = -Math.cos(rad(p.mid)) * ANCHOR;
  const ruleY = p.top ? RULE_TOP : RULE_BOTTOM;
  const reach = Math.abs(ax) + Math.min(20, Math.abs(ruleY - ay) * 0.4);
  return { ax, ay, ruleY, ex: p.right ? reach : -reach, reach };
}

/**
 * DESIGN.md donut (e23ccb "Sale Analytics"): at most three 20px round-capped segments with 11px gaps,
 * the total in Count on a Pure White disc ringed in Hairline Grey, and 1px leaders in each series color
 * ending in a short rule beside the label: the share in Small Strong ink, the name in Caption ink-muted.
 * Static, and one image to screen readers whose name carries every figure.
 */
export function DonutChart({
  segments,
  label,
  totalLabel,
  otherLabel = 'Everything else',
  className,
}: DonutChartProps) {
  const shown = fold(segments, otherLabel);
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const placed =
    total > 0
      ? place(
          shown.map((s) => s.value),
          total,
        )
      : [];
  const share = (value: number) => `${Math.round((value / total) * 100)}%`;
  const name = `${label}: ${formatNumber(total)} ${totalLabel}${
    shown.length ? `. ${shown.map((s) => `${s.label} ${share(s.value)}`).join(', ')}` : ''
  }.`;

  return (
    <div
      role="img"
      aria-label={name}
      className={cn('relative mx-auto w-full max-w-[520px]', className)}
      style={{ height: HEIGHT }}
    >
      <svg
        aria-hidden="true"
        width={SVG_W}
        height={HEIGHT}
        className="absolute top-0 left-1/2 -translate-x-1/2 overflow-visible"
      >
        {placed.length === 0 ? (
          <circle cx={CX} cy={CY} r={MID} fill="none" stroke="var(--line)" strokeWidth={STROKE} />
        ) : null}
        {placed.map((p, i) => {
          const color = `var(--chart-${i + 1})`;
          const whole = placed.length === 1;
          const length = whole ? 360 : Math.max(p.sweep - GAP, 0.001);
          const { ax, ay, ruleY, ex } = leader(p);
          return (
            <g key={shown[i].label}>
              <circle
                cx={CX}
                cy={CY}
                r={MID}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap={whole ? 'butt' : 'round'}
                pathLength={360}
                strokeDasharray={whole ? undefined : `${length} 360`}
                transform={`rotate(${p.start + (whole ? 0 : GAP / 2) - 90} ${CX} ${CY})`}
              />
              <polyline
                points={`${CX + ax},${CY + ay} ${CX + ex},${CY + ruleY}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
              />
            </g>
          );
        })}
      </svg>

      <div
        className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center rounded-full border border-line bg-white"
        style={{ top: CY - DISC, width: DISC * 2, height: DISC * 2 }}
      >
        <span className="text-count text-ink-soft">{formatNumber(total)}</span>
        <span className="text-caption text-ink-muted">{totalLabel}</span>
      </div>

      {placed.map((p, i) => {
        const { reach } = leader(p);
        const rule = (
          <span
            aria-hidden="true"
            className="block h-px w-full"
            style={{ backgroundColor: `var(--chart-${i + 1})` }}
          />
        );
        // The text sits on the far side of its rule from the leader, so the two never cross.
        return (
          <div
            key={shown[i].label}
            className={cn(
              'absolute flex w-max flex-col',
              p.right ? 'right-0 items-end text-right' : 'left-0 items-start text-left',
              p.top ? 'top-0' : 'bottom-0',
            )}
            style={{ minWidth: `calc(50% - ${reach}px)` }}
          >
            {p.top ? null : rule}
            <span className={cn('text-small-strong text-ink', !p.top && 'mt-1')}>
              {share(shown[i].value)}
            </span>
            <span className={cn('text-caption text-ink-muted', p.top && 'mb-1')}>
              {shown[i].label}
            </span>
            {p.top ? rule : null}
          </div>
        );
      })}
    </div>
  );
}
