// Pure render-mode logic for creator-image.tsx and its node check (creator-image.check.mjs).

/**
 * An image only when its file is known to exist; otherwise (unknown name, file not generated yet) a
 * same-ratio gradient placeholder, so a slot never shows a broken-image icon.
 * @param {{ ready: boolean } | undefined} asset
 * @returns {'image' | 'placeholder'}
 */
export function imageMode(asset) {
  return asset?.ready ? 'image' : 'placeholder';
}
