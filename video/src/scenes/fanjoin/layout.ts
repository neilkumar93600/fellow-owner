import {mix, ramp} from '../../motion';

// Phone geometry in frame px (device 418 x 872, centre (1340, 540)) and the page region inside it.
export const PHONE_AT = {x: 1131, y: 104} as const;
export const PAGE = {x: 14, y: 114, w: 390, h: 744} as const;
/** Centre of the page region in device coordinates: the flood and the shrink both pivot here. */
export const PAGE_CENTRE = {x: PAGE.x + PAGE.w / 2, y: PAGE.y + PAGE.h / 2} as const;

// Bio page (page px, before the scroll).
export const BIO_SCROLL = 120;
export const BIO_ROW_H = 84;
export const bioRowTop = (i: number) => 316 + i * 94;
export const BIO_PITCH_TOP = bioRowTop(4) - 2;

// Join page: one white card at (16, 16), 358 wide, 20 px padding. Everything inside is placed from these numbers.
export const CARD = {x: 16, y: 16, w: 358, pad: 20} as const;
export const TEXTAREA = {y: 130, h: 96} as const;
/** Page-px centre of the textarea: the camera zooms around it. */
export const TEXTAREA_CENTRE = {x: 16 + 358 / 2, y: 16 + 130 + 96 / 2} as const;
export const TILE_W = (CARD.w - 2 * CARD.pad - 10) / 2;
export const GRID_Y = 278;
export const ROW1_FULL = 176;
export const ROW2_H = 84;

/** Card height and row positions on a given scene frame: the card grows when the picker enters, row one when the AI suggests. */
export function joinLayout(frame: number) {
  const row1 = mix(ROW2_H, ROW1_FULL, ramp(frame, 190, 14));
  const row2Y = GRID_Y + row1 + 10;
  const buttonY = row2Y + ROW2_H + 16;
  const fullH = buttonY + 48 + CARD.pad;
  const baseH = TEXTAREA.y + TEXTAREA.h + CARD.pad;
  return {row1, row2Y, buttonY, fullH, height: mix(baseH, fullH, ramp(frame, 178, 14))};
}

/** Page-px centres of the tap targets on the Join page once everything has settled. */
export function joinTargets() {
  const l = joinLayout(300);
  const colX = [CARD.x + CARD.pad + TILE_W / 2, CARD.x + CARD.pad + TILE_W * 1.5 + 10];
  return {
    textarea: {x: CARD.x + CARD.w / 2, y: CARD.y + TEXTAREA.y + 30},
    builders: {x: colX[0], y: CARD.y + GRID_Y + l.row1 / 2},
    fitness: {x: colX[1], y: CARD.y + GRID_Y + l.row1 / 2},
    join: {x: CARD.x + CARD.w / 2, y: CARD.y + l.buttonY + 24},
  };
}
