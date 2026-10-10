// Voice-over script, timed to the video (seconds from the start of LaunchVideo). Read by
// scripts/make-voiceover.ts (fal.ai, ElevenLabs Eleven v4) and by the soundtrack, which plays each clip at `at`
// and ducks the music under it. Plain TS (no imports) so Node can run it directly.
export type VoLine = { id: string; at: number; text: string };

export const VO_LINES: VoLine[] = [
  { id: 'vo-01', at: 0.6, text: 'Seven hundred and forty thousand people follow Mira.' },
  { id: 'vo-02', at: 4.6, text: 'Until now, they were one number.' },
  { id: 'vo-03', at: 8.6, text: 'Every week, thousands of messages pour in.' },
  { id: 'vo-04', at: 12.3, text: 'The ones that matter get buried under spam.' },
  { id: 'vo-05', at: 16.8, text: 'Most never get read.' },
  { id: 'vo-06', at: 20.2, text: 'This is Fellow Owners.' },
  { id: 'vo-07', at: 22.7, text: 'Turn your followers into fellow owners.' },
  {
    id: 'vo-08',
    at: 26.0,
    text: 'One link in your bio. Fans join, share ideas, form teams, and you back the best one.',
  },
  {
    id: 'vo-09',
    at: 37.0,
    text: 'Fans tap your link, write one line about themselves, and the AI suggests where they fit. In under a minute, they’re in.',
  },
  {
    id: 'vo-10',
    at: 46.8,
    text: 'Your AI reads every pitch, filters the spam, and sorts the rest by fit, with a reason you can check.',
  },
  { id: 'vo-11', at: 55.0, text: 'Every morning, a short briefing: the few things worth your time.' },
  { id: 'vo-12', at: 60.0, text: 'Minutes, not hours.' },
  { id: 'vo-13', at: 62.7, text: 'When an idea takes off, a team forms around it.' },
  {
    id: 'vo-14',
    at: 66.4,
    text: 'Drafts in your voice. One click to publish. A showcase page, and a link that counts every click.',
  },
  { id: 'vo-15', at: 77.6, text: 'Fellow Owners. Turn followers into fellow owners. Start your space today.' },
];
