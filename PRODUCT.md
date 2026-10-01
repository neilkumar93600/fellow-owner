# Product

## Register

product

## Users

**Creators (primary, account owners).** People with 100K to 2M followers across YouTube, Instagram and X, working solo or with one manager. They open the dashboard on a laptop, between shoots and posts, and judge a tool by how fast it gets to the point. Their audience holds real skills (developers, designers, investors, musicians, athletes) that today sit buried in thousands of DMs a week. The job: see who is actually in their audience, find the few messages and projects that matter, and give the audience something to do besides like and comment.

**Fans (members).** People who follow a creator, have a skill or an idea, and have often tried DMing already. They arrive on a phone from a bio link, usually inside the Instagram, TikTok or YouTube in-app browser, and decide in seconds whether to join. The job: be seen, find peers with the same interests, and get their work in front of the creator through a credible path.

**Judges and pilot reviewers.** The Persist team and a real pilot creator. They need to understand the value in under three minutes, with no setup, by entering as a creator or a fan with one click.

## Product Purpose

Fellow Owners is one link in a creator's bio that moves an audience from Followers to Communities to Ideas to Collaboration to Action. Fans join interest-based communities, share ideas and projects, form teams, and pitch the creator through a structured form instead of DMs. An AI version of the creator, trained on the creator's own taste profile, filters spam, summarizes, and scores every item with a reason, so the creator can clear their top picks in minutes. The creator then puts their reach behind what the community builds, with drafts in their own voice, a public showcase page and a tracked short link.

Success looks like: a creator stays on top of their fanbase in under 10 minutes a day; at least 15% of bio-link visitors join; creators agree with at least 70% of AI picks; at least a quarter of projects form a team of two or more; and at least one community project is promoted each pilot week.

## Brand Personality

**Calm, warm, credible.**

- **Calm:** the product absorbs the noise so the creator does not have to. Screens lead with the few things worth attention, never with everything at once.
- **Warm:** fans are people with names, skills and ideas, not leads in a funnel. The fan side feels like being welcomed into a room, not filling in a form.
- **Credible:** every judgment is explained. The AI behaves like a sharp assistant who briefs the creator and shows its reasoning, not like a light show. Copy is plain, specific and short.

The emotional goal for creators is relief and control ("I know what matters today"). For fans it is belonging and a fair shot ("I was seen, and my idea has a path").

## Anti-references

- **Discord-style noise:** endless channels and unread badges the creator can never keep up with.
- **Paid DMs:** filtering fans by willingness to pay instead of by quality.
- **One-way link-in-bio pages and Google Forms:** a list of links or a form that goes nowhere, with no community and no ranking.
- **Low-contrast status text:** status shown as light orange or teal words on white that fail contrast.
- **Placeholder copy:** lorem ipsum, "Lorem dashboard", or generic filler in any shipped or demo screen.
- **The AI light show:** sparkles everywhere, glowing gradients, hype language, or AI acting on fan content without a creator click.

## Design Principles

1. **Minutes, not hours.** Every creator screen opens on what deserves a decision now: the briefing, the top picks, the highest-fit pitches. Full lists come second.
2. **Every judgment shows its reason.** A fit score never appears without its one-line why. AI output is data the creator reviews, never an action taken on their behalf, and the creator can always disagree.
3. **Built for the in-app browser.** Fans arrive inside Instagram, TikTok and YouTube webviews on a phone. Joining, posting and pitching must work there end to end, in under a minute, without switching browsers.
4. **Members are seen, never scored.** Fit scores and AI reasons exist only in the creator's dashboard. Fans never see each other's scores or emails, and the fan side always treats them as people.
5. **Earned familiarity.** Tabs, tables, side panels and toolbars behave the way creators already expect from the best tools. Trust comes from consistency, so delight is saved for moments, not pages.

## Accessibility & Inclusion

- **WCAG 2.2 AA** across every screen, including status pills, buttons and trend text.
- **Full keyboard support:** every interactive element is reachable, with a visible focus ring; Esc closes side panels and dialogs.
- **Screen readers:** icon-only buttons carry labels, and form errors are announced through `aria-live`.
- **Reduced motion:** with `prefers-reduced-motion`, number tickers show the final value and fades are turned off.
- **Charts are never the only source:** each chart has a one-line text summary and a "Show data" table.
- **Fan pages on small phones:** layouts work from 360px wide with touch targets of at least 44px.
- **Language:** English only in version one.
