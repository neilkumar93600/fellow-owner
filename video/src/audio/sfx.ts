import {staticFile} from 'remotion';
import type {SfxName} from '../timeline';

export const SFX: Record<SfxName, string> = {
  whoosh: staticFile('sfx/whoosh.wav'),
  whip: staticFile('sfx/whip.wav'),
  switch: staticFile('sfx/switch.wav'),
  click: staticFile('sfx/mouse-click.wav'),
  ding: staticFile('sfx/ding.wav'),
  page: staticFile('sfx/page-turn.wav'),
  shutter: staticFile('sfx/shutter-modern.wav'),
};
