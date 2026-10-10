import { measureText } from "@remotion/layout-utils";
import React from "react";
import { useCurrentFrame } from "remotion";
import { WhitePill } from "../../components";
import { FONT } from "../../fonts";
import { mix, ramp } from "../../motion";
import { C, EASE, R } from "../../theme";
import { irisClip, WIN } from "./loop";
import { STAGES, SWAP_LEN, swapAt, swapStart } from "./stages";

const RAIL = { centerY: 922, height: 76, pad: 10, fontSize: 26, padX: 24 };
const LINE = { centerY: 832, height: 72, fontSize: 34, padX: 28 };

const textWidth = (text: string, fontSize: number, fontWeight: number) =>
  measureText({ text, fontFamily: FONT, fontSize, fontWeight }).width;

/** Slide-up entrance shared by the rail and the line pill; both come in with the iris so the first line holds longer. */
const entrance = (frame: number, start: number, duration: number) => {
  const e = ramp(frame, start, duration);
  return { opacity: e, y: 40 * (1 - e) };
};

/** Pure White rail of the five stages; the active one sits on a lime pill that slides to the next stage with each line swap (stages.ts caption schedule). */
export const StageRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { opacity, y } = entrance(frame, 164, 16);
  // Slots are sized for the 600 weight so the row never reflows when a label becomes active.
  const widths = STAGES.map(
    (s) => textWidth(s.label, RAIL.fontSize, 600) + 2 * RAIL.padX,
  );
  const lefts = widths.map((_, i) =>
    widths.slice(0, i).reduce((a, b) => a + b, 0),
  );
  const i = swapAt(frame);
  const t = i === 0 ? 1 : ramp(frame, swapStart(i), SWAP_LEN, EASE.quart);
  const prev = Math.max(0, i - 1);
  const active = (j: number) => (j === i ? t : j === prev ? 1 - t : 0);
  return (
    <WhitePill
      height={RAIL.height}
      style={{
        position: "absolute",
        left: "50%",
        top: RAIL.centerY - RAIL.height / 2,
        translate: `-50% ${y}px`,
        padding: RAIL.pad,
        gap: 0,
        opacity,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          height: RAIL.height - 2 * RAIL.pad,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: mix(lefts[prev], lefts[i], t),
            width: mix(widths[prev], widths[i], t),
            height: "100%",
            borderRadius: R.pill,
            backgroundColor: C.lime,
          }}
        />
        {STAGES.map((s, j) => (
          <div
            key={s.label}
            style={{
              position: "relative",
              width: widths[j],
              height: "100%",
              fontSize: RAIL.fontSize,
              lineHeight: "32px",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                fontWeight: 500,
                color: C.inkSoft,
                opacity: 1 - active(j),
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                fontWeight: 600,
                color: C.ink,
                opacity: active(j),
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </WhitePill>
  );
};

/** The stage line in a Pure White pill above the rail; the pill morphs its width while the text swaps through its mask. */
export const StageLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { opacity, y } = entrance(frame, 150, 12);
  const i = swapAt(frame);
  const prev = Math.max(0, i - 1);
  // One swap progress moves the pill width and both lines, so the leaving line stays one pill height above the arriving one.
  const t = i === 0 ? 1 : ramp(frame, swapStart(i), SWAP_LEN, EASE.quart);
  const width = (j: number) =>
    textWidth(STAGES[j].line, LINE.fontSize, 500) + 2 * LINE.padX;
  const text = (j: number, offset: number) => (
    <span
      key={j}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        translate: `0 ${offset}px`,
        fontSize: LINE.fontSize,
        lineHeight: "44px",
        fontWeight: 500,
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      {STAGES[j].line}
    </span>
  );
  // The pill rises inside the iris, so it is revealed with the window instead of sitting on the bare shell before it.
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        top: WIN.y,
        width: WIN.w,
        height: WIN.h,
        clipPath: irisClip(frame),
      }}
    >
      <WhitePill
        height={LINE.height}
        style={{
          position: "absolute",
          left: "50%",
          top: LINE.centerY - LINE.height / 2 - WIN.y,
          translate: `-50% ${y}px`,
          width: mix(width(prev), width(i), t),
          padding: 0,
          overflow: "hidden",
          opacity,
        }}
      >
        {i > 0 && t < 1 ? text(prev, -LINE.height * t) : null}
        {text(i, LINE.height * (1 - t))}
      </WhitePill>
    </div>
  );
};
