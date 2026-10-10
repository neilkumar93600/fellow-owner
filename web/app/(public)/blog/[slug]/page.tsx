import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DateBadge, PageFrame } from '@/components/marketing/page-frame';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { getPost, POSTS } from '@/lib/blog';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: 'Note not found' };
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.summary },
  };
}

export default async function Page({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  return (
    <PageFrame>
      <Link
        href={routes.marketing.blog()}
        className={cn(
          buttonVariants({ variant: 'secondary', surface: 'glass' }),
          'h-11 pr-5 pl-3 text-ink',
        )}
      >
        <ChevronLeft aria-hidden className="size-5" />
        All notes
      </Link>

      <article className="mt-8">
        <header className="flex flex-col items-start gap-3">
          <h1 className={cn(DISPLAY_H1, 'max-w-[24ch]')}>{post.title}</h1>
          <DateBadge iso={post.date} />
        </header>
        <p className="mt-6 max-w-[68ch] text-label text-ink">{post.summary}</p>
        {post.body.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="mt-4 max-w-[68ch] text-body text-ink">
            {paragraph}
          </p>
        ))}
      </article>
    </PageFrame>
  );
}
