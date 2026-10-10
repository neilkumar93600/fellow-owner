import type { Metadata } from 'next';
import { PostDetailContainer } from '@/components/post/post-detail';

export const metadata: Metadata = { title: 'Post' };

type Props = { params: Promise<{ handle: string; postId: string }> };

export default async function PostPage({ params }: Props) {
  const { handle, postId } = await params;
  return <PostDetailContainer handle={handle} postId={postId} />;
}
