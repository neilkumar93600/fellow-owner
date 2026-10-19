import { createCn } from 'cn/engine';
import tables from './cn-tables';

/**
 * The one class merge for the whole app (lib/utils re-exports it). It knows this project's Tailwind
 * tokens, so `text-small` merges as a font size, `rounded-card` as a radius and `shadow-overlay` as a
 * shadow. The tables are compiled ahead of time from THEME in cn-tables.gen.mjs, so no compiler ships to
 * the browser: edit THEME there and re-run it.
 */
export const cn = createCn(tables);
