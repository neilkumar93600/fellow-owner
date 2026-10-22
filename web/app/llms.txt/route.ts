import { faqs } from '@/components/landing/example-data';
import { POSTS } from '@/lib/blog';
import { SITE } from '@/lib/constants';
import { appUrl } from '@/lib/env';
import { LEGAL_PAGES } from '@/lib/legal';
import { routes } from '@/lib/routes';

// /llms.txt (llmstxt.org): a plain markdown map of the site for AI assistants (ChatGPT, Claude, Gemini,
// Perplexity) that read it when someone asks about Fellow Owners. Built from the same data as the pages
// and the sitemap, so it cannot drift; static, rebuilt on deploy.
export const dynamic = 'force-static';

const link = (label: string, path: string, note?: string) =>
  `- [${label}](${appUrl(path)})${note ? `: ${note}` : ''}`;

export function GET() {
  const body = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.tagline} ${SITE.description}`,
    '',
    "Fellow Owners is one link in a creator's bio. Fans join interest-based communities, share ideas and " +
      'projects, form teams, and pitch the creator through a structured form instead of DMs. The ' +
      "creator's AI twin, trained on their own taste, reads like them and never speaks for them: it " +
      'filters spam, summarizes, and ranks every item with a one-line reason, so the creator clears the ' +
      'few that matter in minutes and puts their reach behind what the community builds. Built for ' +
      'creators on YouTube, Instagram, TikTok and X, and for fans arriving on a phone inside those apps.',
    '',
    '## Pages',
    link('Home', routes.home(), 'what Fellow Owners does for creators and fans'),
    link('About', routes.marketing.about()),
    link('Pricing', routes.marketing.pricing()),
    link('Contact', routes.marketing.contact()),
    link('Blog', routes.marketing.blog()),
    '',
    '## FAQ',
    ...faqs
      .filter((item) => !('pageOnly' in item))
      .flatMap((item) => [`### ${item.q}`, item.a, '']),
    '## Blog',
    ...POSTS.map((post) => link(post.title, `/blog/${post.slug}`, post.summary)),
    '',
    '## Legal',
    ...LEGAL_PAGES.map((page) => link(page.label, page.href)),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
