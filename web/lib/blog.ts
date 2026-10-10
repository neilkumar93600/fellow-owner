/**
 * Product notes for /blog: short, plain explanations of why the product works the way it does, grounded
 * in PRODUCT.md and the build docs, and told through the demo creator Mira Lane (every name and number
 * is made up). Static on purpose (docs/03-app-flow lists the blog as static or MDX); move to MDX files
 * the day a post needs more than paragraphs. Newest first.
 */

export interface BlogPost {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  summary: string;
  body: readonly string[];
}

export const POSTS: readonly BlogPost[] = [
  {
    slug: 'lisbon-on-60-a-day',
    title: 'How “Lisbon on $60 a day” went from a fan’s idea to Mira’s vlog',
    date: '2026-10-08',
    summary:
      'A walk through the loop Fellow Owners is built around, using the demo world: one idea, four fans with different skills, and a creator who gives it her spotlight.',
    body: [
      'This is the demo world, so every name and number is made up, but the loop is the real one. A fan in Mira’s Budget Travel community posts an idea: a Lisbon guide for people who have $60 a day, built from places that actually fit.',
      'Her post lists what it needs: a local guide who lives in the city, a photographer, a video editor and an itinerary planner. Other fans tap “Count me in” on the spot that suits them. Within a few days the four open spots are filled and the idea has a crew.',
      'Mira never has to dig for it. Her morning briefing lifts the idea as a “Strong match”, with one line saying why this one: it fits her love of local guides by people who live there, and the crew is already complete. She reads it in under a minute, taps Love, and gives it her spotlight.',
      'From there the page does the rest. The guide goes onto her public page under “Made by Mira’s fans”, every person who helped is credited by name, and she gets drafts for Instagram, TikTok and YouTube written in her voice to edit and post herself. A link that shows how it landed tells her how many people tapped through.',
      'Nothing here needed a DM, a spreadsheet or a lucky guess. A fan with a good idea was seen for it, three other fans found a reason to join in, and a creator spent a few minutes where it counted.',
    ],
  },
  {
    slug: 'why-every-idea-comes-with-a-reason',
    title: 'Why every idea arrives with a reason',
    date: '2026-10-01',
    summary:
      'A match rating on its own is a verdict. With one line of why beside it, it becomes advice a creator can check, and disagree with.',
    body: [
      'A creator with a million followers gets thousands of messages a week. Brand offers, local tips, fan edits and talented people sit in the same pile as spam and fan mail, so most of them go unread. Fellow Owners replaces that pile with a short structured message: a collab, a brand deal, an idea, a press request or a fan note, each with the fields that kind of message needs.',
      'Every message is then read once by an AI version of the creator. It filters spam, such as “buy 10K followers” or “free cruise giveaway, claim in 24h”, writes a one-line summary, checks the category and rates the match against what the creator wrote about herself: what she loves to spotlight, what she never will, and a few lines in her own voice.',
      'The rating never travels alone. Beside every “Strong match” or “Worth a look” sits one line that says why this one, for example: “Matches your love of beginner-friendly editing tips, and the crew already has a video editor.” A rating without a reason asks to be trusted. A rating with a reason can be checked in a few seconds, and that is the whole job: getting a creator through the few messages that matter in minutes, not hours.',
      'The creator can always disagree. A thumbs up or down on an AI pick is recorded, and during the pilot we are watching one number closely: how often creators agree with the picks. The target is at least seven in ten. If the reasons are wrong, that number will say so before anyone has to.',
      'There are two lines we will not cross. The AI never acts on its own: it does not reply, accept, archive or delete anything. And match ratings stay on the creator’s side. Fans are seen, never scored, so no fan ever sees a number next to their name or anyone else’s.',
    ],
  },
  {
    slug: 'built-for-the-in-app-browser',
    title: 'Built for the browser inside Instagram',
    date: '2026-09-24',
    summary:
      'Fans arrive from a bio link, on a phone, inside an app’s own browser. That one fact shaped the whole fan side of Fellow Owners.',
    body: [
      'Nobody types a creator’s bio link into a desktop browser. A fan taps it inside Instagram, TikTok or YouTube, and the page opens in that app’s built-in browser, usually on a phone, often on a slow connection, always one swipe away from going back to the feed.',
      'So the fan side is built for that window first. Every page holds its layout from 360 pixels wide with no sideways scrolling. Every button, chip and link is at least 44 pixels tall, so a thumb lands on it the first time. Joining, posting and sharing an idea work end to end without asking anyone to open a different browser.',
      'Joining takes one line. A fan writes a sentence about themselves, such as “solo traveler who loves street food”, and the AI suggests communities with the reason beside each one. They tick Solo Travelers and Food Finds, and they are in. We are aiming for at least 15 of every 100 bio-link visitors to join.',
      'The look follows the same constraint. The frosted glass is a soft white over a slow colour wash, and wherever an app’s browser cannot blur what sits behind it, it falls back to a nearly solid white, so text is never left see-through on a busy background. The theme is light for now, because people read these pages in daylight, arriving from bright white app screens.',
      'None of this shows when it works, and that is the point. A fan should go from tapping a link to being inside a community in under a minute, and never think about the browser they are in.',
    ],
  },
  {
    slug: 'communities-not-comments',
    title: 'Communities instead of a comment section',
    date: '2026-09-17',
    summary:
      'A comment section puts everyone in one long line. Communities let an audience sort itself by what it can do, and give the creator a digest instead of a firehose.',
    body: [
      'Under a popular vlog, a local guide with a spare weekend, a photographer with a great eye and a fan saying thanks all land in the same thread, sorted by likes. The skills in an audience are real, but there is no structure for those people to find each other, let alone make something together.',
      'In Fellow Owners, a creator’s space is split into communities by interest. Mira’s are Budget Travel, Solo Travelers, Travel Photography, Food Finds, Road Trips & Van Life and Slow Living. Fans join the ones that match them and post ideas, fan projects and questions there.',
      'Feedback is cheap and meaningful. Instead of a like, fans signal “I’d use this” or “Count me in”. Fan projects list the open spots they need, such as a local guide, a photographer or a translator, and fans can ask to fill one. Ideas that gather both kinds of signal rise, and a crew of two or more is a good sign that something is real.',
      'The creator does not read every thread. Each community gets a short AI digest, and the daily briefing lifts the few ideas and people worth a look, each with its reason. There are no unread badges and no endless channel list, because a space that demands constant attention soon stops getting any.',
      'When something is ready, the creator can give it her spotlight: drafts for Instagram, TikTok and YouTube in her own voice, a public page and a link that shows how it landed. That is the loop we are building for: followers, then communities, ideas, collabs and a thank-you that people can see.',
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}
