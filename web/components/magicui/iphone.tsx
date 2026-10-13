'use client';

import { type HTMLAttributes, useId } from 'react';
import { cn } from '@/components/ui/cn';

const PHONE_WIDTH = 433;
const PHONE_HEIGHT = 882;
const SCREEN_X = 21.25;
const SCREEN_Y = 19.25;
const SCREEN_WIDTH = 389.5;
const SCREEN_HEIGHT = 843.5;
const SCREEN_RADIUS = 55.75;

const SCREEN_BOX = {
  left: `${(SCREEN_X / PHONE_WIDTH) * 100}%`,
  top: `${(SCREEN_Y / PHONE_HEIGHT) * 100}%`,
  width: `${(SCREEN_WIDTH / PHONE_WIDTH) * 100}%`,
  height: `${(SCREEN_HEIGHT / PHONE_HEIGHT) * 100}%`,
  borderRadius: `${(SCREEN_RADIUS / SCREEN_WIDTH) * 100}% / ${(SCREEN_RADIUS / SCREEN_HEIGHT) * 100}%`,
};

export interface IphoneProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  videoSrc?: string;
  /** Classes for the screen (its fill; the shape is the phone's). */
  screenClassName?: string;
}

/**
 * Magic UI iPhone (magicui.design/docs/components/iphone), tuned to DESIGN.md: the same body in the
 * Parchment Frost neutrals, a screen that also takes children (live product UI), and an ink Dynamic
 * Island, since it sits over a real screen. The screen mask's id is per instance, so several phones on
 * one page (one of them display: none) never borrow each other's mask.
 */
export function Iphone({
  src,
  videoSrc,
  className,
  screenClassName,
  style,
  children,
  ...props
}: IphoneProps) {
  const punch = `${useId()}-screen`;
  const hasScreen = Boolean(videoSrc || src || children);
  const mask = hasScreen ? `url(#${punch})` : undefined;

  return (
    <div
      className={cn('relative block w-full', className)}
      style={{ aspectRatio: `${PHONE_WIDTH}/${PHONE_HEIGHT}`, ...style }}
      {...props}
    >
      {hasScreen ? (
        <div
          className={cn('absolute z-0 overflow-hidden bg-parchment', screenClassName)}
          style={SCREEN_BOX}
        >
          {videoSrc ? (
            <video
              className="block size-full object-cover"
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : src ? (
            // biome-ignore lint/performance/noImgElement: Magic UI screenshot slot; any URL, sized by the frame
            <img src={src} alt="" className="block size-full object-cover object-top" />
          ) : null}
          {children}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${PHONE_WIDTH} ${PHONE_HEIGHT}`}
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <g mask={mask}>
          <path
            d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
            className="fill-ash"
          />
          <path
            d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"
            className="fill-ash"
          />
          <path
            d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"
            className="fill-ash"
          />
          <path
            d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"
            className="fill-ash"
          />
          <path
            d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"
            className="fill-ash"
          />
          <path
            d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"
            className="fill-white"
          />
        </g>

        <path
          opacity="0.5"
          d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z"
          className="fill-ash"
        />

        <path
          d={`M${SCREEN_X} 75C${SCREEN_X} 44.2101 46.2101 ${SCREEN_Y} 77 ${SCREEN_Y}H355C385.79 ${SCREEN_Y} 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 ${SCREEN_X} 837.79 ${SCREEN_X} 807V75Z`}
          className="fill-parchment stroke-ash stroke-[0.5]"
          mask={mask}
        />

        <path
          d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"
          className="fill-ink"
        />
        <path
          d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z"
          className="fill-graphite"
        />

        <defs>
          <mask id={punch} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={PHONE_WIDTH} height={PHONE_HEIGHT} fill="white" />
            <rect
              x={SCREEN_X}
              y={SCREEN_Y}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              rx={SCREEN_RADIUS}
              ry={SCREEN_RADIUS}
              fill="black"
            />
          </mask>
        </defs>
      </svg>
    </div>
  );
}
