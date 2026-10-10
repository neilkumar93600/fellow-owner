export interface SimilarSectionProps {
  postId: string;
  /** `member` reads /api/posts/:id/similar, `studio` reads the owner route. */
  scope: 'member' | 'studio';
}

/** Similar ideas and people who could help (F17). Filled in by F06. */
export function SimilarSection(_props: SimilarSectionProps): null {
  return null;
}
