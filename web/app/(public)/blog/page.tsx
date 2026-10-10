import type { Metadata } from 'next';
import Link from 'next/link';
import { longDate, PageFrame } from '@/components/marketing/page-frame';
import { POSTS } from '@/lib/blog';
import { DISPLAY_H1 } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Short product notes on why Fellow Owners works the way it does.',
  alternates: { canonical: '/blog' },
};

export default function Page() {
  return (
    <PageFrame>
      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>
          Product <em>notes</em>
        </h1>
        <p className="mt-3 text-body text-ink">
          Short notes on why Fellow Owners works the way it does, written as we build it.
        </p>
      </header>

      <ul className="mt-8 flex flex-col gap-5">
        {POSTS.map((post) => (
          <li
            key={post.slug}
            className="press group relative rounded-3xl border border-white/70 bg-white/60 p-6 hover:bg-white/80 has-focus-visible:bg-white/80"
          >
            <p className="text-small text-ink-soft">
              <time dateTime={post.date}>{longDate(post.date)}</time>
            </p>
            <h2 className="mt-2 text-h2 text-ink">
              <Link
                href={`/blog/${post.slug}`}
                className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-3xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 max-w-[68ch] text-body text-ink-soft">{post.summary}</p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
