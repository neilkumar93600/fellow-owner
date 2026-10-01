// Content for "For fans" (landing brief v2, part 6). Demo names come from demo-data.ts.

export interface FanStep {
  id: 'bio' | 'join' | 'feed' | 'team';
  title: string;
  line: string;
  /** The page the phone shows for this step, as the fan's in-app browser titles it. */
  pageTitle: string;
  path: string;
}

export const FAN_STEPS: readonly FanStep[] = [
  {
    id: 'bio',
    title: 'Bio link',
    line: 'Fans tap the link in your bio and land in your space, not on a list of links.',
    pageTitle: 'Mira Kapoor',
    path: '/mira',
  },
  {
    id: 'join',
    title: 'Join in 60 seconds',
    line: 'One line about themselves, and the AI suggests the communities that fit.',
    pageTitle: 'Join Mira’s space',
    path: '/mira/join',
  },
  {
    id: 'feed',
    title: 'Share an idea',
    line: 'Members post ideas, and others say they would use it or help build it.',
    pageTitle: 'Builders',
    path: '/mira/c/builders',
  },
  {
    id: 'team',
    title: 'Join a team',
    line: 'Projects list the roles they need. A fan picks one and joins the team.',
    pageTitle: 'Gym-log app for creators',
    path: '/mira/p/gym-log-app',
  },
] as const;

/** What Arjun types on the Join screen; the AI preselects Builders and Fitness Crew from it (03-app-flow J2). */
export const FAN_INTRO = 'Frontend dev who lifts';

/**
 * Scroll map for the pinned scene, in scene progress 0..1. Step i is active from STEP_STARTS[i] until the next
 * start; the last step also holds to the end so the scene can settle before it unpins.
 */
export const STEP_STARTS = [0, 0.22, 0.47, 0.72] as const;
