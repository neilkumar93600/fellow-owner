import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AvatarStack, Card } from "../../components";
import { fan, LOOP_CARD_FACE, showcase } from "../../data";
import { clamp, ramp } from "../../motion";
import { C, EASE, TNUM } from "../../theme";
import { LAST_SRC, LOOP_START, sourceFrame } from "./stages";

export const WIN = { x: 88, y: 88, w: 1744, h: 904, r: 32 };
const SRC = { w: 1600, h: 900 };
// object-fit cover, done by hand so the card can share the same box and track the footage exactly.
const COVER = Math.max(WIN.w / SRC.w, WIN.h / SRC.h);
const IMG = {
  x: (WIN.w - SRC.w * COVER) / 2,
  y: (WIN.h - SRC.h * COVER) / 2,
  w: SRC.w * COVER,
  h: SRC.h * COVER,
};
const FACE = {
  left: IMG.x + LOOP_CARD_FACE.left * IMG.w,
  top: IMG.y + LOOP_CARD_FACE.top * IMG.h,
  width: (LOOP_CARD_FACE.right - LOOP_CARD_FACE.left) * IMG.w,
  height: (LOOP_CARD_FACE.bottom - LOOP_CARD_FACE.top) * IMG.h,
};
const FACE_INSET = 24;
const CARD_AT = 396;
const PUSH_END = 1.08;
// The stage line pill (centre y 832, height 72) crosses the lower part of the face. Un-push its top edge (push origin 50% 45%,
// about 1.08 while the card shows) to window space, so the content can centre in the part of the card face above the pill.
const PILL_TOP = 832 - 36 - WIN.y;
const PUSH_ORIGIN_Y = WIN.h * 0.45;
const FREE_BOTTOM = PUSH_ORIGIN_Y + (PILL_TOP - PUSH_ORIGIN_Y) / PUSH_END;
const CARD_BOTTOM = FACE.top + FACE.height - FACE_INSET;
const UNDER_PILL = Math.max(0, CARD_BOTTOM - FREE_BOTTOM);
const TEAM_NAMES = [fan.name, "Maya Chen", "Sana Iqbal", "Kofi Mensah"];
const featured = showcase[0];

const frameSrc = (i: number) =>
  staticFile(`loop/frame_${String(i + 1).padStart(4, "0")}.webp`);

/** "Featured by Mira" on the lifted card's face: Apricot Cream card inset inside the face, scaling and fading in. */
const FeaturedCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CARD_AT) return null;
  const t = ramp(frame, CARD_AT, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: FACE.left + FACE_INSET,
        top: FACE.top + FACE_INSET,
        width: FACE.width - 2 * FACE_INSET,
        height: FACE.height - 2 * FACE_INSET,
        opacity: t,
        scale: `${0.9 + 0.1 * t}`,
      }}
    >
      <Card
        tint="peach"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 14,
          paddingBottom: 24 + UNDER_PILL,
        }}
      >
        <div
          style={{
            fontSize: 22,
            lineHeight: "28px",
            fontWeight: 500,
            color: C.inkSoft,
          }}
        >
          Featured by Mira
        </div>
        {/* Capped so the title breaks into two lines as the brief draws it. */}
        <div
          style={{
            fontSize: 30,
            lineHeight: "36px",
            fontWeight: 600,
            color: C.ink,
            maxWidth: 300,
          }}
        >
          {featured.title}
        </div>
        <div
          style={{
            fontSize: 22,
            lineHeight: "28px",
            fontWeight: 500,
            color: C.inkSoft,
          }}
        >
          {featured.community} · Team of {featured.team}
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <AvatarStack names={TEAM_NAMES} size={44} />
          <span
            style={{
              fontSize: 22,
              lineHeight: "28px",
              fontWeight: 600,
              color: C.inkSoft,
              ...TNUM,
            }}
          >
            {featured.signals} signals
          </span>
        </div>
      </Card>
    </div>
  );
};

/** Iris (150 to 180) as a clip-path for a box laid over the window; the stage line pill rises inside it too. */
export const irisClip = (frame: number) =>
  `circle(${interpolate(frame, [150, 180], [0, 120], { ...clamp, easing: EASE.inOut })}% at 50% 50%)`;

/** The rounded loop window: iris open (150 to 180), clay footage at the stage speeds with neighbour crossfade, slow push. */
export const LoopWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [LOOP_START, 440], [1, 1.08], {
    ...clamp,
    easing: EASE.inOut,
  });
  const src = sourceFrame(frame);
  const lo = Math.floor(src);
  const hi = Math.min(LAST_SRC, lo + 1);
  const blend = src - lo;
  const img: React.CSSProperties = {
    position: "absolute",
    left: IMG.x,
    top: IMG.y,
    width: IMG.w,
    height: IMG.h,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        top: WIN.y,
        width: WIN.w,
        height: WIN.h,
        borderRadius: WIN.r,
        overflow: "hidden",
        clipPath: irisClip(frame),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: `${push}`,
          transformOrigin: "50% 45%",
        }}
      >
        <Img src={frameSrc(lo)} style={img} />
        {blend > 0 && hi !== lo ? (
          <Img src={frameSrc(hi)} style={{ ...img, opacity: blend }} />
        ) : null}
        <FeaturedCard />
      </div>
    </div>
  );
};
