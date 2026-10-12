import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DateBadge, PageFrame } from '@/components/marketing/page-frame';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { cn } from '@/components/ui/cn';
import { getPost, POSTS } from '@/lib/blog';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return pageMetadata({
    title: post.title,
    description: post.summary,
    path: `/blog/${post.slug}`,
    publishedTime: post.date,
  });
}

export default async function Page({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  return (
    <PageFrame>
      <Breadcrumbs
        crumbs={[
          { name: 'Home', path: routes.home() },
          { name: 'Blog', path: routes.marketing.blog() },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />

      <article className="mt-8">
        <header className="flex flex-col items-start gap-3">
          <h1 className={cn(DISPLAY_H1, 'max-w-[24ch]')}>{post.title}</h1>
          <DateBadge iso={post.date} />
        </header>
        <p className="mt-6 max-w-[68ch] font-sans text-label text-ink">{post.summary}</p>
        {post.body.map((paragraph) => (
          <p
            key={paragraph.slice(0, 32)}
            className="mt-4 max-w-[68ch] font-sans text-body text-ink"
          >
            {paragraph}
          </p>
        ))}
      </article>
    </PageFrame>
  );
}
