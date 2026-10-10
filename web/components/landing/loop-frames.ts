// Decoded-frame cache for the loop scrub (3d-scroll-website performance rules).
//
// Frames arrive as encoded bytes (Blobs, about 80KB each). Only a sliding window around the current frame
// is decoded, with createImageBitmap, which decodes off the main thread, so scrubbing never pays a
// synchronous WebP decode inside the scroll frame. The window leans toward the scroll direction, bitmaps
// that leave it are closed at once, and the whole window can be released while the scene is off screen, so
// decoded memory stays at about AHEAD + BEHIND + 1 frames (about 120MB at 1600x900, 40MB on the phone set) instead of
// growing to every frame drawn.

/** Frames decoded ahead of the current one, in the scroll direction. */
const AHEAD = 14;
/** Frames kept behind it, for a reversal. */
const BEHIND = 6;
const DECODES_IN_FLIGHT = 3;

export interface DecodedFrame {
  image: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decodeFrame(blob: Blob): Promise<DecodedFrame> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }
  // Very old engines: decode through an image element (still async, still released with the window).
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return {
    image: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    close: () => img.removeAttribute('src'),
  };
}

export interface FrameCache {
  /** Hands over a fetched frame's bytes. */
  add: (frame: number, blob: Blob) => void;
  /** Number of frames whose bytes are in. */
  readonly size: number;
  /** Moves the decode window to `frame`, leaning toward `direction` (1 scrolling down, -1 up). */
  focus: (frame: number, direction: number) => void;
  /** The decoded frame closest to `frame` (itself when it is ready), or null when nothing is decoded. */
  nearest: (frame: number) => { frame: number; decoded: DecodedFrame } | null;
  /** Closes every decoded bitmap and forgets the window; the bytes stay for the next focus. */
  release: () => void;
  /** Releases everything, bytes included. */
  dispose: () => void;
}

/**
 * `shown` lists the frames the scrub can draw, in order; the window counts in that list, so frames the scene
 * never shows take no slot. `onDecoded` runs when a frame in the window becomes drawable.
 */
export function createFrameCache(
  shown: readonly number[],
  onDecoded: (frame: number) => void,
): FrameCache {
  const slotOf = new Map(shown.map((frame, slot) => [frame, slot]));
  const blobs = new Map<number, Blob>();
  const decoded = new Map<number, DecodedFrame>();
  const pending = new Set<number>();
  let wanted: number[] = [];
  let wantedSet = new Set<number>();
  let focusKey = '';
  let disposed = false;

  const slotFor = (frame: number): number => {
    const exact = slotOf.get(frame);
    if (exact !== undefined) return exact;
    let best = 0;
    shown.forEach((candidate, slot) => {
      if (Math.abs(candidate - frame) < Math.abs((shown[best] ?? 0) - frame)) best = slot;
    });
    return best;
  };

  function pump() {
    if (disposed) return;
    for (const frame of wanted) {
      if (pending.size >= DECODES_IN_FLIGHT) return;
      if (decoded.has(frame) || pending.has(frame)) continue;
      const blob = blobs.get(frame);
      if (!blob) continue;
      pending.add(frame);
      decodeFrame(blob).then(
        (result) => {
          pending.delete(frame);
          if (disposed || !wantedSet.has(frame)) result.close();
          else {
            decoded.set(frame, result);
            onDecoded(frame);
          }
          pump();
        },
        () => {
          // A frame that will not decode is dropped; nearest() falls back to its neighbours.
          pending.delete(frame);
          blobs.delete(frame);
          pump();
        },
      );
    }
  }

  function release() {
    for (const result of decoded.values()) result.close();
    decoded.clear();
    wanted = [];
    wantedSet = new Set();
    focusKey = '';
  }

  return {
    add(frame, blob) {
      if (disposed) return;
      blobs.set(frame, blob);
      if (wantedSet.has(frame)) pump();
    },
    get size() {
      return blobs.size;
    },
    focus(frame, direction) {
      if (disposed) return;
      const center = slotFor(frame);
      const lean = direction < 0 ? -1 : 1;
      const key = `${center}:${lean}`;
      if (key === focusKey) return;
      focusKey = key;
      const order: number[] = [];
      const push = (slot: number) => {
        const f = shown[slot];
        if (f !== undefined) order.push(f);
      };
      push(center);
      for (let d = 1; d <= AHEAD; d += 1) {
        push(center + lean * d);
        if (d <= BEHIND) push(center - lean * d);
      }
      wanted = order;
      wantedSet = new Set(order);
      for (const [f, result] of decoded) {
        if (!wantedSet.has(f)) {
          result.close();
          decoded.delete(f);
        }
      }
      pump();
    },
    nearest(frame) {
      const exact = decoded.get(frame);
      if (exact) return { frame, decoded: exact };
      const target = slotFor(frame);
      let best: { frame: number; decoded: DecodedFrame } | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const [f, result] of decoded) {
        const distance = Math.abs((slotOf.get(f) ?? 0) - target);
        if (distance < bestDistance) {
          best = { frame: f, decoded: result };
          bestDistance = distance;
        }
      }
      return best;
    },
    release,
    dispose() {
      release();
      blobs.clear();
      disposed = true;
    },
  };
}
